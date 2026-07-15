import type { Database } from '@/lib/database.types'
import type { ReadingStatus } from '@/lib/reading'

export type Profile = Database['public']['Tables']['profiles']['Row']

export type Household = Database['public']['Tables']['households']['Row']
export type HouseholdInsert =
  Database['public']['Tables']['households']['Insert']

export type HouseholdMember =
  Database['public']['Tables']['household_members']['Row']

export type HouseholdInvite =
  Database['public']['Tables']['household_invites']['Row']

export type Book = Database['public']['Tables']['books']['Row']
export type BookInsert = Database['public']['Tables']['books']['Insert']
export type BookUpdate = Database['public']['Tables']['books']['Update']

export type BookAnnotation =
  Database['public']['Tables']['book_annotations']['Row']
export type Loan = Database['public']['Tables']['loans']['Row']

export type BookScope = 'private' | 'household'
export type BookSource = 'manual' | 'barcode' | 'ocr'
export type MemberRole = 'owner' | 'member'
export type Ownership = 'owned' | 'wishlist' | 'want_to_buy'
export type AnnotationKind = 'quote' | 'highlight' | 'bookmark' | 'thought'

/** A household plus the current user's role in it. */
export type HouseholdWithRole = Household & { role: MemberRole }

/** Draft used by the add/edit form and the scan/lookup flow. */
export type BookDraft = {
  title: string
  author: string
  isbn: string
  language: string
  shelf_location: string
  categories: string[]
  collections: string[]
  notes: string
  review: string
  cover_url: string | null
  source: BookSource
  scope: BookScope
  household_id: string | null
  reading_status: ReadingStatus
  rating: number | null
  page_count: number | null
  current_page: number | null
  reading_started_at: string | null
  reading_finished_at: string | null
  ownership: Ownership
  is_favorite: boolean
  series: string
  publisher: string
  published_year: number | null
}
