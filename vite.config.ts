import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Verygood Radio',
        short_name: 'VG Radio',
        description: 'A simple Verygood Chocolate radio player for KIIS FM 102.7.',
        theme_color: '#120f0d',
        background_color: '#120f0d',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://stream.revma.ihrhls.com' || url.origin === 'https://cloud.revma.ihrhls.com',
            handler: 'NetworkOnly',
            options: {
              cacheName: 'live-radio-stream-never-cache',
            },
          },
        ],
      },
    }),
  ],
})
