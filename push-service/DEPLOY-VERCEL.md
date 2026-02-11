# Cómo desplegar el Push Service en Vercel

El push-service es el microservicio que recibe los webhooks de Supabase y envía las notificaciones push a los meseros. Debe estar desplegado en `splitme-waiter-push.vercel.app`.

## Opción A: Desde el Dashboard de Vercel (primera vez)

Si **aún no tienes** el proyecto push en Vercel:

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard) e inicia sesión.

2. Click en **"Add New..."** → **"Project"**.

3. **Importa el repositorio** `splitme-waiter` (o el nombre de tu repo).

4. **Configuración importante:**
   - **Root Directory:** Haz click en "Edit" y escribe: `push-service`
   - **Framework Preset:** Other (o deja que Vercel lo detecte)
   - **Build Command:** (vacío o `npm install`)
   - **Output Directory:** (vacío)

5. **Variables de entorno** (Settings → Environment Variables):
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_EMAIL` (ej: `mailto:notifications@splitme.com`)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

6. **Deploy**. Tu URL será algo como `splitme-waiter-push.vercel.app`.

---

## Opción B: Si ya tienes el proyecto (o quieres usar CLI)

Si el proyecto **splitme-waiter-push** ya existe en Vercel:

1. Abre la terminal y ve a la carpeta push-service:
   ```bash
   cd push-service
   ```

2. Instala Vercel CLI si no la tienes:
   ```bash
   npm i -g vercel
   ```

3. Ejecuta:
   ```bash
   vercel --prod
   ```

4. Si te pregunta si quieres vincular a un proyecto existente, elige **Yes** y selecciona `splitme-waiter-push`.

5. Las variables de entorno se guardan en el proyecto de Vercel; no hace falta configurarlas cada vez.

---

## Comprobar que funciona

1. Abre en el navegador: `https://splitme-waiter-push.vercel.app/health`
2. Deberías ver: `{"status":"ok","timestamp":"...","vapidConfigured":true}`

---

## Resumen

| Paso | Qué hacer |
|------|-----------|
| 1 | Los webhooks de Supabase ya apuntan a `splitme-waiter-push.vercel.app` ✅ |
| 2 | Despliega el push-service (Opción A o B arriba) |
| 3 | El webhook de `order_batches` ya está configurado ✅ |

Las notificaciones push llegarán cuando el push-service esté desplegado y las variables de entorno estén correctas.
