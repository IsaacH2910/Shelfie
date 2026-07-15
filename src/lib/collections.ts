import { normalizeCategories, normalizeCategory } from '@/lib/categories'

export const DEFAULT_COLLECTIONS = [
  'Favorites',
  'Currently Reading',
  'Want to Buy',
  'Wishlist',
  'Rare Books',
  'School',
  'University',
  'Reference',
  'Signed Copies',
  'Loaned Books',
] as const

export function normalizeCollections(raw: string[]): string[] {
  return normalizeCategories(raw)
}

export function collectCollections(
  books: { collections?: string[] | null }[],
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const book of books) {
    for (const label of book.collections ?? []) {
      const key = label.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(label)
    }
  }
  return out.sort((a, b) => a.localeCompare(b))
}

export function bookHasCollection(
  book: { collections?: string[] | null },
  collection: string,
): boolean {
  const key = collection.toLowerCase()
  return (book.collections ?? []).some((c) => c.toLowerCase() === key)
}

export function renameCollectionInList(
  collections: string[] | null | undefined,
  from: string,
  to: string,
): string[] {
  const fromKey = from.toLowerCase()
  const next = (collections ?? []).map((c) =>
    c.toLowerCase() === fromKey ? normalizeCategory(to) : c,
  )
  return normalizeCollections(next)
}

export function removeCollectionFromList(
  collections: string[] | null | undefined,
  label: string,
): string[] {
  const key = label.toLowerCase()
  return (collections ?? []).filter((c) => c.toLowerCase() !== key)
}
