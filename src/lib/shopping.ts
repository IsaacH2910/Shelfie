import { normalizeIsbn, normalizeText } from '@/lib/duplicates'
import type { Book } from '@/types'

export type ShoppingMatch =
  | { kind: 'owned'; book: Book }
  | { kind: 'edition'; book: Book }
  | { kind: 'wishlist'; book: Book }
  | { kind: 'want'; book: Book }
  | { kind: 'none' }

export function matchShoppingQuery(
  query: string,
  books: Book[],
): { query: string; matches: ShoppingMatch[] } {
  const q = normalizeText(query)
  const isbnQ = normalizeIsbn(query)
  if (!q && !isbnQ) return { query, matches: [] }

  const hits: ShoppingMatch[] = []
  for (const book of books) {
    const titleHit = q && normalizeText(book.title).includes(q)
    const authorHit = q && normalizeText(book.author).includes(q)
    const isbnHit =
      isbnQ.length >= 10 && normalizeIsbn(book.isbn).includes(isbnQ)
    if (!titleHit && !authorHit && !isbnHit) continue

    const ownership = book.ownership ?? 'owned'
    if (ownership === 'wishlist') {
      hits.push({ kind: 'wishlist', book })
    } else if (ownership === 'want_to_buy') {
      hits.push({ kind: 'want', book })
    } else if (isbnHit && isbnQ.length >= 10) {
      hits.push({ kind: 'owned', book })
    } else if (titleHit) {
      // Same title, possibly different edition/language
      const exactIsbn =
        isbnQ.length >= 10 && normalizeIsbn(book.isbn) === isbnQ
      hits.push({
        kind: exactIsbn ? 'owned' : 'edition',
        book,
      })
    } else {
      hits.push({ kind: 'owned', book })
    }
  }

  // Prefer owned exact matches first
  hits.sort((a, b) => {
    const order = { owned: 0, edition: 1, wishlist: 2, want: 3, none: 4 }
    return order[a.kind] - order[b.kind]
  })

  return { query, matches: hits.slice(0, 20) }
}
