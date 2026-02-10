/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision?: string }> };

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() as { 
    title?: string; 
    body?: string; 
    url?: string;
    batchId?: string;
    orderId?: string;
    tableNumber?: number;
  } | undefined;
  const title = data?.title ?? 'Splitme Meseros';
  const options: NotificationOptions = {
    body: data?.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      url: data?.url || '/',
      batchId: data?.batchId,
      orderId: data?.orderId,
      tableNumber: data?.tableNumber,
    },
    tag: 'splitme-waiter',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const notificationData = event.notification.data as { 
    url?: string;
    batchId?: string;
    orderId?: string;
    tableNumber?: number;
  } | undefined;
  
  const url = notificationData?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si hay una ventana abierta, enfocarla y navegar
      for (const client of clientList) {
        if (client.url.startsWith(new URL(url, self.location.origin).origin)) {
          client.focus();
          // Enviar mensaje con los datos de la notificación para que la app navegue
          if (notificationData?.orderId || notificationData?.batchId) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data: {
                orderId: notificationData.orderId,
                batchId: notificationData.batchId,
                tableNumber: notificationData.tableNumber,
              }
            });
          }
          return client.navigate(url);
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
