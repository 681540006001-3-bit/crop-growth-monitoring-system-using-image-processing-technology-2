import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://crop-growth-backend.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/static': {
        target: 'https://crop-growth-backend.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})