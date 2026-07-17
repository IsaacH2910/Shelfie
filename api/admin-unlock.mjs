/**
 * Admin unlock — server-only password gate.
 * Env: ADMIN_PASSWORD (required), ADMIN_SESSION_SECRET (optional, falls back to password).
 * Never expose these as VITE_* — they must not ship in the client bundle.
 */

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'

const TTL_MS = 1000 * 60 * 60 * 8 // 8 hours

function getPassword() {
  return process.env.ADMIN_PASSWORD ?? ''
}

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || getPassword() || 'shelfie-dev-insecure'
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  if (bufA.length !== bufB.length) {
    // Still run a compare to reduce timing leaks on length
    timingSafeEqual(bufA, Buffer.alloc(bufA.length))
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

export function createAdminToken() {
  const exp = Date.now() + TTL_MS
  const nonce = randomBytes(8).toString('hex')
  const payload = `${exp}.${nonce}`
  const sig = createHmac('sha256', getSecret()).update(payload).digest('hex')
  return `${payload}.${sig}`
}

/** Validate token shape + signature + expiry (usable from client copy of logic is separate). */
export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [expStr, nonce, sig] = parts
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < Date.now()) return false
  if (!nonce || !sig) return false
  const payload = `${expStr}.${nonce}`
  const expected = createHmac('sha256', getSecret()).update(payload).digest('hex')
  try {
    return safeEqual(sig, expected)
  } catch {
    return false
  }
}

export function unlockWithPassword(password) {
  const expected = getPassword()
  if (!expected) {
    return { ok: false, error: 'Admin is not configured on this server.' }
  }
  if (!safeEqual(password ?? '', expected)) {
    return { ok: false, error: 'Incorrect password.' }
  }
  return { ok: true, token: createAdminToken(), expiresAt: Date.now() + TTL_MS }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }
  if (!body || typeof body !== 'object') body = {}

  // Support Node request streams on some runtimes
  if (!body.password && req.method === 'POST' && !req.body) {
    body = await readJson(req)
  }

  const result = unlockWithPassword(body.password)
  if (!result.ok) {
    res.statusCode = result.error?.includes('not configured') ? 503 : 401
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
}

function readJson(req) {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'))
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}
