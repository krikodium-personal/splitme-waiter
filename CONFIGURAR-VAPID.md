# Configurar VAPID Keys para Push Notifications

## Paso 1: Generar las claves VAPID

Ejecuta este comando en tu terminal:

```bash
npx web-push generate-vapid-keys
```

Esto generará dos claves:
- **Public Key**: La que va en el frontend (Vercel)
- **Private Key**: La que va en el backend (para enviar notificaciones)

Ejemplo de salida:
```
=======================================

Public Key:
BGx1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz

Private Key:
1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz

=======================================
```

## Paso 2: Configurar en Vercel (Frontend)

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto `splitme-waiter`
3. Ve a **Settings** → **Environment Variables**
4. Agrega las siguientes variables:

### Variable 1: VITE_VAPID_PUBLIC_KEY
- **Name:** `VITE_VAPID_PUBLIC_KEY`
- **Value:** Pega la **Public Key** que generaste
- **Environment:** Selecciona todas (Production, Preview, Development)
- Click **Save**

### Variable 2: VITE_PUSH_SUBSCRIPTION_URL (Opcional por ahora)
- **Name:** `VITE_PUSH_SUBSCRIPTION_URL`
- **Value:** URL de tu backend que recibe suscripciones (ej: `https://tu-backend.com/api/push-subscribe`)
- **Environment:** Selecciona todas
- Click **Save**

**Nota:** Si aún no tienes backend, puedes dejar esta vacía por ahora. Las suscripciones se crearán localmente pero no se enviarán al backend.

## Paso 3: Redesplegar en Vercel

Después de agregar las variables:

1. Ve a **Deployments** en Vercel
2. Click en los **3 puntos** del último deployment
3. Selecciona **Redeploy**
4. O simplemente haz un nuevo push a GitHub (Vercel redespelgará automáticamente)

## Paso 4: Verificar en la app

1. Recarga la PWA en tu iPhone
2. Abre el diagnóstico de push notifications
3. Verifica que "VAPID Public Key" ahora muestre ✅ "Configurada"
4. Intenta registrar la suscripción nuevamente

## Paso 5: Configurar en el Backend (Para enviar notificaciones)

Cuando tengas tu backend listo para enviar notificaciones push:

1. **Guarda la Private Key** de forma segura (nunca la expongas en el frontend)
2. En tu backend, instala `web-push`:
   ```bash
   npm install web-push
   ```
3. Configura las claves VAPID en tu backend:
   ```javascript
   const webpush = require('web-push');
   
   webpush.setVapidDetails(
     'mailto:tu-email@ejemplo.com', // Email de contacto
     'TU_PUBLIC_KEY_AQUI',          // La misma Public Key
     'TU_PRIVATE_KEY_AQUI'          // La Private Key (secreta)
   );
   ```
4. Cuando quieras enviar una notificación:
   ```javascript
   await webpush.sendNotification(
     subscription, // Objeto de suscripción guardado
     JSON.stringify({
       title: 'Nuevo envío recibido',
       body: 'Mesa 10 tiene un nuevo envío',
       url: '/'
     })
   );
   ```

## Verificación rápida

Después de configurar en Vercel y redesplegar:

✅ **VAPID Public Key** debe mostrar "Configurada" en el diagnóstico
✅ Puedes hacer click en "REGISTRAR PUSH SUBSCRIPTION" sin error
✅ La suscripción se creará correctamente

## Troubleshooting

### "VAPID Public Key no está configurada" después de configurarla
- Verifica que el nombre de la variable sea exactamente `VITE_VAPID_PUBLIC_KEY`
- Asegúrate de haber redesplegado después de agregar la variable
- Verifica que la variable esté en el ambiente correcto (Production)

### La suscripción se crea pero no llegan notificaciones
- Esto es normal si no tienes backend configurado aún
- Las notificaciones solo funcionan cuando el backend las envía usando `web-push`
- El frontend solo puede recibir notificaciones cuando la app está abierta (usando `new Notification()`)

### Error al generar claves VAPID
- Asegúrate de tener Node.js instalado
- Si `npx` no funciona, instala `web-push` globalmente: `npm install -g web-push`
- Luego ejecuta: `web-push generate-vapid-keys`
