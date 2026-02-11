# Splitme Meseros

App para meseros de Splitme. Muestra solo las mesas asignadas al mesero logueado, con las mismas funcionalidades que el Admin (cocina, pagos, cerrar mesa).

## Requisitos previos

1. **Ejecutar el script SQL** `add_waiter_user_id.sql` en Supabase SQL Editor para agregar la columna `user_id` a la tabla `waiters`.

2. **Vincular un mesero con un usuario de Auth:**
   - Crear usuario en Supabase Auth (Dashboard > Authentication > Users) con email y contraseña.
   - Ejecutar: `UPDATE waiters SET user_id = 'UUID-DEL-USUARIO' WHERE id = 'UUID-DEL-MESERO';`

## Desarrollo

```bash
npm install
npm run dev
```

La app corre en **http://localhost:3003/**

## Variables de entorno

Crear `.env` con:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

Si no se definen, usa las credenciales por defecto del proyecto splitme.
