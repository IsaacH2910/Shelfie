import {
  isbn10To13,
  isLookupIsbn,
  normalizeIsbn,
  toLookupIsbn,
} from '@/lib/duplicates'
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
  return toLookupIsbn(isbn13 ?? isbn10 ?? '')
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

function googleBooksKey(): string {
  const key = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined
  return key?.trim() ? `&key=${encodeURIComponent(key.trim())}` : ''
}

async function lookupGoogleByIsbn(
  isbn: string,
  signal?: AbortSignal,
): Promise<LookupResult | null> {
  const data = await fetchJson<GoogleResponse>(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1${googleBooksKey()}`,
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

type OpenLibrarySearch = {
  docs?: {
    title?: string
    author_name?: string[]
    cover_i?: number
    language?: string[]
    isbn?: string[]
  }[]
}

/** Last-resort: Open Library search often finds editions the bibkeys API misses. */
async function lookupOpenLibrarySearch(
  isbn: string,
  signal?: AbortSignal,
): Promise<LookupResult | null> {
  const data = await fetchJson<OpenLibrarySearch>(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(
      isbn,
    )}&limit=5&fields=title,author_name,cover_i,language,isbn`,
    signal,
  )
  const docs = data?.docs ?? []
  const match =
    docs.find((doc) =>
      (doc.isbn ?? []).some((id) => normalizeIsbn(id) === isbn),
    ) ?? docs[0]
  if (!match?.title) return null
  return {
    title: match.title,
    author: (match.author_name ?? []).join(', '),
    isbn: toLookupIsbn(
      match.isbn?.find((id) => normalizeIsbn(id).length >= 10) ?? isbn,
    ),
    language: normalizeLanguageCode(match.language?.[0]),
    cover_url: match.cover_i
      ? `https://covers.openlibrary.org/b/id/${match.cover_i}-M.jpg`
      : null,
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

/** ISBN-10 and ISBN-13 (and UPC-padded EAN) forms to try against the APIs. */
function isbnCandidates(rawIsbn: string): string[] {
  const primary = toLookupIsbn(rawIsbn)
  const normalized = normalizeIsbn(rawIsbn)
  const out: string[] = []
  const add = (value: string | null | undefined) => {
    if (value && value.length >= 10 && !out.includes(value)) out.push(value)
  }

  add(primary)
  if (normalized.length === 10) {
    add(normalized)
    add(isbn10To13(normalized))
  }
  if (normalized.length === 12) add(`0${normalized}`)
  if (normalized.length === 13 && normalized.startsWith('978')) {
    const body = normalized.slice(3, 12)
    let sum = 0
    for (let i = 0; i < 9; i++) sum += Number(body[i]) * (10 - i)
    const check = (11 - (sum % 11)) % 11
    add(`${body}${check === 10 ? 'X' : String(check)}`)
  }

  return out
}

async function lookupOneIsbn(
  isbn: string,
  signal?: AbortSignal,
): Promise<LookupResult | null> {
  // Query both in parallel; prefer Open Library because Google's anonymous
  // quota is frequently exhausted (HTTP 429).
  const [openlib, google] = await Promise.all([
    lookupOpenLibrary(isbn, signal),
    lookupGoogleByIsbn(isbn, signal),
  ])
  if (openlib) return mergeLookups(openlib, google, isbn)
  if (google) return mergeLookups(google, null, isbn)
  return lookupOpenLibrarySearch(isbn, signal)
}

/**
 * Look up a single book by ISBN. Tries ISBN-10/13 variants, Open Library first,
 * then Google Books, then Open Library search — so a Google rate-limit never
 * blocks a result.
 */
export async function lookupByIsbn(
  rawIsbn: string,
  signal?: AbortSignal,
): Promise<LookupResult | null> {
  if (!isLookupIsbn(rawIsbn)) return null

  for (const isbn of isbnCandidates(rawIsbn)) {
    if (signal?.aborted) return null
    const result = await lookupOneIsbn(isbn, signal)
    if (result) {
      return {
        ...result,
        isbn: result.isbn || toLookupIsbn(rawIsbn),
      }
    }
  }
  return null
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
      isbn: toLookupIsbn(doc.isbn?.[0] ?? ''),
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
    )}&maxResults=8${googleBooksKey()}`,
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
