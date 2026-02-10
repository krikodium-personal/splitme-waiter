# Splitme Meseros

App PWA para meseros de Splitme. Muestra solo las mesas asignadas al mesero logueado, con las mismas funcionalidades que el Admin (cocina, pagos, cerrar mesa).

**Instalable en iPhone** como PWA y con soporte para **notificaciones push** en tiempo real.

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

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key

# Opcional: notificaciones push (PWA)
# VITE_VAPID_PUBLIC_KEY=tu-clave-publica-vapid
# VITE_PUSH_SUBSCRIPTION_URL=https://tu-api.com/push-subscribe
```

Si no se definen, usa las credenciales por defecto del proyecto splitme.

## Despliegue en Vercel

1. **Conectar con GitHub:**
   - Crea un repositorio en GitHub (ej: `splitme-waiter`)
   - Haz push del código: `git push origin main`

2. **En Vercel:**
   - Ve a [vercel.com](https://vercel.com) e inicia sesión
   - Click en **"Add New Project"**
   - Importa el repositorio de GitHub
   - Configuración automática (Vite detectado):
     - **Framework Preset:** Vite
     - **Build Command:** `npm run build`
     - **Output Directory:** `dist`
   - **Variables de entorno:** Añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (y opcionales para push)
   - Click **"Deploy"**

3. **Después del deploy:**
   - Vercel te dará una URL (ej: `https://splitme-waiter.vercel.app`)
   - La app estará disponible en HTTPS (requerido para PWA y push)

## PWA e Instalación en iPhone

Ver **[PWA-IPHONE-PUSH.md](./PWA-IPHONE-PUSH.md)** para:
- Generar iconos
- Instalar en iPhone (añadir a pantalla de inicio)
- Configurar notificaciones push

## Build

```bash
npm run build
```

Genera la carpeta `dist` lista para producción (PWA con service worker incluido).
