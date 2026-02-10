# Splitme Push Service

Microservicio Node.js para enviar push notifications usando web-push.

## Instalación

```bash
cd push-service
npm install
```

## Configuración

1. Copia `.env.example` a `.env`:
```bash
cp .env.example .env
```

2. Completa las variables en `.env`:
- `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`: Las mismas que usaste en Vercel
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: Credenciales de Supabase
- `SERVICE_URL`: URL donde está desplegado este servicio (para producción)

## Ejecutar localmente

```bash
npm run dev
```

El servicio estará disponible en `http://localhost:3000`

## Endpoints

### POST `/api/push-subscribe`
Recibe suscripciones push del frontend.

**Body:**
```json
{
  "subscription": { ... },
  "waiter_id": "uuid-del-mesero"
}
```

### POST `/api/send-push`
Envía una notificación push a un mesero.

**Body:**
```json
{
  "waiter_id": "uuid-del-mesero",
  "title": "Título de la notificación",
  "body": "Cuerpo de la notificación",
  "url": "/",
  "data": { ... }
}
```

### GET `/health`
Health check del servicio.

## Desplegar en Vercel

1. Crea un nuevo proyecto en Vercel apuntando a la carpeta `push-service`
2. Configura las variables de entorno en Vercel:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_EMAIL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SERVICE_URL` (la URL de Vercel del servicio, ej: `https://push-service.vercel.app`)
3. Vercel detectará automáticamente que es un proyecto Node.js

## Desplegar en Railway/Render/Heroku

Similar a Vercel, solo configura las variables de entorno y despliega.

## Integración con Supabase

El servicio escucha automáticamente eventos de `order_batches` usando Supabase Realtime y envía notificaciones cuando se crea un nuevo batch.

## Tabla requerida en Supabase

Asegúrate de tener la tabla `push_subscriptions` creada (ver `SUPABASE-PUSH-SETUP.md`).
