const CACHE_NAME = 'zona-coworking-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('push', event => {
  if (event.data) {
    const payload = event.data.json();
    const title = payload.title || 'Notification';
    const options = {
      body: payload.body || 'New message',
      icon: 'https://i.ibb.co/Wp4cVb35/Icono-Agenda-ZC.png',
      vibrate: [200, 100, 200]
    };
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
