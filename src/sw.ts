/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision?: string }> };

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() as { title?: string; body?: string; url?: string } | undefined;
  const title = data?.title ?? 'Splitme Meseros';
  const options: NotificationOptions = {
    body: data?.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: data?.url ? { url: data.url } : {},
    tag: 'splitme-waiter',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url;
  if (url) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === url || client.url.startsWith(new URL(url).origin)) {
            client.focus();
            return client.navigate(url);
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
    );
  }
});
