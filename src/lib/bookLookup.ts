import { normalizeIsbn } from '@/lib/duplicates'
import { normalizeLanguageCode } from '@/lib/languages'

export type LookupResult = {
  title: string
  author: string
  isbn: string
  language: string
  cover_url: string | null
  source: 'google' | 'openlibrary'
}

type GoogleVolume = {
  volumeInfo?: {
    title?: string
    subtitle?: string
    authors?: string[]
    language?: string
    imageLinks?: { thumbnail?: string; smallThumbnail?: string }
    industryIdentifiers?: { type?: string; identifier?: string }[]
  }
}

type GoogleResponse = { items?: GoogleVolume[] }

function httpsCover(url?: string): string | null {
  if (!url) return null
  return url.replace(/^http:\/\//, 'https://')
}

function isbnFromGoogle(volume: GoogleVolume): string {
  const ids = volume.volumeInfo?.industryIdentifiers ?? []
  const isbn13 = ids.find((i) => i.type === 'ISBN_13')?.identifier
  const isbn10 = ids.find((i) => i.type === 'ISBN_10')?.identifier
  return normalizeIsbn(isbn13 ?? isbn10 ?? '')
}

function mapGoogleVolume(volume: GoogleVolume): LookupResult | null {
  const info = volume.volumeInfo
  if (!info?.title) return null
  const title = info.subtitle
    ? `${info.title}: ${info.subtitle}`
    : info.title
  return {
    title,
    author: (info.authors ?? []).join(', '),
    isbn: isbnFromGoogle(volume),
    language: normalizeLanguageCode(info.language),
    cover_url: httpsCover(
      info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail,
    ),
    source: 'google',
  }
}

async function fetchJson<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T | null> {
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function lookupGoogleByIsbn(
  isbn: string,
  signal?: AbortSignal,
): Promise<LookupResult | null> {
  const data = await fetchJson<GoogleResponse>(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`,
    signal,
  )
  const volume = data?.items?.[0]
  if (!volume) return null
  const mapped = mapGoogleVolume(volume)
  if (mapped && !mapped.isbn) mapped.isbn = isbn
  return mapped
}

type OpenLibraryData = Record<
  string,
  {
    title?: string
    authors?: { name?: string }[]
    cover?: { small?: string; medium?: string; large?: string }
    languages?: { key?: string }[]
  }
>

async function lookupOpenLibrary(
  isbn: string,
  signal?: AbortSignal,
): Promise<LookupResult | null> {
  const data = await fetchJson<OpenLibraryData>(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
    signal,
  )
  const entry = data?.[`ISBN:${isbn}`]
  if (!entry?.title) return null
  const langKey = entry.languages?.[0]?.key?.replace('/languages/', '')
  return {
    title: entry.title,
    author: (entry.authors ?? [])
      .map((a) => a.name)
      .filter(Boolean)
      .join(', '),
    isbn,
    language: normalizeLanguageCode(langKey),
    cover_url: httpsCover(entry.cover?.large ?? entry.cover?.medium),
    source: 'openlibrary',
  }
}

/** Prefer the richer primary result, filling any gaps from the secondary. */
function mergeLookups(
  primary: LookupResult,
  secondary: LookupResult | null,
  isbn: string,
): LookupResult {
  return {
    title: primary.title || secondary?.title || '',
    author: primary.author || secondary?.author || '',
    isbn: primary.isbn || secondary?.isbn || isbn,
    language: primary.language || secondary?.language || '',
    cover_url: primary.cover_url ?? secondary?.cover_url ?? null,
    source: primary.source,
  }
}

/**
 * Look up a single book by ISBN. Google Books and Open Library are queried in
 * parallel and merged, so a Google rate-limit (HTTP 429) never blocks the
 * result and richer fields (language, cover) are used when available.
 */
export async function lookupByIsbn(
  rawIsbn: string,
  signal?: AbortSignal,
): Promise<LookupResult | null> {
  const isbn = normalizeIsbn(rawIsbn)
  if (isbn.length < 10) return null
  const [google, openlib] = await Promise.all([
    lookupGoogleByIsbn(isbn, signal),
    lookupOpenLibrary(isbn, signal),
  ])
  if (google) return mergeLookups(google, openlib, isbn)
  if (openlib) return mergeLookups(openlib, null, isbn)
  return null
}

type OpenLibrarySearch = {
  docs?: {
    title?: string
    author_name?: string[]
    cover_i?: number
    language?: string[]
    isbn?: string[]
  }[]
}

async function searchOpenLibrary(
  query: string,
  signal?: AbortSignal,
): Promise<LookupResult[]> {
  const data = await fetchJson<OpenLibrarySearch>(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(
      query,
    )}&limit=8&fields=title,author_name,cover_i,language,isbn`,
    signal,
  )
  if (!data?.docs) return []
  const results: LookupResult[] = []
  const seen = new Set<string>()
  for (const doc of data.docs) {
    if (!doc.title) continue
    const key = `${doc.title}|${doc.author_name?.[0] ?? ''}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    results.push({
      title: doc.title,
      author: (doc.author_name ?? []).join(', '),
      isbn: normalizeIsbn(doc.isbn?.[0] ?? ''),
      language: normalizeLanguageCode(doc.language?.[0]),
      cover_url: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : null,
      source: 'openlibrary',
    })
  }
  return results
}

/**
 * Free-text search (used to resolve OCR'd cover text into real records).
 * Tries Google Books, then falls back to Open Library if it returns nothing
 * (e.g. when Google is rate-limited).
 */
export async function searchBooks(
  query: string,
  signal?: AbortSignal,
): Promise<LookupResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 3) return []
  const data = await fetchJson<GoogleResponse>(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      trimmed,
    )}&maxResults=8`,
    signal,
  )
  const results: LookupResult[] = []
  const seen = new Set<string>()
  for (const volume of data?.items ?? []) {
    const mapped = mapGoogleVolume(volume)
    if (!mapped) continue
    const key = `${mapped.title}|${mapped.author}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    results.push(mapped)
  }
  if (results.length > 0) return results
  return searchOpenLibrary(trimmed, signal)
}
