import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NONE = '__none__'

export function ShelfSelect({
  id = 'shelf',
  value,
  onChange,
  options = [],
  disabled,
}: {
  id?: string
  value: string
  onChange: (shelf: string) => void
  options?: string[]
  disabled?: boolean
}) {
  const normalized = value.trim()
  const displayOptions = (() => {
    if (
      normalized &&
      !options.some((o) => o.toLowerCase() === normalized.toLowerCase())
    ) {
      return [...options, normalized]
    }
    return options
  })()

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        Shelf location
      </Label>

      {displayOptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
          No shelves yet.{' '}
          <Link
            to="/settings#shelves"
            className="font-medium text-primary hover:underline"
          >
            Add shelves in Settings
          </Link>{' '}
          — e.g. Living room, Bedroom.
        </div>
      ) : (
        <Select
          value={normalized || NONE}
          onValueChange={(next) => onChange(next === NONE ? '' : next)}
          disabled={disabled}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder="Where does this book live?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Not shelved yet</SelectItem>
            {displayOptions.map((label) => (
              <SelectItem key={label.toLowerCase()} value={label}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <p className="text-xs text-muted-foreground">
        Pick a place from your list. Edit shelves in{' '}
        <Link
          to="/settings#shelves"
          className="font-medium text-primary hover:underline"
        >
          Settings
        </Link>
        .
      </p>
    </div>
  )
}
