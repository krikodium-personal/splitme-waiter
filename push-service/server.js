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

/** Envía notificación push a todas las suscripciones de un mesero. Retorna { total, successful, failed }. */
async function sendPushToWaiter(waiter_id, title, body, url = '/', data = {}) {
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('waiter_id', waiter_id);

  if (error) {
    console.error('[sendPushToWaiter] error Supabase:', error);
    throw error;
  }
  if (!subscriptions || subscriptions.length === 0) {
    console.log('[sendPushToWaiter] waiter_id=', waiter_id, 'sin suscripciones en push_subscriptions');
    return { total: 0, successful: 0, failed: 0 };
  }

  console.log('[sendPushToWaiter] waiter_id=', waiter_id, 'suscripciones=', subscriptions.length);

  const payload = JSON.stringify({ title, body, url, ...data });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        return { success: true, endpoint: sub.subscription?.endpoint };
      } catch (err) {
        console.error('[sendPushToWaiter] fallo envío:', err.statusCode, err.message);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.subscription?.endpoint);
        }
        return { success: false, endpoint: sub.subscription?.endpoint, error: err.message };
      }
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const summary = { total: subscriptions.length, successful, failed: results.length - successful };
  console.log('[sendPushToWaiter] resultado:', summary);
  return summary;
}

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

    const result = await sendPushToWaiter(waiter_id, title, body, url || '/', data || {});

    return res.json({
      message: 'Notifications sent',
      ...result
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

/**
 * Webhook para Supabase Database Webhooks.
 * En Vercel hay que hacer TODO el trabajo antes de responder;
 * si respondemos 202 antes, la función puede terminar y el push no se envía.
 */
app.post('/api/webhook/new-batch', async (req, res) => {
  try {
    const payload = req.body;
    const record = payload.record || payload.new || payload;
    const orderId = record?.order_id;

    console.log('[webhook] new-batch received', { orderId, batchId: record?.id });

    if (!orderId) {
      console.error('[webhook] falta order_id', payload);
      return res.status(400).json({ error: 'missing order_id' });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('table_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order?.table_id) {
      console.error('[webhook] error orden', orderError);
      return res.status(400).json({ error: 'order not found', details: orderError?.message });
    }

    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('waiter_id, table_number')
      .eq('id', order.table_id)
      .single();

    if (tableError || !table?.waiter_id) {
      console.error('[webhook] error mesa/mesero', tableError);
      return res.status(400).json({ error: 'table/waiter not found', details: tableError?.message });
    }

    console.log('[webhook] enviando push a waiter_id=', table.waiter_id, 'mesa', table.table_number);

    const result = await sendPushToWaiter(
      table.waiter_id,
      'Nuevo envío recibido',
      `Mesa ${table.table_number} tiene un nuevo envío`,
      '/',
      { batchId: record.id, orderId, tableNumber: table.table_number }
    );

    console.log('[webhook] resultado sendPushToWaiter:', result);

    return res.status(200).json({ ok: true, push: result });
  } catch (error) {
    console.error('[webhook] error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Push Service corriendo en puerto ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/health`);
  console.log(`🔑 VAPID: ${VAPID_PUBLIC_KEY?.substring(0, 20)}...`);
});
