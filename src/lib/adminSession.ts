/**
 * Client-side admin session helpers.
 * Unlock uses the signed-in Supabase session — no separate password field.
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

/** Ask the server whether this Supabase session is the configured admin email. */
export async function unlockAdminWithSession(
  accessToken: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin-unlock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ accessToken }),
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
