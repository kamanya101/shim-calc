/*
 * Offline cache for the shim calculator.
 *
 * Strategy is network-first for navigations (so a deploy is picked up on the
 * next online visit) with a cache fallback, and stale-while-revalidate for
 * static assets. Nothing here needs to be clever: the whole app is a few
 * hundred kB of static files and all the data lives in localStorage.
 */

// Bump on any change to the route list or caching strategy. Activation clears
// every cache that isn't this one, which is also how stale asset entries from
// previous deploys get swept.
const VERSION = "v2";
const CACHE = `shim-calc-${VERSION}`;
const OFFLINE_URLS = ["/", "/order", "/summary", "/history", "/notes"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(OFFLINE_URLS))
      // A failed pre-cache must not block activation, or a single 404 leaves
      // the user with no service worker at all.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (await caches.match("/")) || Response.error();
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
