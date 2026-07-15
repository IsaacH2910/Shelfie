import { normalizeCategory } from '@/lib/categories'

/** Path separator for hierarchical shelves: "Living room › Shelf A › Row 2" */
export const SHELF_SEP = ' › '

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

/** Build a hierarchical path from segments. */
export function joinShelfPath(segments: string[]): string {
  return segments
    .map((s) => normalizeShelf(s))
    .filter(Boolean)
    .join(SHELF_SEP)
}

export function splitShelfPath(path: string): string[] {
  return path
    .split(SHELF_SEP)
    .map((s) => s.trim())
    .filter(Boolean)
}

export type ShelfCapacityMap = Record<string, number>

export function parseShelfCapacities(raw: unknown): ShelfCapacityMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: ShelfCapacityMap = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof value === 'number' ? value : Number(value)
    if (key && Number.isFinite(n) && n > 0) out[key] = Math.floor(n)
  }
  return out
}

export function shelfUsage(
  books: { shelf_location?: string | null; ownership?: string | null }[],
  shelf: string,
): number {
  const key = shelf.toLowerCase()
  return books.filter(
    (b) =>
      (b.ownership ?? 'owned') === 'owned' &&
      (b.shelf_location ?? '').toLowerCase() === key,
  ).length
}
