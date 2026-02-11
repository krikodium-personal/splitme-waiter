/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision?: string }> };

self.skipWaiting();
clientsClaim();
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
  
  console.log('[SW] Notification click:', notificationData);
  
  const url = notificationData?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      console.log('[SW] Clients encontrados:', clientList.length);
      
      // Si hay una ventana abierta, enfocarla y enviar mensaje
      for (const client of clientList) {
        const clientOrigin = new URL(client.url).origin;
        const targetOrigin = new URL(url, self.location.origin).origin;
        
        if (clientOrigin === targetOrigin) {
          console.log('[SW] Enfocando cliente existente y enviando mensaje');
          client.focus();
          
          // Enviar mensaje con los datos de la notificación
          if (notificationData?.orderId || notificationData?.batchId) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data: {
                orderId: notificationData.orderId,
                batchId: notificationData.batchId,
                tableNumber: notificationData.tableNumber,
              }
            }).catch(err => console.error('[SW] Error enviando mensaje:', err));
          }
          
          // También guardar en localStorage por si el mensaje no llega
          if (notificationData?.orderId) {
            try {
              const pendingNav = {
                orderId: notificationData.orderId,
                batchId: notificationData.batchId,
                tableNumber: notificationData.tableNumber,
                timestamp: Date.now()
              };
              // Usar IndexedDB o simplemente navegar con la URL que tiene los params
              return client.navigate(url);
            } catch (e) {
              console.error('[SW] Error guardando navegación:', e);
            }
          }
          
          return client.navigate(url);
        }
      }
      
      // Si no hay ventana abierta, abrir una nueva con la URL que tiene los params
      console.log('[SW] Abriendo nueva ventana:', url);
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
