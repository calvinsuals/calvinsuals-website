/* Kill-switch service worker:
 * If any legacy service worker registration still exists for this scope,
 * this script updates it, clears old caches, and unregisters itself.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    } catch (_) {
      // ignore
    }

    try {
      await self.registration.unregister();
    } catch (_) {
      // ignore
    }

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
