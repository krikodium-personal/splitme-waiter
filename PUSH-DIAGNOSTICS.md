# Diagnóstico de Push Notifications en iPhone PWA

## Cómo usar el diagnóstico

1. **Abre la app** desde el icono en la pantalla de inicio (no desde Safari)
2. **Haz login** como mesero
3. **Toca el botón "Push"** en el header (al lado del icono de campana)
4. Se abrirá el **panel de diagnóstico** que mostrará:
   - ✅ Estado de cada componente necesario
   - ⚠️ Advertencias sobre configuraciones faltantes
   - ❌ Errores que impiden el funcionamiento

## Checklist de requisitos

### 1. PWA Instalada ✅
- La app DEBE estar instalada desde "Añadir a la pantalla de inicio"
- NO funciona si solo abres la URL en Safari
- En iOS, las push notifications SOLO funcionan en PWAs instaladas

### 2. Permisos de Notificaciones ✅
- Debes haber aceptado los permisos cuando la app los pidió
- Si los denegaste, ve a: **Configuración → Safari → Notificaciones → Splitme** y actívalos

### 3. Service Worker Registrado ✅
- El service worker debe estar activo
- Si no está registrado, recarga la app

### 4. Suscripción Push Activa ✅
- Debes estar suscrito usando el botón "Registrar Push Subscription"
- Sin suscripción, NO recibirás notificaciones push

### 5. VAPID Public Key Configurada ✅
- Debe estar configurada en las variables de entorno: `VITE_VAPID_PUBLIC_KEY`
- Sin esta clave, NO puedes suscribirte

### 6. Backend para Enviar Notificaciones ✅
- Necesitas un backend que use `web-push` para enviar notificaciones
- El backend debe tener la VAPID private key
- El backend debe escuchar eventos (ej: nuevos batches) y enviar push

## Problemas comunes y soluciones

### ❌ "PWA Instalada: No detectada"
**Solución:**
1. Abre Safari en tu iPhone
2. Ve a la URL de la app
3. Toca "Compartir" → "Añadir a la pantalla de inicio"
4. Abre la app desde el icono (no desde Safari)

### ❌ "Permisos de Notificaciones: Denegados"
**Solución:**
1. Ve a Configuración → Safari → Notificaciones
2. Busca "Splitme" en la lista
3. Activa las notificaciones

### ❌ "Suscripción Push: No suscrito"
**Solución:**
1. En el panel de diagnóstico, toca "Registrar Push Subscription"
2. Acepta los permisos si te los pide
3. Verifica que aparezca "Suscripción Push: Activa"

### ❌ "VAPID Public Key: No configurada"
**Solución:**
1. Genera claves VAPID: `npx web-push generate-vapid-keys`
2. Agrega la clave pública a las variables de entorno:
   - En Vercel: Settings → Environment Variables → `VITE_VAPID_PUBLIC_KEY`
   - En local: archivo `.env` con `VITE_VAPID_PUBLIC_KEY=tu-clave-publica`

### ❌ "Push Subscription URL: No configurada"
**Solución:**
1. Configura la URL de tu backend que recibe suscripciones
2. Agrega a variables de entorno: `VITE_PUSH_SUBSCRIPTION_URL=https://tu-backend.com/push-subscribe`

### ❌ Las notificaciones no llegan aunque todo esté configurado
**Posibles causas:**
1. **No hay backend enviando notificaciones**: Las push notifications requieren que un backend envíe las notificaciones usando `web-push`. El código actual solo muestra notificaciones cuando la app está abierta.

2. **El backend no está escuchando eventos**: El backend debe escuchar eventos (ej: nuevos batches en Supabase) y enviar push notifications.

3. **El backend no tiene la suscripción**: El backend debe tener guardada la suscripción del usuario para poder enviarle notificaciones.

## Cómo funciona el flujo completo

1. **Usuario se suscribe** → La app crea una suscripción push y la envía al backend
2. **Backend guarda la suscripción** → Se almacena en base de datos asociada al mesero
3. **Evento ocurre** → Ej: nuevo batch creado en Supabase
4. **Backend detecta el evento** → Escucha cambios en Supabase Realtime o polling
5. **Backend envía push** → Usa `web-push.sendNotification()` con la suscripción guardada
6. **Service Worker recibe push** → El evento `push` se dispara en `sw.ts`
7. **Notificación se muestra** → El service worker muestra la notificación usando `showNotification()`

## Prueba de notificación local

El botón "Probar Notificación Local" en el diagnóstico muestra una notificación inmediatamente. Esto verifica que:
- ✅ Los permisos están concedidos
- ✅ Las notificaciones funcionan cuando la app está abierta

**Nota:** Esto NO prueba las push notifications reales (que funcionan cuando la app está cerrada). Para eso necesitas el backend configurado.

## Verificar logs en consola

Abre la consola del navegador (en iPhone: Safari → Develop → [Tu iPhone] → [Tu app]) para ver:
- Logs de suscripción: `📬 Callback onNewBatch llamado con datos:`
- Logs de permisos: `🔔 Permiso de notificaciones:`
- Errores de suscripción o push

## Próximos pasos si todo está configurado pero no funciona

1. Verifica que el backend esté funcionando y pueda enviar push
2. Verifica que el backend tenga la suscripción correcta del usuario
3. Verifica que el backend esté escuchando los eventos correctos
4. Revisa los logs del backend para ver si está intentando enviar notificaciones
5. Prueba enviar una notificación manualmente desde el backend para verificar que funciona
