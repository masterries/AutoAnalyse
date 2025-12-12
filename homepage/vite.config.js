import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/AutoAnalyse/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  optimizeDeps: {
    exclude: ['sql.js']
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
})
