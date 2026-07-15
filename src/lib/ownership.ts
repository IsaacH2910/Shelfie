import type { Ownership } from '@/types'

export const OWNERSHIP_OPTIONS: {
  value: Ownership
  label: string
  short: string
}[] = [
  { value: 'owned', label: 'In my library', short: 'Owned' },
  { value: 'wishlist', label: 'Wishlist', short: 'Wishlist' },
  { value: 'want_to_buy', label: 'Want to buy', short: 'Want' },
]

export function normalizeOwnership(
  value: string | null | undefined,
): Ownership {
  if (value === 'wishlist' || value === 'want_to_buy' || value === 'owned') {
    return value
  }
  return 'owned'
}
