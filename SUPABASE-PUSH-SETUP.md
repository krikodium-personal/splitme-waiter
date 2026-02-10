# Configurar Push Notifications con Supabase Edge Functions

## Arquitectura

1. **Edge Function: `push-subscribe`** - Recibe suscripciones del frontend y las guarda
2. **Edge Function: `send-push-notification`** - Envía notificaciones push usando web-push
3. **Database Trigger** - Escucha nuevos batches y llama a la función de envío

## Paso 1: Crear tabla para guardar suscripciones

En Supabase SQL Editor, ejecuta:

```sql
-- Tabla para guardar suscripciones push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  waiter_id UUID REFERENCES waiters(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas por waiter_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_waiter_id 
ON push_subscriptions(waiter_id);

-- Índice para búsquedas por endpoint
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint 
ON push_subscriptions(endpoint);
```

## Paso 2: Instalar Supabase CLI (si no lo tienes)

```bash
npm install -g supabase
```

## Paso 3: Inicializar proyecto Supabase (si no está inicializado)

```bash
cd /ruta/a/tu/proyecto-supabase
supabase init
supabase link --project-ref tu-project-ref
```

## Paso 4: Crear Edge Function para recibir suscripciones

Crea el archivo: `supabase/functions/push-subscribe/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { subscription, waiter_id } = await req.json()

    if (!subscription || !waiter_id) {
      return new Response(
        JSON.stringify({ error: 'subscription and waiter_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear cliente de Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const endpoint = subscription.endpoint

    // Verificar si ya existe una suscripción con este endpoint
    const { data: existing } = await supabaseClient
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .single()

    if (existing) {
      // Actualizar suscripción existente
      const { error } = await supabaseClient
        .from('push_subscriptions')
        .update({
          subscription,
          waiter_id,
          updated_at: new Date().toISOString(),
        })
        .eq('endpoint', endpoint)

      if (error) throw error

      return new Response(
        JSON.stringify({ message: 'Subscription updated', id: existing.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Crear nueva suscripción
      const { data, error } = await supabaseClient
        .from('push_subscriptions')
        .insert({
          waiter_id,
          subscription,
          endpoint,
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ message: 'Subscription saved', id: data.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

## Paso 5: Crear Edge Function para enviar notificaciones

Crea el archivo: `supabase/functions/send-push-notification/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Importar web-push para Deno
// Nota: Necesitarás usar una implementación compatible con Deno o hacer fetch directo a un servicio

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { waiter_id, title, body, url } = await req.json()

    if (!waiter_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'waiter_id, title, and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener todas las suscripciones del mesero
    const { data: subscriptions, error } = await supabaseClient
      .from('push_subscriptions')
      .select('subscription')
      .eq('waiter_id', waiter_id)

    if (error) throw error

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found for this waiter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enviar notificación a cada suscripción
    // NOTA: Para usar web-push en Deno, necesitarás usar una alternativa
    // como hacer fetch a un servicio externo o usar una librería compatible
    
    // Por ahora, retornamos éxito (implementar envío real después)
    return new Response(
      JSON.stringify({ 
        message: 'Notifications queued', 
        count: subscriptions.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

## Paso 6: Crear Database Function para enviar push cuando hay nuevo batch

En Supabase SQL Editor:

```sql
-- Función que se ejecutará cuando se cree un nuevo batch
CREATE OR REPLACE FUNCTION notify_waiter_new_batch()
RETURNS TRIGGER AS $$
DECLARE
  waiter_id_val UUID;
  table_number_val INT;
BEGIN
  -- Obtener waiter_id y table_number de la orden
  SELECT o.table_id INTO waiter_id_val
  FROM orders o
  WHERE o.id = NEW.order_id;
  
  -- Obtener waiter_id desde la tabla
  SELECT t.waiter_id INTO waiter_id_val
  FROM tables t
  WHERE t.id = (SELECT table_id FROM orders WHERE id = NEW.order_id);
  
  -- Obtener número de mesa
  SELECT t.table_number INTO table_number_val
  FROM tables t
  WHERE t.id = (SELECT table_id FROM orders WHERE id = NEW.order_id);
  
  -- Llamar a la Edge Function para enviar push
  -- Nota: Esto requiere usar pg_net o http extension
  -- Por ahora, solo registramos el evento
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se ejecuta cuando se inserta un nuevo batch
CREATE TRIGGER on_new_batch_created
AFTER INSERT ON order_batches
FOR EACH ROW
EXECUTE FUNCTION notify_waiter_new_batch();
```

## Paso 7: Desplegar Edge Functions

```bash
# Desplegar función de suscripción
supabase functions deploy push-subscribe

# Desplegar función de envío
supabase functions deploy send-push-notification
```

## Paso 8: Configurar Secrets en Supabase

En Supabase Dashboard → Edge Functions → Secrets:

1. Agrega `VAPID_PUBLIC_KEY` (la misma que usaste en Vercel)
2. Agrega `VAPID_PRIVATE_KEY` (la clave privada, secreta)

## Paso 9: Configurar URL en Vercel

En Vercel Environment Variables, agrega:

- **Key:** `VITE_PUSH_SUBSCRIPTION_URL`
- **Value:** `https://tu-project-ref.supabase.co/functions/v1/push-subscribe`
- **Environment:** Todas

## Alternativa más simple: Usar pg_net para llamar Edge Function

Si prefieres una solución más directa, puedes usar la extensión `pg_net` de Supabase para llamar a la Edge Function directamente desde el trigger:

```sql
-- Habilitar extensión pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Función mejorada que llama a la Edge Function
CREATE OR REPLACE FUNCTION notify_waiter_new_batch()
RETURNS TRIGGER AS $$
DECLARE
  waiter_id_val UUID;
  table_number_val INT;
  function_url TEXT;
BEGIN
  -- Obtener waiter_id desde la tabla
  SELECT t.waiter_id, t.table_number 
  INTO waiter_id_val, table_number_val
  FROM tables t
  WHERE t.id = (SELECT table_id FROM orders WHERE id = NEW.order_id);
  
  IF waiter_id_val IS NOT NULL THEN
    -- Llamar a la Edge Function usando pg_net
    SELECT net.http_post(
      url := 'https://tu-project-ref.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'waiter_id', waiter_id_val,
        'title', 'Nuevo envío recibido',
        'body', 'Mesa ' || table_number_val || ' tiene un nuevo envío',
        'url', '/'
      )
    ) INTO function_url;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Nota importante sobre web-push en Deno

Deno no tiene soporte directo para `web-push`. Opciones:

1. **Usar un servicio externo** (OneSignal, Firebase Cloud Messaging)
2. **Crear un microservicio Node.js** solo para enviar push
3. **Usar Deno Deploy con una librería compatible**

¿Quieres que te ayude a implementar alguna de estas opciones?
