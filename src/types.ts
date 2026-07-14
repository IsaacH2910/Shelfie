import type { Database } from '@/lib/database.types'

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

export type BookScope = 'private' | 'household'
export type BookSource = 'manual' | 'barcode' | 'ocr'
export type MemberRole = 'owner' | 'member'

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
  notes: string
  cover_url: string | null
  source: BookSource
  scope: BookScope
  household_id: string | null
}
