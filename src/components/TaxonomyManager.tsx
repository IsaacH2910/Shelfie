import { useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function TaxonomyManager({
  labels,
  emptyHint,
  addPlaceholder,
  onAdd,
  onRename,
  onRemove,
  busy,
}: {
  labels: string[]
  emptyHint: string
  addPlaceholder: string
  onAdd: (label: string) => Promise<void>
  onRename: (from: string, to: string) => Promise<void>
  onRemove: (label: string) => Promise<void>
  busy?: boolean
}) {
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const submitAdd = async () => {
    const value = draft.trim()
    if (!value) return
    try {
      await onAdd(value)
      setDraft('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add')
    }
  }

  const startEdit = (label: string) => {
    setEditing(label)
    setEditValue(label)
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditValue('')
  }

  const submitRename = async () => {
    if (!editing) return
    try {
      await onRename(editing, editValue)
      cancelEdit()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not rename')
    }
  }

  const confirmRemove = async (label: string) => {
    if (
      !window.confirm(
        `Remove “${label}”? Books using it will be updated.`,
      )
    ) {
      return
    }
    try {
      await onRemove(label)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove')
    }
  }

  return (
    <div className="space-y-3">
      {labels.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {labels.map((label) => (
            <li
              key={label.toLowerCase()}
              className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2"
            >
              {editing === label ? (
                <>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void submitRename()
                      } else if (e.key === 'Escape') {
                        cancelEdit()
                      }
                    }}
                    className="h-9 flex-1"
                    autoFocus
                    disabled={busy}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void submitRename()}
                    disabled={busy || !editValue.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={cancelEdit}
                    disabled={busy}
                    aria-label="Cancel rename"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Badge variant="secondary" className="min-w-0 flex-1 justify-start truncate font-normal">
                    {label}
                  </Badge>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => startEdit(label)}
                    disabled={busy}
                    aria-label={`Rename ${label}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => void confirmRemove(label)}
                    disabled={busy}
                    aria-label={`Remove ${label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void submitAdd()
            }
          }}
          placeholder={addPlaceholder}
          disabled={busy}
          autoComplete="off"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => void submitAdd()}
          disabled={busy || !draft.trim()}
          className={cn('shrink-0')}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  )
}
