/**
 * Restrict CORS to the Shelfie web app, local/dev hosts, and Tauri webviews.
 * Requests with no Origin (same-origin, curl, server) are allowed through.
 */

const STATIC_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'tauri://localhost',
  'https://tauri.localhost',
  'http://tauri.localhost',
])

function configuredOrigins() {
  const origins = new Set(STATIC_ORIGINS)
  for (const raw of [
    process.env.VITE_PUBLIC_APP_URL,
    process.env.CORS_ALLOWED_ORIGIN,
  ]) {
    if (!raw) continue
    try {
      origins.add(new URL(raw).origin)
    } catch {
      /* ignore invalid */
    }
  }
  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`)
  }
  return origins
}

/** Allow phone-on-LAN Vite / preview during local development. */
function isPrivateNetworkOrigin(origin) {
  try {
    const { protocol, hostname } = new URL(origin)
    if (protocol !== 'http:' && protocol !== 'https:') return false
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * @param {string | undefined} origin
 */
export function isOriginAllowed(origin) {
  if (!origin) return true
  if (configuredOrigins().has(origin)) return true
  if (isPrivateNetworkOrigin(origin)) return true
  return false
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ methods: string }} opts
 * @returns {boolean} false when Origin is present and not allowed
 */
export function applyCors(req, res, { methods }) {
  const origin = req.headers?.origin
  if (!origin) return true
  if (!isOriginAllowed(origin)) return false
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')
  return true
}
