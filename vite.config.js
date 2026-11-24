import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',          // มีเวอร์ชันใหม่ -> อัปเดตเองตอนเปิดแอปครั้งถัดไป
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-64.png'],
      manifest: {
        name: 'ทะเบียนอุปกรณ์สถานี',
        short_name: 'อุปกรณ์สถานี',
        description: 'ระบบเก็บและค้นหาข้อมูลอุปกรณ์ในสถานีผลิตน้ำ',
        lang: 'th',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#0e2a47',
        background_color: '#f4f6f8',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/__ping/],   // ให้ worker ตอบเอง
        runtimeCaching: [
          { // ฟอนต์ Google
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          { // รูปอุปกรณ์ (ชื่อไฟล์ไม่ซ้ำ จึงแคชได้ยาว)
            urlPattern: /\/storage\/v1\/object\/public\/equipment-photos\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'equipment-photos', expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
        ],
      },
    }),
  ],
  base: './',
})
