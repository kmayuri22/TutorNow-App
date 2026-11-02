// TutorNow Service Worker - Cache Purge & Live Stream Engine
const CACHE_VERSION = 'v2-live';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => caches.delete(cache))
      );
    }).then(() => self.clients.claim())
  );
});

// Always fetch fresh network assets without stale cache
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
