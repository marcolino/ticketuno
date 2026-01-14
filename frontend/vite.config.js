import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  optimizeDeps: {
    include: ['@emotion/react', '@emotion/styled'],
  },
  server: {
    port: 3000, // Match your CRA port
    open: true, // Opens browser on start
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
