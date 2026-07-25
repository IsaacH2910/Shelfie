/**
 * Admin unlock — username `admin` + ADMIN_PASSWORD (server env only).
 * Never expose ADMIN_PASSWORD as VITE_* — it must not ship in the client bundle.
 */

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'
import { applyCors } from './cors.mjs'
import {
  checkLockout,
  clearAuthFailures,
  clientKey,
  rateLimit,
  recordAuthFailure,
} from './rateLimit.mjs'

const TTL_MS = 1000 * 60 * 60 * 8 // 8 hours
const ADMIN_USERNAME = 'admin'
const MAX_BODY_BYTES = 4096

function getPassword() {
  return process.env.ADMIN_PASSWORD ?? ''
}

function getSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'shelfie-dev-insecure'
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

/**
 * Unlock with account name `admin` and ADMIN_PASSWORD from env.
 * @param {string} username
 * @param {string} password
 */
export function unlockWithPassword(username, password) {
  const expected = getPassword()
  if (!expected) {
    return { ok: false, error: 'Admin is not configured on this server.' }
  }
  const user = String(username ?? '')
    .trim()
    .toLowerCase()
  if (user !== ADMIN_USERNAME) {
    return { ok: false, error: 'Invalid account or password.' }
  }
  if (!safeEqual(password ?? '', expected)) {
    return { ok: false, error: 'Invalid account or password.' }
  }
  return {
    ok: true,
    token: createAdminToken(),
    expiresAt: Date.now() + TTL_MS,
  }
}

/**
 * Shared gate used by Vercel handler and Vite middleware.
 * @param {import('http').IncomingMessage} req
 * @param {string} username
 * @param {string} password
 */
export function attemptAdminUnlock(req, username, password) {
  const ip = clientKey(req)
  const lockKey = `admin-lock:${ip}`
  const rateKey = `admin-rate:${ip}`

  const locked = checkLockout(lockKey)
  if (locked.locked) {
    return {
      ok: false,
      status: 429,
      error: `Too many failed attempts. Try again in ${locked.retryAfterSec}s.`,
      retryAfterSec: locked.retryAfterSec,
    }
  }

  const limited = rateLimit({ key: rateKey, limit: 20, windowMs: 60_000 })
  if (!limited.ok) {
    return {
      ok: false,
      status: 429,
      error: `Too many requests. Try again in ${limited.retryAfterSec}s.`,
      retryAfterSec: limited.retryAfterSec,
    }
  }

  const result = unlockWithPassword(username, password)
  if (!result.ok) {
    const fail = recordAuthFailure(lockKey)
    if (fail.locked) {
      return {
        ok: false,
        status: 429,
        error: `Too many failed attempts. Try again in ${fail.retryAfterSec}s.`,
        retryAfterSec: fail.retryAfterSec,
      }
    }
    return {
      ok: false,
      status: result.error?.includes('not configured') ? 503 : 401,
      error: result.error,
    }
  }

  clearAuthFailures(lockKey)
  return {
    ok: true,
    status: 200,
    token: result.token,
    expiresAt: result.expiresAt,
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')

  if (!applyCors(req, res, { methods: 'POST, OPTIONS' })) {
    res.statusCode = 403
    res.end(JSON.stringify({ error: 'Origin not allowed' }))
    return
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

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

  if (
    body.username === undefined &&
    body.password === undefined &&
    !req.body
  ) {
    body = await readJson(req)
  }

  const result = attemptAdminUnlock(req, body.username, body.password)
  if (result.retryAfterSec) {
    res.setHeader('Retry-After', String(result.retryAfterSec))
  }
  if (!result.ok) {
    res.statusCode = result.status
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
    let oversized = false
    req.on('data', (chunk) => {
      if (oversized) return
      raw += chunk
      if (raw.length > MAX_BODY_BYTES) {
        oversized = true
        raw = ''
      }
    })
    req.on('end', () => {
      if (oversized) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw || '{}'))
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}
