/// <reference lib="webworker" />
export {};

// Excluded from tsconfig.app.json (which targets the DOM lib) since the
// webworker lib's globals conflict with DOM's — see vite.config.ts for how
// this gets built into a root-level dist/sw.js despite that exclusion.
declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'gardenmate-v1';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const PHOTO_CACHE = `${CACHE_VERSION}-photos`;
const KNOWN_CACHES = [APP_SHELL_CACHE, PHOTO_CACHE];

const APP_SHELL_URLS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith('gardenmate-') && !KNOWN_CACHES.includes(key)).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// Supabase Storage public object URLs look like
// https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path> —
// matching on the path (not the host, which varies per project) covers
// plant photos, avatar photos, space photos, and progress photos alike.
function isStoragePhotoRequest(url: URL): boolean {
  return url.pathname.includes('/storage/v1/object/public/');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (isStoragePhotoRequest(url)) {
    event.respondWith(
      caches.open(PHOTO_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached ?? networkFetch;
      }),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    // Network-first, not cache-first: the app shell (index.html + hashed
    // JS/CSS) changes on every deploy, but this service worker's own code
    // usually doesn't — so browsers rarely see it as "updated" and would
    // otherwise keep serving whatever got cached on a user's very first
    // visit indefinitely. Always try the network so a redeploy is visible
    // immediately; only fall back to the cache when actually offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match('/index.html')) ?? Response.error()),
    );
  }
});
