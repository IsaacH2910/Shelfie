/** Query roots that must reflect live server state when the browser is online. */
export const SERVER_QUERY_ROOTS = [
  'books',
  'households',
  'household-members',
  'household-invites',
  'profile',
] as const

export function isServerBackedQueryKey(key: readonly unknown[]): boolean {
  const root = key[0]
  return (
    typeof root === 'string' &&
    (SERVER_QUERY_ROOTS as readonly string[]).includes(root)
  )
}

/** True when the browser has no network (airplane mode, etc.). */
export function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine
}

/** True when a fetch failed because the backend is unreachable. */
export function isBackendUnreachable(error: unknown): boolean {
  if (!error) return false

  const parts: string[] = []
  if (error instanceof Error) {
    parts.push(error.message, error.name)
  }
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>
    if (typeof record.message === 'string') parts.push(record.message)
    if (typeof record.details === 'string') parts.push(record.details)
    if (typeof record.code === 'string') parts.push(record.code)
  }
  parts.push(String(error))

  const lower = parts.join(' ').toLowerCase()
  return (
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('connection refused') ||
    lower.includes('econnrefused') ||
    lower.includes('err_connection_refused') ||
    lower.includes('could not connect') ||
    lower.includes('network error')
  )
}

/** Offline cache is only valid when the device itself has no connectivity. */
export function shouldUseOfflineCache(): boolean {
  return isBrowserOffline()
}
