import { normalizeText } from '@/lib/duplicates'
import type { Book } from '@/types'

const SERIES_PATTERNS = [
  /^(.*?)\s*[:(]\s*(?:book|vol\.?|volume|#)?\s*(\d+)\s*\)?$/i,
  /^(.*?)\s+book\s+(\d+)\b/i,
  /^(.*?)\s+#(\d+)\b/i,
  /^(.*?)\s+(\d+)\s*$/i,
]

/** Infer series name + number from a title when series field is empty. */
export function detectSeriesFromTitle(
  title: string,
): { series: string; number: number | null } | null {
  const trimmed = title.trim()
  if (!trimmed) return null
  for (const pattern of SERIES_PATTERNS) {
    const match = trimmed.match(pattern)
    if (!match?.[1]) continue
    const series = match[1].replace(/[-–—:]+$/, '').trim()
    if (series.length < 2 || series.length > 80) continue
    // Avoid treating lone short titles as series
    if (normalizeText(series) === normalizeText(trimmed)) continue
    const number = match[2] ? Number(match[2]) : null
    if (number != null && (number < 1 || number > 200)) continue
    return { series, number: Number.isFinite(number) ? number : null }
  }
  return null
}

export function groupBySeries(books: Book[]): {
  series: string
  books: Book[]
}[] {
  const map = new Map<string, Book[]>()
  for (const book of books) {
    const explicit = book.series?.trim()
    const detected = explicit
      ? { series: explicit.split(/[#:]/)[0].trim(), number: null }
      : detectSeriesFromTitle(book.title)
    if (!detected?.series) continue
    const key = detected.series.toLowerCase()
    const list = map.get(key) ?? []
    list.push(book)
    map.set(key, list)
  }
  return [...map.entries()]
    .map(([_, list]) => ({
      series: list[0].series?.trim() || detectSeriesFromTitle(list[0].title)?.series || 'Series',
      books: list.sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .filter((g) => g.books.length >= 2)
    .sort((a, b) => b.books.length - a.books.length)
}

/** Suggest filling empty series fields from title patterns. */
export function suggestSeriesFills(books: Book[]): {
  id: string
  title: string
  series: string
}[] {
  const out: { id: string; title: string; series: string }[] = []
  for (const book of books) {
    if (book.series?.trim()) continue
    const detected = detectSeriesFromTitle(book.title)
    if (!detected) continue
    out.push({
      id: book.id,
      title: book.title,
      series: detected.number
        ? `${detected.series} #${detected.number}`
        : detected.series,
    })
  }
  return out
}
