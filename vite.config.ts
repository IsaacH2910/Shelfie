import { defineConfig, type Plugin } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** Serve /api/book-lookup in local vite so Chinese ISBN lookup works off Vercel. */
function bookLookupDevApi(): Plugin {
  return {
    name: 'shelfie-book-lookup-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/book-lookup')) {
          next()
          return
        }
        try {
          const url = new URL(req.url, 'http://localhost')
          const isbn = url.searchParams.get('isbn') ?? ''
          const { lookupIsbnServer } = await server.ssrLoadModule(
            '/api/_lib/isbnLookup.ts',
          )
          const result = await lookupIsbnServer(isbn)
          res.setHeader('Content-Type', 'application/json')
          if (!result) {
            res.statusCode = 404
            res.end(JSON.stringify({ error: 'Not found' }))
            return
          }
          res.statusCode = 200
          res.end(JSON.stringify(result))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Lookup failed',
            }),
          )
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Expose on the local network so other devices (your phone) can open it.
    host: true,
  },
  plugins: [
    react(),
    bookLookupDevApi(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Shelfie — Book Library',
        short_name: 'Shelfie',
        description:
          'Catalog the books you own. Scan, organize by shelf, and never buy a duplicate again.',
        theme_color: '#4f46e5',
        background_color: '#faf9f7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Cover thumbnails from Google Books / Open Library
            urlPattern: ({ url }) =>
              url.hostname.includes('books.google') ||
              url.hostname.includes('googleusercontent') ||
              url.hostname.includes('covers.openlibrary.org'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'book-covers',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase-hosted cover uploads
            urlPattern: ({ url }) => url.pathname.includes('/storage/v1/object'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-covers',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
