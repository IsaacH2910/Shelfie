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

/** Merge managed labels with any labels still present on books. */
export function mergeLabels(managed: string[], fromBooks: string[]): string[] {
  return normalizeCategories([...managed, ...fromBooks]).sort((a, b) =>
    a.localeCompare(b),
  )
}

export function bookHasCategory(
  book: { categories?: string[] | null },
  category: string,
): boolean {
  const key = category.toLowerCase()
  return (book.categories ?? []).some((c) => c.toLowerCase() === key)
}

/** Replace a category label on a book’s category list (case-insensitive). */
export function renameCategoryInList(
  categories: string[] | null | undefined,
  from: string,
  to: string,
): string[] {
  const fromKey = from.toLowerCase()
  const next = (categories ?? []).map((c) =>
    c.toLowerCase() === fromKey ? to : c,
  )
  return normalizeCategories(next)
}

/** Remove a category label from a book’s category list (case-insensitive). */
export function removeCategoryFromList(
  categories: string[] | null | undefined,
  label: string,
): string[] {
  const key = label.toLowerCase()
  return (categories ?? []).filter((c) => c.toLowerCase() !== key)
}
