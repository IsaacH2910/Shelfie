import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StarRating({
  value,
  onChange,
  disabled,
  size = 'md',
}: {
  value: number | null
  onChange?: (rating: number | null) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}) {
  const interactive = !!onChange && !disabled
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'
  const current = value ?? 0

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={value ? `${value} out of 5 stars` : 'No rating'}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill =
          current >= star ? 1 : current >= star - 0.5 ? 0.5 : 0

        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            className={cn(
              'relative rounded-sm text-amber-500',
              interactive
                ? 'cursor-pointer hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                : 'cursor-default',
              !interactive && 'pointer-events-none',
            )}
            aria-label={`${star} stars`}
            onClick={() => {
              if (!onChange) return
              // Tap same full star again clears; tap half via second click near edge is complex —
              // half stars: second click on same star toggles half / full / clear.
              if (current === star) onChange(star - 0.5)
              else if (current === star - 0.5) onChange(null)
              else onChange(star)
            }}
          >
            <Star
              className={cn(iconClass, fill === 0 && 'text-muted-foreground/40')}
              fill={fill === 1 ? 'currentColor' : 'none'}
            />
            {fill === 0.5 ? (
              <span
                className="pointer-events-none absolute inset-0 overflow-hidden"
                style={{ width: '50%' }}
              >
                <Star className={iconClass} fill="currentColor" />
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
