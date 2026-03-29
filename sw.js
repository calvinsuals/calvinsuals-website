const SW_VERSION = 'v1';
const STATIC_CACHE = `calvinsuals-static-${SW_VERSION}`;
const IMAGE_CACHE = `calvinsuals-images-${SW_VERSION}`;
const JSON_CACHE = `calvinsuals-json-${SW_VERSION}`;
const IMAGE_HOST = 'pub-67b44c34fdd2480e83feffb3cfc185b9.r2.dev';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (
          key !== STATIC_CACHE &&
          key !== IMAGE_CACHE &&
          key !== JSON_CACHE
        ) {
          return caches.delete(key);
        }
        return Promise.resolve();
      })
    );
    await self.clients.claim();
  })());
});

function isImageRequest(requestUrl, destination) {
  if (destination === 'image') return true;
  return requestUrl.hostname === IMAGE_HOST && /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(requestUrl.pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const destination = req.destination || '';

  // Cache-first for large gallery images (R2).
  if (isImageRequest(url, destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const cached = await cache.match(req, { ignoreVary: true });
      if (cached) return cached;
      const fresh = await fetch(req);
      if (fresh && fresh.ok) {
        cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    })());
    return;
  }

  // Stale-while-revalidate for local JSON lists.
  if (isSameOrigin && /\.json$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(JSON_CACHE);
      const cached = await cache.match(req, { ignoreSearch: true });
      const networkPromise = fetch(req).then((fresh) => {
        if (fresh && fresh.ok) {
          cache.put(req, fresh.clone()).catch(() => {});
        }
        return fresh;
      }).catch(() => null);

      if (cached) {
        networkPromise.catch(() => {});
        return cached;
      }

      const fresh = await networkPromise;
      if (fresh) return fresh;
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    })());
    return;
  }

  // Cache static same-origin assets (css/js/fonts) after first hit.
  if (isSameOrigin && ['style', 'script', 'font'].includes(destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      const fresh = await fetch(req);
      if (fresh && fresh.ok) {
        cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    })());
  }
});
