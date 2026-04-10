/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/vanillajs" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkOnly, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// ── Precache all Vite build outputs ──────────────────────────────────────────
// self.__WB_MANIFEST is replaced at build time by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Take control of all open tabs as soon as this SW activates —
// without this, users have to close and reopen the tab.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Offline response for non-GET requests ────────────────────────────────────
// Intercept ALL non-GET requests first, before any route matching.
// If the network is available the request goes through normally.
// If offline, return a machine-readable 503 so the frontend can show
// a proper "you are offline" toast instead of a generic network error.
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') return; // handled by routes below

  event.respondWith(
    fetch(event.request).catch(() =>
      new Response(
        JSON.stringify({
          offline: true,
          error:   'You are offline. This action requires a network connection.',
        }),
        {
          status:  503,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )
  );
});

// ── Runtime caching (GET only from here down) ─────────────────────────────────

// // 1. NEVER cache: specific performance detail, seat map, booking
// registerRoute(
//   ({ url }) => /\/api\/v\d+\/events\/[^/]+\/performances\//.test(url.pathname),
//   new NetworkOnly()
// );

// 2. NEVER cache: uploads
registerRoute(
  ({ url }) => url.pathname.startsWith('/uploads/'),
  new NetworkOnly()
);

// 3. Locales — static JSON, safe to cache
registerRoute(
  ({ url }) => /\/api\/v\d+\/locales\//.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'api-locales',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// 4. Events metadata (not performances/:id subtree — caught by rule 1 above)
registerRoute(
  ({ url }) => /\/api\/v\d+\/events/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'api-events',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// 5. Theaters
registerRoute(
  ({ url }) => /\/api\/v\d+\/theaters/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'api-theaters',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// 6. Layouts
registerRoute(
  ({ url }) => /\/api\/v\d+\/layouts/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'api-layouts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// 7. Users
registerRoute(
  ({ url }) => /\/api\/v\d+\/users/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'api-users',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 5 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// 8. PWA icons
registerRoute(
  ({ url }) => url.pathname.startsWith('/icons/'),
  new CacheFirst({
    cacheName: 'pwa-icons',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// 9. Fonts
registerRoute(
  ({ url }) => /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url.href),
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// 10. /api/ catch-all — any endpoint not matched above goes NetworkOnly
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkOnly()
);

// ── Global catch handler ──────────────────────────────────────────────────────
// If a precached navigation request fails (e.g. index.html somehow missing),
// this is the last resort. For API routes this should never be reached.
setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    // Return cached index.html for navigation failures
    return caches.match('/index.html').then(r => r ?? Response.error());
  }
  return Response.error();
});
