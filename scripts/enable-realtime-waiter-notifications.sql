-- Habilitar Realtime para la tabla waiter_notifications
-- Ejecuta este script en el SQL Editor de Supabase para que las notificaciones
-- lleguen en tiempo real sin refrescar la página.
--
-- Supabase Dashboard → SQL Editor → New query → Pegar y ejecutar

ALTER PUBLICATION supabase_realtime ADD TABLE waiter_notifications;
