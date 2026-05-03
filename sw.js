// ─────────────────────────────────────────────
// Newborn Command Centre — Service Worker
//
// IMPORTANT: bump CACHE_VERSION every time you
// deploy an update so users get the new build.
// e.g. 'v1' → 'v2' → 'v3' …
// ─────────────────────────────────────────────
const CACHE_VERSION = 'v1';
const CACHE_NAME    = `command-centre-${CACHE_VERSION}`;

// Files that must be cached on install for the
// app to work completely offline.
const CORE_ASSETS = [
  './',
  './index.html'
];

// ── Install: pre-cache core assets ───────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())   // activate immediately
  );
});

// ── Activate: delete old caches ──────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())  // take control of open tabs
  );
});

// ── Fetch: serve from cache, update in background ──
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Google Fonts: network-first so they stay current,
  // fall back to cache if offline.
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Everything else: cache-first, then network.
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;

        return fetch(request)
          .then(response => {
            // Only cache valid same-origin responses
            if (response.ok && url.origin === self.location.origin) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            }
            return response;
          })
          // Offline fallback: serve the app shell
          .catch(() => caches.match('./'));
      })
  );
});
