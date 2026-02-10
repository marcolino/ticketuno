import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      // Suppress Fast Refresh warnings for specific files
      exclude: [
        /\/contexts\/AuthContext\.tsx$/,
        /\/contexts\/LoadingContext\.tsx$/
      ]
    })
  ],
  resolve: {
    // alias: {
    //   '../../../shared': path.resolve(__dirname, '../shared')
    // },
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    preserveSymlinks: true, // We use symlinks to /shared
  },
  optimizeDeps: {
    include: ['@emotion/react', '@emotion/styled'],
  },
  server: {
    port: 3000, // Match CRA port
    open: false, // Opens browser on start
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3001',
      }
    }
  }
})
