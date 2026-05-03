// ─────────────────────────────────────────────
// Newborn Command Centre — Service Worker
//
// Strategy:
//   • HTML navigation  → network-first (always
//     fetches latest on every page load, falls
//     back to cache when offline)
//   • All other assets → cache-first (icons,
//     fonts etc. served instantly once cached)
//
// No manual version bump needed — the network-
// first strategy for HTML means every online
// load gets the latest build automatically.
// ─────────────────────────────────────────────
const CACHE_NAME = 'command-centre-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── Install: pre-cache all core assets ───────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())  // activate without waiting
  );
});

// ── Activate: clear old caches, claim tabs ───
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())  // take control immediately
  );
});

// ── Fetch ─────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // ── HTML navigation: network-first ──────────
  // Always try to fetch the freshest index.html.
  // If the network fails (offline), serve cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the fresh copy for offline use
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // ── Google Fonts: network-first ─────────────
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ── Everything else: cache-first ────────────
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;
        return fetch(request)
          .then(response => {
            if (response.ok && url.origin === self.location.origin) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(c => c.put(request, clone));
            }
            return response;
          })
          .catch(() => caches.match('./index.html'));
      })
  );
});
