import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 832, // KB - suppress warnings for known-large vendor chunks
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          'vendor-mui-core': [
            '@mui/material',
            '@mui/system',
            '@mui/utils',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled',
          ],

          'vendor-mui-x': [
            '@mui/x-data-grid',
            '@mui/x-date-pickers',
          ],

          'vendor-i18n': [
            'i18next',
            'react-i18next',
            'i18next-browser-languagedetector',
            'i18next-http-backend',
          ],
          'vendor-dates': ['date-fns', 'dayjs'],
          'vendor-qr':    ['jsqr'],
        },
      },
    },
  },
  plugins: [
    react({
      // Suppress Fast Refresh warnings for specific files
      exclude: [
        /\/contexts\/AuthContext\.tsx$/,
        /\/contexts\/LoadingContext\.tsx$/,
      ],
    }),

    VitePWA({
      // SW is registered manually via usePwa() hook — no auto-injection.
      registerType:   'prompt',
      injectRegister: null,

      // Use our generated frontend/public/manifest.json as-is.
      manifest: false,

      workbox: {
        clientsClaim: true, // SW claims open pages immediately on activation
        
        // Precache all built static assets.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],

        // SPA fallback for navigation requests that don't match a precached
        // asset — but never for API or upload paths.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],

        runtimeCaching: [

          // ── 1. NEVER CACHE: specific performance detail, seat map, booking ──
          // Seat availability changes continuously — stale data would let a
          // user see a seat as free when it's already been booked.
          {
            urlPattern: ({ url }) =>
              /^\/api\/v\d+\/events\/[^/]+\/performances\//.test(url.pathname),
            handler: 'NetworkOnly',
          },

          // ── 2. NEVER CACHE: uploads ────────────────────────────────────────
          // User-uploaded posters and images are mutable — the same URL can
          // serve different content after an update.
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'NetworkOnly',
          },

          // ── 3. Events metadata (NOT performances/:id subtree) ──────────────
          // Covers:
          //   /api/v*/events
          //   /api/v*/events/:id
          //   /api/v*/events/:id/performances  (list — dates/times, safe to cache)
          // Rule 1 above catches anything deeper, so this only sees safe URLs.
          {
            urlPattern: ({ url }) =>
              /^\/api\/v\d+\/events/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-events',
              expiration: {
                maxEntries:    50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── 4. Theaters ────────────────────────────────────────────────────
          {
            urlPattern: ({ url }) =>
              /^\/api\/v\d+\/theaters/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-theaters',
              expiration: {
                maxEntries:    30,
                maxAgeSeconds: 60 * 60, // 1 hour — rarely changes
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── 5. Layouts ─────────────────────────────────────────────────────
          {
            urlPattern: ({ url }) =>
              /^\/api\/v\d+\/layouts/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-layouts',
              expiration: {
                maxEntries:    30,
                maxAgeSeconds: 60 * 60, // 1 hour — seat layouts are stable
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── 6. Users ───────────────────────────────────────────────────────
          {
            urlPattern: ({ url }) =>
              /^\/api\/v\d+\/users/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-users',
              expiration: {
                maxEntries:    20,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── 7. /api/ catch-all ─────────────────────────────────────────────
          // Any API route not matched above (e.g. a new endpoint you add later)
          // goes NetworkOnly rather than accidentally getting cached.
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },

          // ── 8. PWA icons ───────────────────────────────────────────────────
          // Versioned by filename — safe to cache for a long time.
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/icons/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pwa-icons',
              expiration: {
                maxEntries:    30,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
            },
          },

          // ── 9. Fonts ───────────────────────────────────────────────────────
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: {
                maxEntries:    10,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // Enable only when actively testing PWA behaviour — interferes with HMR.
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    preserveSymlinks: true, // shared/ is a symlink
  },

  optimizeDeps: {
    include: ['@emotion/react', '@emotion/styled'],
  },

  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
