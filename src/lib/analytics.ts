import { normalizeLanguageCode } from '@/lib/languages'
import type { Book } from '@/types'

export type LibraryStats = {
  totalOwned: number
  wishlist: number
  wantToBuy: number
  favorites: number
  finished: number
  reading: number
  pagesRead: number
  pagesTotal: number
  avgPages: number
  authors: number
  languages: Record<string, number>
  categories: Record<string, number>
  finishedByMonth: { key: string; label: string; count: number }[]
  addedByMonth: { key: string; label: string; count: number }[]
  topAuthors: { name: string; count: number }[]
  streakDays: number
  finishedThisYear: number
  /** Average pages finished per day across completed books with dates. */
  pagesPerDay: number
  /** Estimated reading speed label, e.g. "42 pages/day". */
  readingSpeedLabel: string
}

function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
    year: '2-digit',
  })
}

function lastNMonths(n: number): string[] {
  const keys: string[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = 0; i < n; i++) {
    keys.unshift(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    )
    d.setMonth(d.getMonth() - 1)
  }
  return keys
}

/** Consecutive days with a finish or progress update ending today/yesterday. */
export function computeReadingStreak(books: Book[]): number {
  const days = new Set<string>()
  for (const book of books) {
    if (book.reading_finished_at) {
      days.add(book.reading_finished_at.slice(0, 10))
    }
    if (book.reading_started_at) {
      days.add(book.reading_started_at.slice(0, 10))
    }
    if (book.updated_at && book.reading_status === 'reading') {
      days.add(book.updated_at.slice(0, 10))
    }
  }
  if (days.size === 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cursor = new Date(today)
  // Allow streak to start from yesterday if nothing today
  const todayKey = cursor.toISOString().slice(0, 10)
  cursor.setDate(cursor.getDate() - 1)
  const yesterdayKey = cursor.toISOString().slice(0, 10)
  if (!days.has(todayKey) && !days.has(yesterdayKey)) return 0

  let streak = 0
  const walk = new Date(today)
  if (!days.has(todayKey)) walk.setDate(walk.getDate() - 1)
  while (true) {
    const key = walk.toISOString().slice(0, 10)
    if (!days.has(key)) break
    streak++
    walk.setDate(walk.getDate() - 1)
  }
  return streak
}

export function computeLibraryStats(books: Book[]): LibraryStats {
  const owned = books.filter((b) => (b.ownership ?? 'owned') === 'owned')
  const wishlist = books.filter((b) => b.ownership === 'wishlist').length
  const wantToBuy = books.filter((b) => b.ownership === 'want_to_buy').length
  const favorites = books.filter((b) => b.is_favorite).length
  const finished = owned.filter((b) => b.reading_status === 'finished')
  const reading = owned.filter(
    (b) => b.reading_status === 'reading' || b.reading_status === 'rereading',
  )

  let pagesRead = 0
  let pagesTotal = 0
  let pageSamples = 0
  for (const book of owned) {
    if (book.page_count) {
      pagesTotal += book.page_count
      pageSamples++
      if (book.reading_status === 'finished') pagesRead += book.page_count
      else if (book.current_page) pagesRead += book.current_page
    }
  }

  const authors = new Set(
    owned.map((b) => b.author?.trim()).filter(Boolean) as string[],
  )

  const languages: Record<string, number> = {}
  for (const book of owned) {
    const code = normalizeLanguageCode(book.language) || 'unknown'
    languages[code] = (languages[code] ?? 0) + 1
  }

  const categories: Record<string, number> = {}
  for (const book of owned) {
    for (const c of book.categories ?? []) {
      categories[c] = (categories[c] ?? 0) + 1
    }
  }

  const months = lastNMonths(12)
  const finishedByMonth = months.map((key) => ({
    key,
    label: monthLabel(key),
    count: finished.filter(
      (b) => b.reading_finished_at && monthKey(b.reading_finished_at) === key,
    ).length,
  }))
  const addedByMonth = months.map((key) => ({
    key,
    label: monthLabel(key),
    count: owned.filter((b) => monthKey(b.created_at) === key).length,
  }))

  const authorCounts: Record<string, number> = {}
  for (const book of owned) {
    const name = book.author?.trim()
    if (!name) continue
    authorCounts[name] = (authorCounts[name] ?? 0) + 1
  }
  const topAuthors = Object.entries(authorCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const year = new Date().getFullYear()
  const finishedThisYear = finished.filter(
    (b) =>
      b.reading_finished_at &&
      new Date(b.reading_finished_at).getFullYear() === year,
  ).length

  let speedSamples = 0
  let speedSum = 0
  for (const book of finished) {
    if (!book.page_count || !book.reading_started_at || !book.reading_finished_at)
      continue
    const start = new Date(book.reading_started_at).getTime()
    const end = new Date(book.reading_finished_at).getTime()
    if (!(end > start)) continue
    const days = Math.max(1, (end - start) / (1000 * 60 * 60 * 24))
    speedSum += book.page_count / days
    speedSamples++
  }
  const pagesPerDay = speedSamples ? Math.round(speedSum / speedSamples) : 0

  return {
    totalOwned: owned.length,
    wishlist,
    wantToBuy,
    favorites,
    finished: finished.length,
    reading: reading.length,
    pagesRead,
    pagesTotal,
    avgPages: pageSamples ? Math.round(pagesTotal / pageSamples) : 0,
    authors: authors.size,
    languages,
    categories,
    finishedByMonth,
    addedByMonth,
    topAuthors,
    streakDays: computeReadingStreak(owned),
    finishedThisYear,
    pagesPerDay,
    readingSpeedLabel: pagesPerDay
      ? `${pagesPerDay} pages/day`
      : 'Not enough data',
  }
}

export type Achievement = {
  id: string
  title: string
  description: string
  unlocked: boolean
}

export function computeAchievements(
  books: Book[],
  stats: LibraryStats,
): Achievement[] {
  const series = new Set(
    books.map((b) => b.series?.trim()).filter(Boolean) as string[],
  )
  return [
    {
      id: 'first-book',
      title: 'First shelf',
      description: 'Add your first book',
      unlocked: stats.totalOwned >= 1,
    },
    {
      id: 'ten-books',
      title: 'Growing library',
      description: 'Own 10 books',
      unlocked: stats.totalOwned >= 10,
    },
    {
      id: 'hundred',
      title: 'Century stack',
      description: 'Own 100 books',
      unlocked: stats.totalOwned >= 100,
    },
    {
      id: 'first-finish',
      title: 'Finisher',
      description: 'Mark a book finished',
      unlocked: stats.finished >= 1,
    },
    {
      id: 'polyglot',
      title: 'Polyglot',
      description: 'Own books in 3+ languages',
      unlocked: Object.keys(stats.languages).length >= 3,
    },
    {
      id: 'streak-7',
      title: 'Week of reading',
      description: '7-day reading streak',
      unlocked: stats.streakDays >= 7,
    },
    {
      id: 'series',
      title: 'Series collector',
      description: 'Track a book series',
      unlocked: series.size >= 1,
    },
    {
      id: 'reviewer',
      title: 'Reviewer',
      description: 'Write a personal review',
      unlocked: books.some((b) => !!b.review?.trim()),
    },
  ]
}

/** Suggest unread owned books using library affinity heuristics. */
export function recommendNext(books: Book[], limit = 5): Book[] {
  const owned = books.filter((b) => (b.ownership ?? 'owned') === 'owned')
  const finished = owned.filter((b) => b.reading_status === 'finished')
  const unread = owned.filter(
    (b) => b.reading_status === 'unread' || b.reading_status === 'paused',
  )
  if (unread.length === 0) return []

  const favAuthors = new Set(
    finished
      .filter((b) => (b.rating ?? 0) >= 4)
      .map((b) => b.author?.trim().toLowerCase())
      .filter(Boolean) as string[],
  )
  const favCats = new Set<string>()
  for (const b of finished.filter((x) => (x.rating ?? 0) >= 4)) {
    for (const c of b.categories ?? []) favCats.add(c.toLowerCase())
  }

  const recentFinished = [...finished]
    .filter((b) => b.reading_finished_at)
    .sort((a, b) =>
      (b.reading_finished_at ?? '').localeCompare(a.reading_finished_at ?? ''),
    )
    .slice(0, 8)
  const favLangs = new Set(
    recentFinished
      .map((b) => (b.language ?? '').toLowerCase())
      .filter(Boolean),
  )
  const avgRecentPages =
    recentFinished.reduce((sum, b) => sum + (b.page_count ?? 0), 0) /
    Math.max(1, recentFinished.filter((b) => b.page_count).length)

  const finishedSeries = new Set(
    finished
      .map((b) => b.series?.trim().toLowerCase())
      .filter(Boolean) as string[],
  )

  const now = Date.now()

  return [...unread]
    .map((book) => {
      let score = 0
      if (book.is_favorite) score += 3
      if (book.author && favAuthors.has(book.author.trim().toLowerCase()))
        score += 4
      for (const c of book.categories ?? []) {
        if (favCats.has(c.toLowerCase())) score += 2
      }
      if (book.series) {
        score += 1
        const key = book.series.trim().toLowerCase()
        if (finishedSeries.has(key)) score += 5
      }
      if (book.language && favLangs.has(book.language.toLowerCase())) {
        score += 2
      }
      if (book.page_count && avgRecentPages > 0) {
        const delta = Math.abs(book.page_count - avgRecentPages)
        if (delta < 100) score += 2
        else if (delta < 200) score += 1
      }
      // Demote long-paused titles that went stale
      if (book.reading_status === 'paused' && book.updated_at) {
        const days =
          (now - new Date(book.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        if (days > 90) score -= 3
        else if (days > 30) score -= 1
      }
      return { book, score }
    })
    .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title))
    .slice(0, limit)
    .map((x) => x.book)
}
