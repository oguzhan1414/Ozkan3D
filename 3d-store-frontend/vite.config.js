import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
    // Lokal geliştirme: /api istekleri backend'e (npm run dev:api) gider.
    // Production'da Vercel aynı domainde /api'yi serverless function'a yönlendirir.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
