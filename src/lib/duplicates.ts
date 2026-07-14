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
