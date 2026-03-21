/* PWA service worker — install scope + Web Push display */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      try {
        const text = event.data.text();
        payload = text ? JSON.parse(text) : {};
      } catch {
        payload = { body: event.data.text ? event.data.text() : '' };
      }
    }
  }

  const title = payload.title || 'CityFreshKart';
  const body = payload.body || 'You have a new update.';
  const url = payload.url || '/';

  const options = {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url, orderId: payload.orderId || null, type: payload.type || 'general' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i += 1) {
        const client = clientList[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        const path = typeof url === 'string' && url.startsWith('http') ? url : new URL(url, self.location.origin).href;
        return self.clients.openWindow(path);
      }
      return undefined;
    }),
  );
});
