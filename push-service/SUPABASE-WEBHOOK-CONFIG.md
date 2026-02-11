# Configuración de Webhook en Supabase para Push Notifications

## Cambio importante: Webhook ahora se dispara en UPDATE (no INSERT)

El webhook ahora se dispara cuando un batch **cambia a estado "ENVIADO"** (UPDATE), no cuando se crea (INSERT).

## Configuración en Supabase

1. Ve a **Supabase Dashboard** → Tu proyecto → **Database** → **Webhooks**

2. Si ya tienes un webhook configurado para `order_batches` con evento INSERT, **elimínalo o desactívalo**.

3. Crea un **nuevo webhook** con estas configuraciones:

   - **Name**: `batch-enviado-push-notification` (o el nombre que prefieras)
   - **Table**: `order_batches`
   - **Events**: Selecciona **UPDATE** (no INSERT)
   - **Type**: HTTP Request
   - **Method**: POST
   - **URL**: `https://splitme-waiter-push.vercel.app/api/webhook/batch-enviado`
   - **HTTP Headers**: (opcional, pero recomendado)
     ```
     Content-Type: application/json
     ```
   - **HTTP Request Body**: (opcional, Supabase lo envía automáticamente)

4. **Guardar** el webhook.

## Formato del payload

Cuando un batch cambia a estado "ENVIADO", Supabase enviará un payload como este:

```json
{
  "type": "UPDATE",
  "table": "order_batches",
  "record": {
    "id": "batch-uuid",
    "order_id": "order-uuid",
    "status": "ENVIADO",
    "created_at": "2026-02-10T15:30:00Z",
    ...
  },
  "old_record": {
    "id": "batch-uuid",
    "order_id": "order-uuid",
    "status": "CREADO",
    ...
  }
}
```

El servicio push verifica que:
- `record.status === 'ENVIADO'`
- `old_record.status !== 'ENVIADO'` (para evitar notificar si ya estaba en ENVIADO)

## Verificación

Para verificar que funciona:

1. Crea un batch en estado "CREADO" → **No debe** enviar notificación push.
2. Cambia el batch a estado "ENVIADO" → **Debe** enviar notificación push al mesero asignado a la mesa.
3. Revisa los logs en Vercel del proyecto `splitme-waiter-push` para ver los mensajes `[webhook] batch-enviado received`.

## Notas

- El webhook solo notifica cuando el estado cambia **a** "ENVIADO", no cuando ya está en "ENVIADO".
- Si un batch se crea directamente en estado "ENVIADO" (sin pasar por "CREADO"), también se notificará.
- El webhook incluye `orderId`, `batchId` y `tableNumber` en los datos de la notificación push para que la app pueda navegar directamente a la mesa.

---

## Webhook para solicitudes de comensales (waiter_notifications)

Para que el mesero reciba push cuando un comensal envía una solicitud (sal, cuenta, etc.) **incluso con la app en segundo plano**:

1. Ve a **Supabase Dashboard** → **Database** → **Webhooks**
2. Crea un nuevo webhook:
   - **Name**: `waiter-notification-push`
   - **Table**: `waiter_notifications`
   - **Events**: **INSERT**
   - **Type**: HTTP Request
   - **Method**: POST
   - **URL**: `https://splitme-waiter-push.vercel.app/api/webhook/waiter-notification`
3. Guardar.
