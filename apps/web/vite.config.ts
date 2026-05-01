import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Diamond Studio',
        short_name: 'Diamond',
        description: 'Reserva tu cita en Diamond Studio',
        theme_color: '#0a0806',
        background_color: '#0a0806',
        display: 'standalone',
        start_url: '/book/diamond-studio',
        scope: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/api\/v1\/bookings\/public\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'bookings-cache' },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
