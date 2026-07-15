import type { Book, BookDraft, Ownership } from '@/types'
import { normalizeOwnership } from '@/lib/ownership'
import { normalizeCategories } from '@/lib/categories'
import { normalizeReadingStatus } from '@/lib/reading'

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      cells.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur)
  return cells
}

export function booksToCsv(books: Book[]): string {
  const headers = [
    'Title',
    'Author',
    'ISBN',
    'Language',
    'Shelf',
    'Categories',
    'Collections',
    'Ownership',
    'Reading Status',
    'Rating',
    'Page Count',
    'Current Page',
    'Series',
    'Publisher',
    'Year',
    'Review',
    'Notes',
    'Favorite',
  ]
  const rows = books.map((b) =>
    [
      b.title,
      b.author ?? '',
      b.isbn ?? '',
      b.language ?? '',
      b.shelf_location ?? '',
      (b.categories ?? []).join('; '),
      (b.collections ?? []).join('; '),
      b.ownership ?? 'owned',
      b.reading_status ?? 'unread',
      b.rating != null ? String(b.rating) : '',
      b.page_count != null ? String(b.page_count) : '',
      b.current_page != null ? String(b.current_page) : '',
      b.series ?? '',
      b.publisher ?? '',
      b.published_year != null ? String(b.published_year) : '',
      b.review ?? '',
      b.notes ?? '',
      b.is_favorite ? 'yes' : '',
    ]
      .map(csvEscape)
      .join(','),
  )
  return [headers.join(','), ...rows].join('\n')
}

export function booksToJson(books: Book[]): string {
  return JSON.stringify(books, null, 2)
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function emptyDraft(): BookDraft {
  return {
    title: '',
    author: '',
    isbn: '',
    language: '',
    shelf_location: '',
    categories: [],
    collections: [],
    notes: '',
    review: '',
    cover_url: null,
    source: 'manual',
    scope: 'private',
    household_id: null,
    reading_status: 'unread',
    rating: null,
    page_count: null,
    current_page: null,
    reading_started_at: null,
    reading_finished_at: null,
    ownership: 'owned',
    is_favorite: false,
    series: '',
    publisher: '',
    published_year: null,
  }
}

function cell(map: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const found = Object.entries(map).find(
      ([k]) => k.toLowerCase() === key.toLowerCase(),
    )
    if (found?.[1]) return found[1].trim()
  }
  return ''
}

/** Parse Shelfie CSV or Goodreads-like export into drafts. */
export function parseImportCsv(text: string): BookDraft[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map((h) => h.trim())
  const drafts: BookDraft[] = []

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line)
    const map: Record<string, string> = {}
    headers.forEach((h, i) => {
      map[h] = values[i] ?? ''
    })

    const title = cell(map, 'Title', 'Book Title')
    if (!title) continue

    const draft = emptyDraft()
    draft.title = title
    draft.author = cell(map, 'Author', 'Author l-f', 'Additional Authors')
    draft.isbn = cell(map, 'ISBN', 'ISBN13', 'ISBN 13').replace(/[^0-9Xx]/g, '')
    draft.language = cell(map, 'Language')
    draft.shelf_location = cell(map, 'Shelf', 'Shelf location', 'Bookshelf')
    draft.categories = normalizeCategories(
      cell(map, 'Categories', 'Bookshelves', 'Tags')
        .split(/[;|,]/)
        .map((s) => s.trim()),
    )
    draft.collections = normalizeCategories(
      cell(map, 'Collections').split(/[;|,]/).map((s) => s.trim()),
    )
    draft.ownership = normalizeOwnership(
      cell(map, 'Ownership') ||
        (cell(map, 'Exclusive Shelf').toLowerCase().includes('to-read')
          ? 'wishlist'
          : 'owned'),
    ) as Ownership
    const exclusive = cell(map, 'Exclusive Shelf').toLowerCase()
    if (exclusive.includes('read')) draft.reading_status = 'finished'
    else if (exclusive.includes('currently-reading'))
      draft.reading_status = 'reading'
    else
      draft.reading_status = normalizeReadingStatus(
        cell(map, 'Reading Status', 'Status'),
      )
    const ratingRaw = cell(map, 'Rating', 'My Rating')
    draft.rating = ratingRaw ? Number(ratingRaw) || null : null
    if (draft.rating && draft.rating > 5) draft.rating = draft.rating / 2
    const pages = cell(map, 'Page Count', 'Number of Pages')
    draft.page_count = pages ? Number(pages) || null : null
    draft.series = cell(map, 'Series')
    draft.publisher = cell(map, 'Publisher')
    const year = cell(map, 'Year', 'Published Year', 'Year Published')
    draft.published_year = year ? Number(year) || null : null
    draft.review = cell(map, 'Review', 'My Review')
    draft.notes = cell(map, 'Notes', 'Private Notes')
    draft.is_favorite =
      cell(map, 'Favorite', 'Favourites').toLowerCase() === 'yes' ||
      draft.categories.some((c) => c.toLowerCase() === 'favorites')
    drafts.push(draft)
  }

  return drafts
}

export function parseImportJson(text: string): BookDraft[] {
  const data = JSON.parse(text) as unknown
  if (!Array.isArray(data)) return []
  return data
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const title = String(row.title ?? '').trim()
      if (!title) return null
      const draft = emptyDraft()
      draft.title = title
      draft.author = String(row.author ?? '')
      draft.isbn = String(row.isbn ?? '')
      draft.language = String(row.language ?? '')
      draft.shelf_location = String(row.shelf_location ?? '')
      draft.categories = normalizeCategories(
        Array.isArray(row.categories) ? row.categories.map(String) : [],
      )
      draft.collections = normalizeCategories(
        Array.isArray(row.collections) ? row.collections.map(String) : [],
      )
      draft.ownership = normalizeOwnership(String(row.ownership ?? 'owned'))
      draft.reading_status = normalizeReadingStatus(
        String(row.reading_status ?? 'unread'),
      )
      draft.rating =
        row.rating == null || row.rating === '' ? null : Number(row.rating)
      draft.page_count =
        row.page_count == null || row.page_count === ''
          ? null
          : Number(row.page_count)
      draft.current_page =
        row.current_page == null || row.current_page === ''
          ? null
          : Number(row.current_page)
      draft.series = String(row.series ?? '')
      draft.publisher = String(row.publisher ?? '')
      draft.published_year =
        row.published_year == null || row.published_year === ''
          ? null
          : Number(row.published_year)
      draft.review = String(row.review ?? '')
      draft.notes = String(row.notes ?? '')
      draft.is_favorite = Boolean(row.is_favorite)
      draft.cover_url =
        typeof row.cover_url === 'string' ? row.cover_url : null
      return draft
    })
    .filter((d): d is BookDraft => !!d)
}
