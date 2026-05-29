const CACHE_NAME = 'zona-coworking-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy for dynamic web app
self.addEventListener('fetch', event => {
  // Only handle GET requests from the same origin
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses instantly
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return response;
      })
      .catch(() => {
        // If network fails, serve from cache
        return caches.match(event.request).then(response => {
          if (response) return response;
          
          // SPA fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          
          return undefined;
        });
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
