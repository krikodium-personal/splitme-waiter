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
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return null;
  if (Notification.permission === 'denied') return null;

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  });

  if (PUSH_SUBSCRIPTION_URL && subscription) {
    try {
      await fetch(PUSH_SUBSCRIPTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          waiter_id: waiterId,
        }),
      });
    } catch (e) {
      console.warn('[Push] No se pudo enviar la suscripción al backend:', e);
    }
  }

  return subscription;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}
