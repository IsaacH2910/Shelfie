const KEY = 'shelfie-crash-log'
const MAX = 40

export type CrashEntry = {
  id: string
  at: string
  message: string
  stack?: string
  componentStack?: string
  href?: string
  userAgent?: string
}

export function readCrashLog(): CrashEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CrashEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function logCrash(entry: Omit<CrashEntry, 'id' | 'at'>): CrashEntry {
  const full: CrashEntry = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    href: typeof location !== 'undefined' ? location.href : undefined,
    userAgent:
      typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    ...entry,
  }
  const next = [full, ...readCrashLog()].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore quota
  }
  return full
}

export function clearCrashLog() {
  localStorage.removeItem(KEY)
}

export function installGlobalCrashHandlers() {
  if (typeof window === 'undefined') return () => {}
  const onError = (event: ErrorEvent) => {
    logCrash({
      message: event.message || 'Unhandled error',
      stack: event.error instanceof Error ? event.error.stack : undefined,
    })
  }
  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason
    logCrash({
      message:
        reason instanceof Error
          ? reason.message
          : `Unhandled rejection: ${String(reason)}`,
      stack: reason instanceof Error ? reason.stack : undefined,
    })
  }
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}
