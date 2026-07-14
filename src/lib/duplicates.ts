import type { Book } from '@/types'

/** Strip accents, punctuation and case so titles compare loosely. */
export function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Keep only ISBN digits (and a trailing X check char). */
export function normalizeIsbn(value: string | null | undefined): string {
  return (value ?? '').replace(/[^0-9xX]/g, '').toUpperCase()
}

/** Convert ISBN-10 to ISBN-13 (Bookland 978-…). */
export function isbn10To13(isbn10: string): string | null {
  const raw = normalizeIsbn(isbn10)
  if (raw.length !== 10) return null
  const core = `978${raw.slice(0, 9)}`
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3)
  }
  const check = (10 - (sum % 10)) % 10
  return `${core}${check}`
}

/**
 * Normalize a scanned/typed code into the ISBN form we store and look up.
 * Pads UPC-A (12 digits) to EAN-13 and upgrades ISBN-10 → ISBN-13.
 */
export function toLookupIsbn(value: string | null | undefined): string {
  let isbn = normalizeIsbn(value)
  if (isbn.length === 12) isbn = `0${isbn}`
  if (isbn.length === 10) return isbn10To13(isbn) ?? isbn
  return isbn
}

/** True when we have enough digits to attempt an online ISBN lookup. */
export function isLookupIsbn(value: string | null | undefined): boolean {
  const len = normalizeIsbn(value).length
  return len === 10 || len === 12 || len === 13
}

export type DuplicateReason = 'isbn' | 'title'

export type DuplicateMatch = {
  book: Book
  reason: DuplicateReason
}

type DuplicateInput = {
  id?: string
  title: string
  author: string
  isbn: string
  scope: 'private' | 'household'
  household_id: string | null
}

function inSameScope(book: Book, draft: DuplicateInput): boolean {
  if (draft.scope === 'household') {
    return book.household_id === draft.household_id
  }
  return book.household_id === null
}

/**
 * Find existing books that look like the same edition as the draft, within the
 * same scope. Matches on ISBN first, then on title (+ author when present).
 * Different-language editions of the same title are intentionally surfaced so
 * the user can decide, but never blocked.
 */
export function findDuplicates(
  draft: DuplicateInput,
  books: Book[],
): DuplicateMatch[] {
  const isbn = normalizeIsbn(draft.isbn)
  const title = normalizeText(draft.title)
  const author = normalizeText(draft.author)
  if (!title && !isbn) return []

  const matches: DuplicateMatch[] = []
  for (const book of books) {
    if (draft.id && book.id === draft.id) continue
    if (!inSameScope(book, draft)) continue

    if (isbn && normalizeIsbn(book.isbn) === isbn) {
      matches.push({ book, reason: 'isbn' })
      continue
    }
    if (title && normalizeText(book.title) === title) {
      const bookAuthor = normalizeText(book.author)
      if (!author || !bookAuthor || bookAuthor === author) {
        matches.push({ book, reason: 'title' })
      }
    }
  }
  return matches
}
