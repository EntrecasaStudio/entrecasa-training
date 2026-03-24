/**
 * Service Worker — Offline-first PWA
 *
 * Strategy:
 * - PRECACHE: All build assets are cached on install (replaced by Vite plugin)
 * - CACHE-FIRST: Hashed assets (JS/CSS bundles) → serve from cache, never refetch
 * - NETWORK-FIRST: HTML/navigation → try network, fall back to cached index.html
 * - SKIP: Cross-origin requests (Firebase, CDN fonts, Sentry)
 */

const CACHE_NAME = '__BUILD_HASH__';
const PRECACHE_URLS = '__PRECACHE_MANIFEST__';

// ── Install: precache all build assets ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for assets, network-first for navigation ──
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin (Firebase, Sentry, CDN fonts, etc.)
  if (url.origin !== self.location.origin) return;

  // Hashed assets (e.g. /assets/index-TA8Y6QX4.js) → cache-first (immutable)
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Navigation requests & HTML → network-first, fall back to cached index.html
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline → serve cached index.html for SPA navigation
          return caches.match('/entrecasa-training/index.html') || caches.match(event.request);
        })
    );
    return;
  }

  // Everything else (manifest, icons, etc.) → cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Nothing in cache, nothing from network
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
