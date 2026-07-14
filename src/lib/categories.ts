/** Normalize a single category label for storage. */
export function normalizeCategory(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

/** Dedupe case-insensitively, keep first spelling, drop empties. */
export function normalizeCategories(raw: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    const label = normalizeCategory(item)
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
  }
  return out
}

/** Distinct category labels from a library, sorted A–Z. */
export function collectCategories(
  books: { categories?: string[] | null }[],
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const book of books) {
    for (const label of book.categories ?? []) {
      const key = label.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(label)
    }
  }
  return out.sort((a, b) => a.localeCompare(b))
}

export function bookHasCategory(
  book: { categories?: string[] | null },
  category: string,
): boolean {
  const key = category.toLowerCase()
  return (book.categories ?? []).some((c) => c.toLowerCase() === key)
}
