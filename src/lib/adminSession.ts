/**
 * Client-side admin session helpers.
 * Unlock uses username `admin` + server ADMIN_PASSWORD — never a client secret.
 */

const STORAGE_KEY = 'shelfie_admin_token'

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setAdminToken(token: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, token)
  } catch {
    /* ignore */
  }
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Lightweight client check: token has exp.nonce.sig and is not expired. */
export function isAdminSessionValid(
  token: string | null = getAdminToken(),
): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const exp = Number(parts[0])
  if (!Number.isFinite(exp) || exp < Date.now()) {
    clearAdminToken()
    return false
  }
  return parts[1].length > 0 && parts[2].length > 0
}

/** Unlock admin tools with account `admin` + ADMIN_PASSWORD (verified server-side). */
export async function unlockAdminWithPassword(
  username: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin-unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = (await res.json()) as { token?: string; error?: string }
    if (!res.ok || !data.token) {
      clearAdminToken()
      return { ok: false, error: data.error ?? 'Not authorized' }
    }
    setAdminToken(data.token)
    return { ok: true }
  } catch {
    return {
      ok: false,
      error: 'Could not reach admin unlock. Is the server running?',
    }
  }
}
