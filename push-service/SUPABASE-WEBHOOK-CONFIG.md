# Configurar Webhook en Supabase para que lleguen los Push

En **Vercel el servicio es serverless**: no hay un proceso siempre encendido, así que el listener de Realtime **no puede estar activo**. Por eso los push no llegaban.

La solución es usar **Supabase Database Webhooks**: Supabase llama a tu push-service cada vez que se inserta un batch.

---

## Paso 1: Ir a Database Webhooks en Supabase

1. Entra a [Supabase Dashboard](https://app.supabase.com).
2. Selecciona tu proyecto.
3. En el menú izquierdo ve a **Database** → **Webhooks**.
   - O bien: **Integrations** (o **Project Settings**) → **Webhooks** → [Database Webhooks](https://supabase.com/dashboard/project/_/integrations/webhooks/overview) (reemplaza `_` por el ID de tu proyecto si hace falta).

---

## Paso 2: Crear el webhook

1. Click en **"Create a new webhook"** o **"Add webhook"**.
2. Completa:

| Campo | Valor |
|-------|--------|
| **Name** | `new-batch-push` (o el que quieras) |
| **Table** | `order_batches` |
| **Events** | Marca **Insert** |
| **Type** | **HTTP Request** (o "Supabase Function" si solo ves esa; en ese caso usa Edge Function que haga POST a la URL abajo) |
| **URL** | `https://splitme-waiter-push.vercel.app/api/webhook/new-batch` |
| **HTTP Method** | `POST` |
| **HTTP Headers** | Opcional. Si pides un secret: `Authorization: Bearer TU_SECRET` |

3. Guarda el webhook.

---

## Paso 3: Formato del payload

Supabase envía exactamente este formato (según la documentación oficial):

```json
{
  "type": "INSERT",
  "table": "order_batches",
  "schema": "public",
  "record": {
    "id": "uuid-del-batch",
    "order_id": "uuid-de-la-orden",
    ...
  },
  "old_record": null
}
```

El push-service lee `payload.record` y usa `record.order_id` para buscar la mesa y el mesero y enviar el push.

---

## Paso 4: Comprobar que el endpoint existe

Antes de probar con un batch real:

1. Despliega los últimos cambios del push-service en Vercel (incluye `/api/webhook/new-batch`).
2. Opcional: prueba con curl:
   ```bash
   curl -X POST https://splitme-waiter-push.vercel.app/api/webhook/new-batch \
     -H "Content-Type: application/json" \
     -d '{"record":{"order_id":"UN_ORDER_ID_REAL_DE_TU_BASE"}}'
   ```
   (usa un `order_id` real; si la mesa no tiene mesero, no enviará push pero el endpoint debería responder 202.)

---

## Paso 5: Probar con un batch real

1. Crea un nuevo batch desde la app admin (o como lo hagas normalmente).
2. Revisa en Vercel → **splitme-waiter-push** → **Runtime Logs**: deberías ver la petición a `/api/webhook/new-batch` y el log "✅ Push enviado".
3. En el iPhone del mesero debería llegar la notificación push.

---

## Si en tu Supabase no aparece "Database Webhooks"

Algunos planes o versiones lo tienen en otro sitio:

- **Database** → **Replication** → pestaña **Webhooks**.
- O usa **Supabase Edge Functions** + **Database Webhooks** (si tu proyecto usa Edge Functions): creas una función que reciba el webhook y haga `fetch` a `https://splitme-waiter-push.vercel.app/api/webhook/new-batch` con el payload.

Si me dices exactamente qué opciones ves en **Database** (menú izquierdo), te indico el clic exacto.
