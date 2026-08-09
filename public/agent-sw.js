/* This service worker unregisters itself — caching caused stale JS issues */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.registration.unregister(); })
  );
  self.clients.claim();
});
