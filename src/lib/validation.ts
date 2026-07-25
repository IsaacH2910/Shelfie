import { z } from 'zod'
import { READING_STATUSES } from '@/lib/reading'
import type { BookDraft } from '@/types'

const ownershipSchema = z.enum(['owned', 'wishlist', 'want_to_buy'])
const scopeSchema = z.enum(['private', 'household'])
const sourceSchema = z.enum(['manual', 'barcode', 'ocr'])
const readingStatusSchema = z.enum(READING_STATUSES)

const nullableNumber = z
  .number()
  .finite()
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? null : v))

/** Schema for add/edit book drafts. */
export const bookDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(500, 'Title is too long'),
  author: z.string().max(500, 'Author is too long').default(''),
  isbn: z.string().max(32, 'ISBN is too long').default(''),
  language: z.string().max(32).default(''),
  shelf_location: z.string().max(120).default(''),
  categories: z.array(z.string().max(80)).max(40).default([]),
  collections: z.array(z.string().max(80)).max(40).default([]),
  notes: z.string().max(8000).default(''),
  review: z.string().max(8000).default(''),
  cover_url: z.string().max(2000).nullable().default(null),
  source: sourceSchema.default('manual'),
  scope: scopeSchema.default('private'),
  household_id: z.string().uuid().nullable().default(null),
  reading_status: readingStatusSchema.default('unread'),
  rating: z
    .number()
    .min(0)
    .max(5)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  page_count: nullableNumber,
  current_page: nullableNumber,
  reading_started_at: z.string().nullable().default(null),
  reading_finished_at: z.string().nullable().default(null),
  ownership: ownershipSchema.default('owned'),
  is_favorite: z.boolean().default(false),
  series: z.string().max(200).default(''),
  publisher: z.string().max(200).default(''),
  published_year: z
    .number()
    .int()
    .min(0)
    .max(3000)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? null : v)),
})

export type BookDraftInput = z.infer<typeof bookDraftSchema>

export function validateBookDraft(draft: BookDraft): {
  ok: true
  data: BookDraftInput
} | {
  ok: false
  message: string
} {
  const result = bookDraftSchema.safeParse(draft)
  if (result.success) return { ok: true, data: result.data }
  const first = result.error.issues[0]
  return {
    ok: false,
    message: first?.message ?? 'Invalid book details',
  }
}

export const authEmailSchema = z.email('Enter a valid email address')

export const authPasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password is too long')

/** Admin unlock uses the literal username `admin`, not an email. */
export function validateAuthCredentials(
  identifier: string,
  password: string,
  opts: { requireEmail: boolean },
): { ok: true; identifier: string; password: string } | { ok: false; message: string } {
  const trimmed = identifier.trim()
  if (!trimmed) {
    return { ok: false, message: 'Email is required' }
  }
  if (opts.requireEmail && trimmed.toLowerCase() !== 'admin') {
    const email = authEmailSchema.safeParse(trimmed)
    if (!email.success) {
      return {
        ok: false,
        message: email.error.issues[0]?.message ?? 'Enter a valid email address',
      }
    }
  }
  const pw = authPasswordSchema.safeParse(password)
  if (!pw.success) {
    return {
      ok: false,
      message: pw.error.issues[0]?.message ?? 'Invalid password',
    }
  }
  return { ok: true, identifier: trimmed, password: pw.data }
}
