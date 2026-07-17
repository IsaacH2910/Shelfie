/**
 * Admin unlock — allow only the signed-in email listed in ADMIN_EMAIL.
 * Client sends Supabase access_token; no password UI.
 * Never expose ADMIN_EMAIL as the only check without verifying the JWT.
 */

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'

const TTL_MS = 1000 * 60 * 60 * 8 // 8 hours

function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL ?? '')
    .trim()
    .toLowerCase()
}

function getSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_EMAIL ||
    'shelfie-dev-insecure'
  )
}

function getSupabaseUrl() {
  return process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
}

function getSupabaseAnonKey() {
  return (
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  )
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  if (bufA.length !== bufB.length) {
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

export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [expStr, nonce, sig] = parts
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < Date.now()) return false
  if (!nonce || !sig) return false
  const payload = `${expStr}.${nonce}`
  const expected = createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex')
  try {
    return safeEqual(sig, expected)
  } catch {
    return false
  }
}

async function emailFromAccessToken(accessToken) {
  const url = getSupabaseUrl()
  const anon = getSupabaseAnonKey()
  if (!url || !anon || !accessToken) return null
  const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anon,
    },
  })
  if (!res.ok) return null
  const data = await res.json()
  return typeof data?.email === 'string' ? data.email.trim().toLowerCase() : null
}

export async function unlockWithAccessToken(accessToken) {
  const adminEmail = getAdminEmail()
  if (!adminEmail) {
    return { ok: false, error: 'Admin is not configured on this server.' }
  }
  const email = await emailFromAccessToken(accessToken)
  if (!email) {
    return { ok: false, error: 'Could not verify your session.' }
  }
  if (email !== adminEmail) {
    return { ok: false, error: 'Not authorized.' }
  }
  return {
    ok: true,
    token: createAdminToken(),
    expiresAt: Date.now() + TTL_MS,
  }
}

/** @deprecated password unlock removed — kept for typing in vite middleware */
export async function unlockWithPassword() {
  return { ok: false, error: 'Use session unlock.' }
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

  if (!body.accessToken && req.method === 'POST' && !req.body) {
    body = await readJson(req)
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization
  const bearer =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : ''
  const accessToken = body.accessToken || bearer

  const result = await unlockWithAccessToken(accessToken)
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
