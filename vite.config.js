import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    drop: ['console', 'debugger'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://backendcartelera-production-a48a.up.railway.app/',
        changeOrigin: true,
      }
    }
  }
})
