import express from 'express';
import cors from 'cors';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configurar VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:notifications@splitme.com';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('❌ Error: VAPID keys no configuradas');
  console.error('Configura VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en las variables de entorno');
  process.exit(1);
}

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Supabase credentials no configuradas');
  console.error('Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Endpoint para recibir suscripciones (opcional, si prefieres guardarlas aquí)
app.post('/api/push-subscribe', async (req, res) => {
  try {
    const { subscription, waiter_id } = req.body;

    if (!subscription || !waiter_id) {
      return res.status(400).json({ 
        error: 'subscription and waiter_id are required' 
      });
    }

    const endpoint = subscription.endpoint;

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .single();

    if (existing) {
      // Actualizar
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          subscription,
          waiter_id,
          updated_at: new Date().toISOString(),
        })
        .eq('endpoint', endpoint);

      if (error) throw error;

      return res.json({ 
        message: 'Subscription updated', 
        id: existing.id 
      });
    } else {
      // Crear nueva
      const { data, error } = await supabase
        .from('push_subscriptions')
        .insert({
          waiter_id,
          subscription,
          endpoint,
        })
        .select()
        .single();

      if (error) throw error;

      return res.json({ 
        message: 'Subscription saved', 
        id: data.id 
      });
    }
  } catch (error) {
    console.error('Error saving subscription:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
});

// Endpoint para enviar notificación push
app.post('/api/send-push', async (req, res) => {
  try {
    const { waiter_id, title, body, url, data } = req.body;

    if (!waiter_id || !title || !body) {
      return res.status(400).json({ 
        error: 'waiter_id, title, and body are required' 
      });
    }

    // Obtener todas las suscripciones del mesero
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('waiter_id', waiter_id);

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return res.json({ 
        message: 'No subscriptions found for this waiter',
        count: 0
      });
    }

    // Preparar payload de notificación
    const payload = JSON.stringify({
      title,
      body,
      url: url || '/',
      ...data
    });

    // Enviar a cada suscripción
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          return { success: true, endpoint: sub.subscription.endpoint };
        } catch (error) {
          // Si la suscripción es inválida, eliminarla
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`Removing invalid subscription: ${sub.subscription.endpoint}`);
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.subscription.endpoint);
          }
          return { 
            success: false, 
            endpoint: sub.subscription.endpoint, 
            error: error.message 
          };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return res.json({
      message: 'Notifications sent',
      total: subscriptions.length,
      successful,
      failed
    });
  } catch (error) {
    console.error('Error sending push:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
});

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    vapidConfigured: !!VAPID_PUBLIC_KEY
  });
});

// Escuchar eventos de Supabase Realtime
async function setupRealtimeListener() {
  console.log('🔔 Configurando listener de Supabase Realtime...');

  const channel = supabase
    .channel('new-batches-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'order_batches',
      },
      async (payload) => {
        console.log('📦 Nuevo batch detectado:', payload.new.id);

        try {
          // Obtener información de la orden y mesa
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('table_id')
            .eq('id', payload.new.order_id)
            .single();

          if (orderError) {
            console.error('Error obteniendo orden:', orderError);
            return;
          }

          // Obtener información de la mesa y mesero
          const { data: table, error: tableError } = await supabase
            .from('tables')
            .select('waiter_id, table_number')
            .eq('id', order.table_id)
            .single();

          if (tableError || !table.waiter_id) {
            console.error('Error obteniendo mesa o mesero:', tableError);
            return;
          }

          // Enviar notificación push
          const response = await fetch(`${process.env.SERVICE_URL || 'http://localhost:3000'}/api/send-push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              waiter_id: table.waiter_id,
              title: 'Nuevo envío recibido',
              body: `Mesa ${table.table_number} tiene un nuevo envío`,
              url: '/',
              data: {
                batchId: payload.new.id,
                orderId: payload.new.order_id,
                tableNumber: table.table_number
              }
            })
          });

          const result = await response.json();
          console.log('✅ Notificación enviada:', result);
        } catch (error) {
          console.error('❌ Error procesando nuevo batch:', error);
        }
      }
    )
    .subscribe();

  console.log('✅ Listener configurado correctamente');
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Push Service corriendo en puerto ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 VAPID Public Key: ${VAPID_PUBLIC_KEY.substring(0, 20)}...`);
  
  // Configurar listener de Supabase
  setupRealtimeListener();
});
