import { defineConfig, type Plugin } from 'vite'
import { pathToFileURL, fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** Serve /api/book-lookup and /api/admin-unlock in local vite. */
function shelfieDevApi(): Plugin {
  return {
    name: 'shelfie-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          next()
          return
        }

        if (req.url.startsWith('/api/admin-unlock')) {
          try {
            const apiPath = fileURLToPath(
              new URL('./api/admin-unlock.mjs', import.meta.url),
            )
            const mod = (await import(
              `${pathToFileURL(apiPath).href}?t=${Date.now()}`
            )) as {
              unlockWithPassword: (password: string) => {
                ok: boolean
                token?: string
                expiresAt?: number
                error?: string
              }
            }
            let body = ''
            await new Promise<void>((resolve) => {
              req.on('data', (chunk: Buffer) => {
                body += chunk.toString()
              })
              req.on('end', () => resolve())
            })
            let password = ''
            try {
              password = String(JSON.parse(body || '{}').password ?? '')
            } catch {
              password = ''
            }
            const result = mod.unlockWithPassword(password)
            res.setHeader('Content-Type', 'application/json')
            if (!result.ok) {
              res.statusCode = result.error?.includes('not configured')
                ? 503
                : 401
              res.end(JSON.stringify({ error: result.error }))
              return
            }
            res.statusCode = 200
            res.end(
              JSON.stringify({
                token: result.token,
                expiresAt: result.expiresAt,
              }),
            )
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error: err instanceof Error ? err.message : 'Unlock failed',
              }),
            )
          }
          return
        }

        if (!req.url.startsWith('/api/book-lookup')) {
          next()
          return
        }
        try {
          const url = new URL(req.url, 'http://localhost')
          const isbn = url.searchParams.get('isbn') ?? ''
          const apiPath = fileURLToPath(
            new URL('./api/book-lookup.mjs', import.meta.url),
          )
          const mod = (await import(
            `${pathToFileURL(apiPath).href}?t=${Date.now()}`
          )) as {
            lookupIsbnServer: (
              isbn: string,
            ) => Promise<Record<string, unknown> | null>
          }
          const result = await mod.lookupIsbnServer(isbn)
          res.setHeader('Content-Type', 'application/json')
          if (!result) {
            res.statusCode = 404
            res.end(JSON.stringify({ error: 'Not found' }))
            return
          }
          if (result.error === 'japanese_classification_code') {
            res.statusCode = 422
            res.end(JSON.stringify(result))
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
    shelfieDevApi(),
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
        // Allow phone + desktop install (portrait-only can block desktop PWAs).
        orientation: 'any',
        start_url: '/',
        scope: '/',
        categories: ['books', 'productivity', 'utilities'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
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
      // Enable SW in `vite preview` / production; keep off during HMR.
      devOptions: { enabled: false },
    }),
  ],
})
