import { Link } from 'react-router-dom'
import { Layers } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { normalizeCollections } from '@/lib/collections'
import { normalizeCategory } from '@/lib/categories'
import { cn } from '@/lib/utils'

export function CollectionInput({
  id = 'collections',
  value,
  onChange,
  options = [],
  disabled,
}: {
  id?: string
  value: string[]
  onChange: (collections: string[]) => void
  /** Managed collection labels (plus any legacy values on this book). */
  options?: string[]
  disabled?: boolean
}) {
  const selectedKeys = new Set(value.map((c) => c.toLowerCase()))

  const displayOptions = (() => {
    const seen = new Set(options.map((o) => o.toLowerCase()))
    const extras = value.filter((v) => !seen.has(v.toLowerCase()))
    return [...options, ...extras]
  })()

  const toggle = (raw: string) => {
    const label = normalizeCategory(raw)
    if (!label) return
    const key = label.toLowerCase()
    if (selectedKeys.has(key)) {
      onChange(value.filter((c) => c.toLowerCase() !== key))
    } else {
      onChange(normalizeCollections([...value, label]))
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Layers className="h-4 w-4 text-muted-foreground" />
        Collections
      </Label>

      {displayOptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
          No collections yet.{' '}
          <Link
            to="/organize#collections"
            className="font-medium text-primary hover:underline"
          >
            Create some in Settings
          </Link>{' '}
          — e.g. Favorites, Signed copies.
        </div>
      ) : (
        <div
          id={id}
          role="group"
          aria-label="Collections"
          className="flex flex-wrap gap-2"
        >
          {displayOptions.map((label) => {
            const active = selectedKeys.has(label.toLowerCase())
            return (
              <button
                key={label.toLowerCase()}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => toggle(label)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm transition',
                  active
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-accent/40 hover:text-foreground',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Tap to select. Manage the list in{' '}
        <Link
          to="/organize#collections"
          className="font-medium text-primary hover:underline"
        >
          Settings
        </Link>
        .
      </p>
    </div>
  )
}
