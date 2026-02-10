-- Agregar user_id a waiters para permitir login de meseros
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna user_id (nullable, FK a auth.users)
ALTER TABLE waiters
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_waiters_user_id ON waiters(user_id);

-- 3. Para vincular un mesero existente con un usuario de auth:
--    Opción A: Crear usuario en Auth (Dashboard > Authentication > Users) y luego:
--    UPDATE waiters SET user_id = 'UUID-DEL-USUARIO' WHERE id = 'UUID-DEL-MESERO';
--
--    Opción B: Si el mesero tiene el mismo email que un usuario existente en auth.users:
--    UPDATE waiters w
--    SET user_id = u.id
--    FROM auth.users u
--    WHERE u.email = 'email@del-mesero.com' AND w.id = 'UUID-DEL-MESERO';
