/**
 * Registro para notificaciones push (PWA).
 * Necesita VITE_VAPID_PUBLIC_KEY en .env y un backend que envíe push con la suscripción.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const PUSH_SUBSCRIPTION_URL = import.meta.env.VITE_PUSH_SUBSCRIPTION_URL as string | undefined;

export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission(): NotificationPermission {
  return Notification.permission;
}

/** Pide permiso y suscribe a push; devuelve la suscripción para enviarla al backend. */
export async function registerPushSubscription(waiterId?: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    throw new Error('Push notifications no están soportadas en este navegador');
  }

  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VAPID Public Key no está configurada. Configura VITE_VAPID_PUBLIC_KEY en las variables de entorno.');
  }

  if (Notification.permission === 'denied') {
    throw new Error('Los permisos de notificaciones están denegados. Ve a Configuración → Safari → Notificaciones para activarlos.');
  }

  // Pedir permisos si no están concedidos
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Los permisos de notificaciones fueron denegados. Acepta los permisos cuando iOS lo solicite.');
    }
  }

  // Timeout para evitar que se quede colgado si el Service Worker no está listo
  const swReadyWithTimeout = (ms: number): Promise<ServiceWorkerRegistration> =>
    new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        reject(new Error('El Service Worker no está listo. Recarga la app e intenta de nuevo. En iOS, asegúrate de que la app esté instalada desde la pantalla de inicio.'));
      }, ms);
      navigator.serviceWorker.ready
        .then((r) => {
          clearTimeout(t);
          resolve(r);
        })
        .catch((err) => {
          clearTimeout(t);
          reject(err);
        });
    });

  try {
    const registration = await swReadyWithTimeout(10000);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });

    // Enviar suscripción al backend si está configurado
    if (PUSH_SUBSCRIPTION_URL && subscription) {
      try {
        const response = await fetch(PUSH_SUBSCRIPTION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            waiter_id: waiterId,
          }),
        });
        
        if (!response.ok) {
          console.warn('[Push] El backend rechazó la suscripción:', response.status, response.statusText);
        }
      } catch (e) {
        console.warn('[Push] No se pudo enviar la suscripción al backend:', e);
        // No lanzamos error aquí porque la suscripción se creó correctamente
        // Solo no se pudo enviar al backend
      }
    } else if (!PUSH_SUBSCRIPTION_URL) {
      console.warn('[Push] VITE_PUSH_SUBSCRIPTION_URL no está configurada. La suscripción no se enviará al backend.');
    }

    return subscription;
  } catch (error: any) {
    console.error('[Push] Error al crear suscripción:', error);
    if (error.message) {
      throw error;
    }
    throw new Error(`Error al registrar suscripción push: ${error.message || error}`);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}
