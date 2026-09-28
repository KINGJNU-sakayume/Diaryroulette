import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/Diaryroulette/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '일기 룰렛',
        short_name: '일기 룰렛',
        description: '매일 룰렛이 정해 주는 방식으로 쓰는 일기',
        lang: 'ko',
        theme_color: '#f6f2ea',
        background_color: '#f6f2ea',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/Diaryroulette/',
        start_url: '/Diaryroulette/#/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 앱 껍데기만 미리 받아 둔다. 한글 글꼴은 글자 범위별로 잘게 나뉜 파일이 수백 개라
        // 전부 미리 받으면 첫 설치에 수십 MB가 든다 → 실제로 쓰인 조각만 그때그때 캐시.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
