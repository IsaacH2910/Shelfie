/**
 * Best-effort in-memory rate limiting for Vercel serverless / Vite middleware.
 * Per-instance only — still reduces abuse and protects against brute force.
 */

/** @type {Map<string, { start: number, count: number }>} */
const windows = new Map()

/** @type {Map<string, { fails: number, lockedUntil: number }>} */
const lockouts = new Map()

const MAX_BUCKETS = 5000

function prune(map, now) {
  if (map.size < MAX_BUCKETS) return
  for (const [key, value] of map) {
    const expired =
      ('lockedUntil' in value && value.lockedUntil < now) ||
      ('start' in value && now - value.start > 60 * 60 * 1000)
    if (expired) map.delete(key)
    if (map.size < MAX_BUCKETS / 2) break
  }
}

/**
 * Sliding fixed-window counter.
 * @param {{ key: string, limit: number, windowMs: number }} opts
 * @returns {{ ok: true } | { ok: false, retryAfterSec: number }}
 */
export function rateLimit({ key, limit, windowMs }) {
  const now = Date.now()
  prune(windows, now)
  let entry = windows.get(key)
  if (!entry || now - entry.start >= windowMs) {
    entry = { start: now, count: 0 }
    windows.set(key, entry)
  }
  entry.count += 1
  if (entry.count > limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(
        1,
        Math.ceil((windowMs - (now - entry.start)) / 1000),
      ),
    }
  }
  return { ok: true }
}

/**
 * @param {import('http').IncomingMessage} req
 */
export function clientKey(req) {
  const xf = req.headers?.['x-forwarded-for']
  if (typeof xf === 'string' && xf.trim()) {
    return xf.split(',')[0].trim()
  }
  const real = req.headers?.['x-real-ip']
  if (typeof real === 'string' && real.trim()) return real.trim()
  return req.socket?.remoteAddress || 'unknown'
}

/**
 * @param {string} key
 * @returns {{ locked: true, retryAfterSec: number } | { locked: false }}
 */
export function checkLockout(key) {
  const now = Date.now()
  const entry = lockouts.get(key)
  if (entry?.lockedUntil && entry.lockedUntil > now) {
    return {
      locked: true,
      retryAfterSec: Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000)),
    }
  }
  return { locked: false }
}

/**
 * @param {string} key
 * @param {{ maxFails?: number, lockMs?: number }} [opts]
 */
export function recordAuthFailure(
  key,
  { maxFails = 5, lockMs = 15 * 60 * 1000 } = {},
) {
  const now = Date.now()
  prune(lockouts, now)
  const entry = lockouts.get(key) ?? { fails: 0, lockedUntil: 0 }
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    entry.fails = 0
    entry.lockedUntil = 0
  }
  entry.fails += 1
  if (entry.fails >= maxFails) {
    entry.lockedUntil = now + lockMs
    entry.fails = 0
  }
  lockouts.set(key, entry)
  return entry.lockedUntil > now
    ? {
        locked: true,
        retryAfterSec: Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000)),
      }
    : { locked: false, fails: entry.fails, remaining: maxFails - entry.fails }
}

/** @param {string} key */
export function clearAuthFailures(key) {
  lockouts.delete(key)
}
