export const READING_STATUSES = [
  'unread',
  'reading',
  'finished',
  'paused',
  'dropped',
  'rereading',
] as const

export type ReadingStatus = (typeof READING_STATUSES)[number]

export const READING_STATUS_META: Record<
  ReadingStatus,
  {
    label: string
    short: string
    badge: 'muted' | 'default' | 'success' | 'warning' | 'secondary' | 'outline'
  }
> = {
  unread: { label: 'Unread', short: 'Unread', badge: 'muted' },
  reading: { label: 'Reading', short: 'Reading', badge: 'default' },
  finished: { label: 'Finished', short: 'Done', badge: 'success' },
  paused: { label: 'Paused', short: 'Paused', badge: 'warning' },
  dropped: { label: 'Dropped', short: 'Dropped', badge: 'secondary' },
  rereading: { label: 'Re-reading', short: 'Re-reading', badge: 'default' },
}

export function isReadingStatus(
  value: string | null | undefined,
): value is ReadingStatus {
  return !!value && (READING_STATUSES as readonly string[]).includes(value)
}

export function normalizeReadingStatus(
  value: string | null | undefined,
): ReadingStatus {
  return isReadingStatus(value) ? value : 'unread'
}

/** Clamp rating to half-star steps between 0.5 and 5, or null. */
export function normalizeRating(
  raw: number | string | null | undefined,
): number | null {
  if (raw == null || raw === '') return null
  const n = typeof raw === 'string' ? Number(raw) : raw
  if (Number.isNaN(n) || n <= 0) return null
  return Math.round(Math.min(5, Math.max(0.5, n)) * 2) / 2
}

export function progressPercent(
  currentPage: number | null | undefined,
  pageCount: number | null | undefined,
): number | null {
  if (!pageCount || pageCount <= 0) return null
  if (currentPage == null || currentPage < 0) return null
  return Math.min(100, Math.round((currentPage / pageCount) * 100))
}

export function formatProgress(
  currentPage: number | null | undefined,
  pageCount: number | null | undefined,
): string | null {
  const pct = progressPercent(currentPage, pageCount)
  if (currentPage != null && pageCount != null && pageCount > 0) {
    return `Page ${currentPage} / ${pageCount}${pct != null ? ` · ${pct}%` : ''}`
  }
  if (pct != null) return `${pct}%`
  if (currentPage != null && currentPage > 0) return `Page ${currentPage}`
  return null
}

/** When status changes, stamp started/finished timestamps if missing. */
export function readingTimestampsForStatus(
  status: ReadingStatus,
  existing: {
    reading_started_at?: string | null
    reading_finished_at?: string | null
  },
): {
  reading_started_at: string | null
  reading_finished_at: string | null
} {
  const now = new Date().toISOString()
  let started = existing.reading_started_at ?? null
  let finished = existing.reading_finished_at ?? null

  if (
    (status === 'reading' ||
      status === 'rereading' ||
      status === 'finished') &&
    !started
  ) {
    started = now
  }
  if (status === 'finished' && !finished) {
    finished = now
  }
  if (status === 'unread') {
    started = null
    finished = null
  }

  return { reading_started_at: started, reading_finished_at: finished }
}
