import { useMemo, useState } from 'react'
import { Tag, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { normalizeCategory, normalizeCategories } from '@/lib/categories'
import { cn } from '@/lib/utils'

export function CategoryInput({
  id = 'categories',
  value,
  onChange,
  suggestions = [],
  disabled,
}: {
  id?: string
  value: string[]
  onChange: (categories: string[]) => void
  suggestions?: string[]
  disabled?: boolean
}) {
  const [draft, setDraft] = useState('')

  const selectedKeys = useMemo(
    () => new Set(value.map((c) => c.toLowerCase())),
    [value],
  )

  const filteredSuggestions = useMemo(() => {
    const q = draft.trim().toLowerCase()
    return suggestions
      .filter((s) => !selectedKeys.has(s.toLowerCase()))
      .filter((s) => !q || s.toLowerCase().includes(q))
      .slice(0, 8)
  }, [suggestions, selectedKeys, draft])

  const add = (raw: string) => {
    const label = normalizeCategory(raw)
    if (!label) return
    onChange(normalizeCategories([...value, label]))
    setDraft('')
  }

  const remove = (label: string) => {
    const key = label.toLowerCase()
    onChange(value.filter((c) => c.toLowerCase() !== key))
  }

  const commitDraft = () => {
    if (draft.trim()) add(draft)
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Tag className="h-4 w-4 text-muted-foreground" />
        Categories
        <span className="font-normal text-muted-foreground">· custom</span>
      </Label>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((label) => (
            <Badge
              key={label.toLowerCase()}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {label}
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(label)}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-background/80 hover:text-foreground"
                aria-label={`Remove ${label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <Input
        id={id}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            commitDraft()
          } else if (e.key === 'Backspace' && !draft && value.length > 0) {
            remove(value[value.length - 1])
          }
        }}
        onBlur={commitDraft}
        placeholder="Type a category and press Enter"
        autoComplete="off"
      />

      {filteredSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {filteredSuggestions.map((label) => (
            <button
              key={label.toLowerCase()}
              type="button"
              disabled={disabled}
              onClick={() => add(label)}
              className={cn(
                'rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground transition',
                'hover:border-primary/40 hover:bg-accent/40 hover:text-foreground',
              )}
            >
              + {label}
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Make up your own (Fiction, Kids, To read…). Reuse labels to filter the
        library later.
      </p>
    </div>
  )
}
