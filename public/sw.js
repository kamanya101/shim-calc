/*
 * Offline cache for the shim calculator.
 *
 * Strategy is network-first for navigations (so a deploy is picked up on the
 * next online visit) with a cache fallback, and stale-while-revalidate for
 * static assets. Nothing here needs to be clever: the whole app is a few
 * hundred kB of static files and all the data lives in localStorage.
 */

/*
 * The version comes from the query string the page registers us with, which is
 * the build id. That makes this script byte-different on every deploy, so the
 * browser installs a fresh worker and activation drops every older cache.
 *
 * Hard-coding a version here was a mistake: unchanged sw.js meant no new
 * worker, so a deploy could leave people staring at the previous build with no
 * way to know, and no way to fix it short of clearing site data.
 */
const VERSION =
  new URL(self.location.href).searchParams.get("v") || "fallback";
const CACHE = `shim-calc-${VERSION}`;
const OFFLINE_URLS = ["/", "/order", "/summary", "/history", "/notes"];

/**
 * True for the payloads Next.js fetches when you tap a tab rather than reload.
 * They live at the page's own URL, so caching them served a stale page while
 * the address bar and the HTML both looked current — the exact way this went
 * wrong. Always go to the network first for these.
 */
function isAppPayload(request, url) {
  return (
    request.mode === "navigate" ||
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1"
  );
}

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

  if (isAppPayload(request, url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only keep full page loads for the offline case. Router payloads
          // are deploy-specific and must never be replayed from cache.
          if (request.mode === "navigate" && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
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
