import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
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
          'vendor-qr': ['jsqr'],
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
      registerType: 'prompt', // SW is registered manually via usePwa() hook - no auto-injection
      injectRegister: null,
      manifest: false, // Use our generated frontend/public/manifest.json as-is
      strategies: 'injectManifest', // Switch from generateSW to injectManifest
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: { // Built files to precache        
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,json}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { // Enable only when actively testing PWA behaviour - interferes with HMR
        enabled: false,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@ticketuno/shared': path.resolve(__dirname, '../packages/shared/src'),
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
    allowedHosts: command === 'serve' ? ['.ngrok-free.app'] : [] // 'serve' is 'dev' for Vite
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'), // TODO: do we need this ???
  },
}));
