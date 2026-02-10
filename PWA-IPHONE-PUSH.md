# Splitme Meseros: PWA instalable en iPhone con notificaciones push

Guía para usar la app como **PWA** en iPhone (instalable en la pantalla de inicio) y recibir **notificaciones push** en tiempo real.

---

## Requisitos

- **iPhone con iOS 16.4 o superior** (push para PWA desde esta versión).
- **HTTPS**: la app debe servirse por HTTPS (en local con `npm run dev` no tendrás push; sí podrás instalar en simulador o en dispositivo con túnel).

---

## Paso 1: Generar iconos (una sola vez)

1. Crea dos iconos PNG:
   - **192×192 px** → guarda como `public/icons/icon-192.png`
   - **512×512 px** → guarda como `public/icons/icon-512.png`
2. Opciones rápidas:
   - [PWA Builder Image Generator](https://www.pwabuilder.com/imageGenerator): subes una imagen y descargas el paquete.
   - Cualquier editor (Figma, etc.): exporta un cuadrado a 192 y 512 px.

Sin iconos la app sigue siendo instalable; usará el icono por defecto del navegador.

---

## Paso 2: Build y despliegue en HTTPS

1. **Build**:
   ```bash
   npm run build
   ```

2. **Despliegue** en un hosting con HTTPS, por ejemplo:
   - **Vercel**: conectas el repo y despliegas (HTTPS automático).
   - **Netlify**: igual, arrastras la carpeta `dist` o conectas el repo.
   - **Supabase** (Static Site): en el dashboard, Hosting → subir `dist` o conectar repo.

3. Anota la **URL pública** de la app (ej: `https://splitme-waiter.vercel.app`).

Para **probar en iPhone en local** sin desplegar:
- **ngrok**: `npx ngrok http 3003` y usas la URL HTTPS que te da.
- **LocalTunnel** o similar: mismo concepto (túnel HTTPS a tu `localhost:3003`).

---

## Paso 3: Instalar la PWA en el iPhone

1. Abre **Safari** en el iPhone.
2. Entra a la URL de la app (la de producción o la del túnel HTTPS).
3. Toca el botón **Compartir** (cuadrado con flecha hacia arriba).
4. Baja y toca **“Añadir a la pantalla de inicio”**.
5. Confirma el nombre (ej. “Splitme”) y toca **“Añadir”**.

La app quedará en la pantalla de inicio como una app. Ábrela desde ahí (no desde Safari); así se usa como PWA y en iOS 16.4+ podrás usar notificaciones push.

---

## Paso 4: Activar notificaciones push (en la app)

1. Abre la app **desde el icono de la pantalla de inicio** (no desde Safari).
2. La primera vez, la app puede mostrar un aviso para activar notificaciones (si implementaste el botón).
3. Acepta cuando iOS muestre el diálogo de “Permitir notificaciones”.
4. Opcional: en **Ajustes → Notificaciones** busca “Splitme” y ajusta sonidos y avisos.

En iOS, las notificaciones push **solo funcionan** si:
- La app se ha añadido a la pantalla de inicio, y
- Se abre al menos una vez desde ese icono.

---

## Paso 5: Backend para enviar notificaciones push

La PWA ya está preparada para **recibir** push (service worker con `push` y `notificationclick`). Para **enviar** notificaciones necesitas un backend que use **Web Push** (con VAPID).

### Opción A: Supabase Edge Function (recomendada si usas Supabase)

1. Instalar dependencias en el proyecto de Supabase (en un directorio donde tengas Edge Functions):
   ```bash
   npm install web-push
   ```

2. Generar claves VAPID (una vez):
   ```bash
   npx web-push generate-vapid-keys
   ```
   Guarda la **clave pública** en el front (variable de entorno, ej. `VITE_VAPID_PUBLIC_KEY`) y la **privada** en la Edge Function (secreto).

3. En la app (front):
   - Pedir permiso de notificaciones.
   - Obtener la suscripción con `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })`.
   - Enviar el objeto `subscription` (JSON) a tu backend (por ejemplo a una tabla `push_subscriptions` en Supabase o a una Edge Function).

4. Edge Function que envía el push:
   - Recibe el `subscription` y el payload (título, cuerpo, URL).
   - Usa `web-push.sendNotification(subscription, JSON.stringify(payload), { vapidDetails: { privateKey, publicKey } })`.

5. Cuando ocurra un evento en tiempo real (por ejemplo un nuevo pedido en Supabase), tu backend o una Edge Function que escuche ese evento puede:
   - Buscar las suscripciones del mesero/restaurante.
   - Llamar a `web-push.sendNotification` para cada una.

### Opción B: Servidor Node (Express, etc.)

- Mismo flujo: generar VAPID, en el servidor usar `web-push` para enviar a cada `subscription` guardada.
- La app envía la suscripción a tu API y la guardas en base de datos.

### Opción C: Servicios de terceros

- **Firebase Cloud Messaging (FCM)** o **OneSignal**: dan SDK y backend; configuras el proyecto y en la PWA usas su API para registrar el dispositivo y ellos envían el push. Útil si no quieres mantener tu propio backend de push.

---

## Resumen rápido

| Paso | Acción |
|-----|--------|
| 1 | Iconos 192 y 512 en `public/icons/` |
| 2 | `npm run build` y desplegar la carpeta `dist` en HTTPS (o usar ngrok para pruebas) |
| 3 | En iPhone: Safari → tu URL → Compartir → “Añadir a la pantalla de inicio” |
| 4 | Abrir la app desde el icono y aceptar notificaciones cuando se pida |
| 5 | Backend con Web Push (Edge Function, Node o FCM/OneSignal) para enviar notificaciones cuando haya nuevos pedidos u otros eventos |

---

## Notas técnicas

- **Service worker**: generado por `vite-plugin-pwa` (estrategia `injectManifest`) en `src/sw.ts`. Incluye:
  - Precachado de la app.
  - Listener `push` para mostrar la notificación.
  - Listener `notificationclick` para abrir la URL al tocar la notificación.
- **Manifest**: `manifest.webmanifest` (o el generado por el plugin) con nombre, iconos, `display: standalone`, etc.
- **iOS**: Las notificaciones push en web solo están soportadas para PWAs añadidas a la pantalla de inicio (iOS 16.4+).
