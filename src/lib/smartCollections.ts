import type { Book } from '@/types'
import type { ReadingStatus } from '@/lib/reading'

export type SmartField =
  | 'reading_status'
  | 'ownership'
  | 'category'
  | 'language'
  | 'page_count'
  | 'rating'
  | 'is_favorite'
  | 'finished_year'
  | 'author'
  | 'series'

export type SmartOp =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'exists'

export type SmartRule = {
  field: SmartField
  op: SmartOp
  value?: string | number | boolean | null
}

export type SmartCollection = {
  id: string
  name: string
  match: 'all' | 'any'
  rules: SmartRule[]
}

export const SMART_FIELD_LABELS: Record<SmartField, string> = {
  reading_status: 'Reading status',
  ownership: 'Ownership',
  category: 'Category',
  language: 'Language',
  page_count: 'Page count',
  rating: 'Rating',
  is_favorite: 'Favorite',
  finished_year: 'Finished year',
  author: 'Author',
  series: 'Series',
}

export const SMART_OP_LABELS: Record<SmartOp, string> = {
  eq: 'is',
  neq: 'is not',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  contains: 'contains',
  exists: 'is set',
}

function newId(): string {
  return crypto.randomUUID()
}

export const BUILTIN_SMART_PRESETS: Omit<SmartCollection, 'id'>[] = [
  {
    name: 'Read this year',
    match: 'all',
    rules: [
      { field: 'reading_status', op: 'eq', value: 'finished' },
      { field: 'finished_year', op: 'eq', value: new Date().getFullYear() },
    ],
  },
  {
    name: 'Unread favorites',
    match: 'all',
    rules: [
      { field: 'is_favorite', op: 'eq', value: true },
      { field: 'reading_status', op: 'eq', value: 'unread' },
    ],
  },
  {
    name: 'Long books (500+)',
    match: 'all',
    rules: [{ field: 'page_count', op: 'gte', value: 500 }],
  },
  {
    name: 'Currently reading',
    match: 'any',
    rules: [
      { field: 'reading_status', op: 'eq', value: 'reading' },
      { field: 'reading_status', op: 'eq', value: 'rereading' },
    ],
  },
]

export function createPresetSmartCollections(): SmartCollection[] {
  return BUILTIN_SMART_PRESETS.map((p) => ({ ...p, id: newId() }))
}

export function parseSmartCollections(raw: unknown): SmartCollection[] {
  if (!Array.isArray(raw)) return []
  const out: SmartCollection[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = typeof row.id === 'string' ? row.id : newId()
    const name = typeof row.name === 'string' ? row.name.trim() : ''
    if (!name) continue
    const match = row.match === 'any' ? 'any' : 'all'
    const rules = Array.isArray(row.rules)
      ? (row.rules as SmartRule[]).filter(
          (r) =>
            r &&
            typeof r === 'object' &&
            typeof r.field === 'string' &&
            typeof r.op === 'string',
        )
      : []
    out.push({ id, name, match, rules })
  }
  return out
}

function finishedYear(book: Book): number | null {
  if (!book.reading_finished_at) return null
  return new Date(book.reading_finished_at).getFullYear()
}

function fieldValue(
  book: Book,
  field: SmartField,
): string | number | boolean | null | string[] {
  switch (field) {
    case 'reading_status':
      return (book.reading_status as ReadingStatus) ?? 'unread'
    case 'ownership':
      return book.ownership ?? 'owned'
    case 'category':
      return book.categories ?? []
    case 'language':
      return (book.language ?? '').toLowerCase()
    case 'page_count':
      return book.page_count
    case 'rating':
      return book.rating
    case 'is_favorite':
      return !!book.is_favorite
    case 'finished_year':
      return finishedYear(book)
    case 'author':
      return (book.author ?? '').toLowerCase()
    case 'series':
      return (book.series ?? '').toLowerCase()
  }
}

function compare(
  left: string | number | boolean | null,
  op: SmartOp,
  right: string | number | boolean | null | undefined,
): boolean {
  if (op === 'exists') {
    if (typeof left === 'boolean') return left
    return left != null && left !== ''
  }
  if (left == null && op !== 'neq') return false

  if (op === 'eq') {
    if (typeof left === 'boolean' || typeof right === 'boolean') {
      return Boolean(left) === Boolean(right)
    }
    if (typeof left === 'number' || typeof right === 'number') {
      return Number(left) === Number(right)
    }
    return String(left).toLowerCase() === String(right ?? '').toLowerCase()
  }
  if (op === 'neq') {
    if (typeof left === 'boolean' || typeof right === 'boolean') {
      return Boolean(left) !== Boolean(right)
    }
    if (typeof left === 'number' || typeof right === 'number') {
      return Number(left) !== Number(right)
    }
    return String(left ?? '').toLowerCase() !== String(right ?? '').toLowerCase()
  }
  if (op === 'contains') {
    return String(left ?? '')
      .toLowerCase()
      .includes(String(right ?? '').toLowerCase())
  }

  const ln = Number(left)
  const rn = Number(right)
  if (Number.isNaN(ln) || Number.isNaN(rn)) return false
  if (op === 'gt') return ln > rn
  if (op === 'gte') return ln >= rn
  if (op === 'lt') return ln < rn
  if (op === 'lte') return ln <= rn
  return false
}

export function ruleMatchesBook(book: Book, rule: SmartRule): boolean {
  const raw = fieldValue(book, rule.field)
  if (rule.field === 'category') {
    const cats = (raw as string[]).map((c) => c.toLowerCase())
    const needle = String(rule.value ?? '').toLowerCase()
    if (rule.op === 'exists') return cats.length > 0
    if (rule.op === 'eq' || rule.op === 'contains') {
      return cats.some((c) =>
        rule.op === 'eq' ? c === needle : c.includes(needle),
      )
    }
    if (rule.op === 'neq') return !cats.includes(needle)
    return false
  }
  return compare(
    raw as string | number | boolean | null,
    rule.op,
    rule.value,
  )
}

export function bookMatchesSmartCollection(
  book: Book,
  collection: SmartCollection,
): boolean {
  if (collection.rules.length === 0) return false
  if (collection.match === 'any') {
    return collection.rules.some((r) => ruleMatchesBook(book, r))
  }
  return collection.rules.every((r) => ruleMatchesBook(book, r))
}

export function filterBySmartCollection(
  books: Book[],
  collection: SmartCollection,
): Book[] {
  return books.filter((b) => bookMatchesSmartCollection(b, collection))
}

export function emptySmartCollection(name = 'New smart collection'): SmartCollection {
  return {
    id: newId(),
    name,
    match: 'all',
    rules: [{ field: 'reading_status', op: 'eq', value: 'unread' }],
  }
}
