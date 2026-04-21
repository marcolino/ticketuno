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

  // // Activate the new service worker immediately after install
  // self.addEventListener('install', (event) => {
  //   event.waitUntil(self.skipWaiting());
  // });
  // Skip waiting only when the user confirms via the toast:
  self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });

  // Take control of all open tabs as soon as this SW activates —
  // without this, users have to close and reopen the tab.
  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });

  // ── Cache invalidation helper ─────────────────────────────────────────────────
  // Maps URL path patterns to the cache names that store their GET responses.
  const MUTATION_CACHE_MAP: Array<{ pattern: RegExp; caches: string[] }> = [
    { pattern: /\/api\/v\d+\/bookings/, caches: ['api-bookings'] },
    { pattern: /\/api\/v\d+\/theaters/, caches: ['api-theaters'] },
    { pattern: /\/api\/v\d+\/events/, caches: ['api-events'] },
    { pattern: /\/api\/v\d+\/layouts/, caches: ['api-layouts'] },
    { pattern: /\/api\/v\d+\/users/, caches: ['api-users'] },
    // Auth endpoints (login/logout) invalidate the users cache
    { pattern: /\/api\/v\d+\/auth/, caches: ['api-users'] },
  ];

  async function invalidateRelatedCaches(url: URL): Promise<void> {
    for (const { pattern, caches: cacheNames } of MUTATION_CACHE_MAP) {
      if (pattern.test(url.pathname)) {
        await Promise.all(
          cacheNames.map(async (name) => {
            const cache = await caches.open(name);
            const keys = await cache.keys();
            await Promise.all(keys.map((req) => cache.delete(req)));
          })
        );
      }
    }
  }

  // ── Non-GET requests: pass through + invalidate on success ───────────────────
  self.addEventListener('fetch', (event) => {
    if (event.request.method === 'GET') return;

    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          // Only invalidate on success (2xx) — don't wipe cache on 4xx/5xx
          if (response.ok) {
            const url = new URL(event.request.url);
            await invalidateRelatedCaches(url);
          }
          return response;
        })
        .catch(() =>
          new Response(
            JSON.stringify({
              offline: true,
              error: 'You are offline. This action requires a network connection.',
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        )
    );
  });

  // ── Push requests: wake up when the backend sends a push ───────────────────
  self.addEventListener('push', (event) => {
    if (!event.data) return;

    const { title, body, url, icon } = event.data.json();

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: icon ?? '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        // Store the deep-link URL so the click handler can open it
        data: { url },
        // On Android: vibrate + group notifications by app
        vibrate: [200, 100, 200],
        tag: 'ticketuno-reminder',
        renotify: true,
      } as NotificationOptions & { vibrate: number[] })
    );
  });

  // ── NotificationClick requests: user taps the notification ───────────────────
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url ?? '/';

    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // If the app is already open in a tab, focus it and navigate
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      })
    );
  });

  // ── Runtime caching (GET only from here down) ─────────────────────────────────

  // // 1. NEVER cache: specific performance detail, seat map, booking
  // registerRoute(
  //   ({ url }) => /\/api\/v\d+\/events\/[^/]+\/performances\//.test(url.pathname),
  //   new NetworkOnly()
  // );

  // 1. NEVER cache: uploads
  registerRoute(
    ({ url }) => url.pathname.startsWith('/uploads/'),
    new NetworkOnly()
  );

  // 2. Locales, genuinely static JSON, safe to cache aggressively
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

  // 3. Events, short TTL, cache is wiped on any mutation above
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

  // 4. Theaters, cache is wiped on any mutation above
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

  // 5. Layouts, cache is wiped on any mutation above
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

  // 5b. User edit endpoint, always fresh, never stale
  registerRoute(
    ({ url }) => /\/api\/v\d+\/users\/profile/.test(url.pathname),
    new NetworkOnly()
  );

  // 6. Users (includes /auth/me), short TTL, wiped on auth mutations
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

  // 6b. Bookings list + /my: short TTL, wiped on any booking mutation above
  //     Matches: /api/v1/bookings and /api/v1/bookings/my (nothing else)
  registerRoute(
    ({ url }) => /\/api\/v\d+\/bookings(\/my)?$/.test(url.pathname),
    new StaleWhileRevalidate({
      cacheName: 'api-bookings',
      plugins: [
        new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  );

  // 6c. Individual booking detail: ALWAYS NetworkOnly.
  //     Scan and cancel status must never be stale.
  //     Matches: /api/v1/bookings/:id (anything after /bookings/ that is not 'my')
  registerRoute(
    ({ url }) => /\/api\/v\d+\/bookings\/(?!my$)[^/]+$/.test(url.pathname),
    new NetworkOnly()
  );

  // 7. /api/ catch-all, anything not matched above is NetworkOnly
  registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new NetworkOnly()
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

  // 10. Navigation route
  registerRoute(
    ({ request }) => request.mode === 'navigate',
    async () => {
      const cachedIndex = await caches.match('/index.html');
      return cachedIndex ?? fetch('/index.html');
    }
  );

  setCatchHandler(async ({ request }) => {
    if (request.destination === 'document') {
      return caches.match('/index.html').then((r) => r ?? Response.error());
    }
    return Response.error();
  });
