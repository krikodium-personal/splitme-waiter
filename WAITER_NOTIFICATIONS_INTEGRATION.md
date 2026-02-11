# Integración de Notificaciones para splitme-waiter

Este documento explica cómo integrar la recepción de notificaciones de solicitudes de comensales en la app `splitme-waiter`.

## Paso 1: Habilitar Realtime en Supabase (OBLIGATORIO para tiempo real)

**Sin este paso, las notificaciones solo aparecen al refrescar.** Ejecuta el siguiente script en el SQL Editor de Supabase:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE waiter_notifications;
```

O desde el Dashboard: **Database** → **Publications** → `supabase_realtime` → activa la tabla `waiter_notifications`.

## Estructura de la Tabla `waiter_notifications`

```sql
waiter_notifications:
  - id: UUID (PK)
  - waiter_id: UUID (FK → waiters.id)
  - order_id: UUID (FK → orders.id)
  - table_number: INTEGER
  - message: TEXT
  - status: VARCHAR ('pending', 'read', 'completed')
  - created_at: TIMESTAMP
  - updated_at: TIMESTAMP
```

## Archivos implementados

- `src/hooks/useWaiterNotifications.ts` – Hook que suscribe a notificaciones vía Realtime
- `src/components/WaiterNotificationsPanel.tsx` – Panel de UI para mostrar solicitudes
- Integración en `src/App.tsx` – Panel en el header y solicitud de permisos al iniciar

## Uso

El componente `WaiterNotificationsPanel` se renderiza en el header pasando el `waiterId` del mesero autenticado. Las notificaciones del navegador se solicitan automáticamente al cargar la app.

## Push en segundo plano

Para recibir notificaciones de solicitudes **cuando la app está en segundo plano**, configura el webhook en Supabase:

1. **Database** → **Webhooks** → Nuevo webhook
2. **Table**: `waiter_notifications` | **Events**: INSERT
3. **URL**: `https://splitme-waiter-push.vercel.app/api/webhook/waiter-notification`

Ver `push-service/SUPABASE-WEBHOOK-CONFIG.md` para más detalles.

## Notas importantes

1. **Realtime debe estar habilitado** en Supabase para la tabla `waiter_notifications`
2. Las notificaciones se filtran automáticamente por `waiter_id`
3. El contador de no leídas se actualiza en tiempo real
4. El icono de notificaciones usa `/icons/icon-192.png`
