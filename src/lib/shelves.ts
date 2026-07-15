import { normalizeCategory } from '@/lib/categories'

/** Normalize a shelf location label for storage. */
export function normalizeShelf(raw: string): string {
  return normalizeCategory(raw)
}

/** Dedupe case-insensitively, keep first spelling, drop empties. */
export function normalizeShelves(raw: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    const label = normalizeShelf(item)
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
  }
  return out
}

/** Distinct shelf locations from a library, sorted A–Z. */
export function collectShelves(
  books: { shelf_location?: string | null }[],
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const book of books) {
    const label = normalizeShelf(book.shelf_location ?? '')
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
  }
  return out.sort((a, b) => a.localeCompare(b))
}

/** Merge managed labels with any labels still present on books. */
export function mergeLabels(managed: string[], fromBooks: string[]): string[] {
  return normalizeShelves([...managed, ...fromBooks]).sort((a, b) =>
    a.localeCompare(b),
  )
}
