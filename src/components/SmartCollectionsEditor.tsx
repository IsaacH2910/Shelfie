import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import {
  BUILTIN_SMART_PRESETS,
  SMART_FIELD_LABELS,
  SMART_OP_LABELS,
  createPresetSmartCollections,
  emptySmartCollection,
  parseSmartCollections,
  type SmartCollection,
  type SmartField,
  type SmartOp,
  type SmartRule,
} from '@/lib/smartCollections'
import type { Json } from '@/lib/database.types'

const FIELDS = Object.keys(SMART_FIELD_LABELS) as SmartField[]
const OPS = Object.keys(SMART_OP_LABELS) as SmartOp[]

function toJson(collections: SmartCollection[]): Json {
  return collections as unknown as Json
}

export function SmartCollectionsEditor() {
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const saved = useMemo(
    () => parseSmartCollections(profile?.smart_collections),
    [profile?.smart_collections],
  )
  const [draft, setDraft] = useState<SmartCollection[] | null>(null)
  const collections = draft ?? saved
  const busy = updateProfile.isPending

  const persist = (next: SmartCollection[]) => {
    setDraft(next)
    updateProfile.mutate(
      { smart_collections: toJson(next) },
      {
        onSuccess: () => {
          setDraft(null)
          toast.success('Smart collections saved')
        },
        onError: (e) => {
          toast.error(e.message)
          setDraft(null)
        },
      },
    )
  }

  const updateAt = (index: number, patch: Partial<SmartCollection>) => {
    const next = collections.map((c, i) =>
      i === index ? { ...c, ...patch } : c,
    )
    setDraft(next)
  }

  const updateRule = (
    colIndex: number,
    ruleIndex: number,
    patch: Partial<SmartRule>,
  ) => {
    const next = collections.map((c, i) => {
      if (i !== colIndex) return c
      const rules = c.rules.map((r, ri) =>
        ri === ruleIndex ? { ...r, ...patch } : r,
      )
      return { ...c, rules }
    })
    setDraft(next)
  }

  return (
    <div className="space-y-4">
      {collections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          <p>
            Smart collections auto-group books from rules — e.g. “Read this
            year” or “Physics books over 500 pages”.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            disabled={busy}
            onClick={() => persist(createPresetSmartCollections())}
          >
            <Sparkles className="h-4 w-4" />
            Add starter presets
          </Button>
        </div>
      ) : null}

      {collections.map((col, ci) => (
        <div
          key={col.id}
          className="space-y-3 rounded-xl border border-border bg-card/40 p-3"
        >
          <div className="flex items-start gap-2">
            <Input
              value={col.name}
              disabled={busy}
              onChange={(e) => updateAt(ci, { name: e.target.value })}
              className="h-9 font-medium"
              aria-label="Collection name"
            />
            <Select
              value={col.match}
              onValueChange={(v) =>
                updateAt(ci, { match: v === 'any' ? 'any' : 'all' })
              }
              disabled={busy}
            >
              <SelectTrigger className="h-9 w-[7.5rem] shrink-0 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Match all</SelectItem>
                <SelectItem value="any">Match any</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={busy}
              aria-label="Remove smart collection"
              onClick={() => {
                const next = collections.filter((_, i) => i !== ci)
                persist(next)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {col.rules.map((rule, ri) => (
              <div key={ri} className="flex flex-wrap items-center gap-1.5">
                <Select
                  value={rule.field}
                  onValueChange={(v) =>
                    updateRule(ci, ri, { field: v as SmartField })
                  }
                  disabled={busy}
                >
                  <SelectTrigger className="h-8 w-auto min-w-[8rem] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELDS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {SMART_FIELD_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={rule.op}
                  onValueChange={(v) =>
                    updateRule(ci, ri, { op: v as SmartOp })
                  }
                  disabled={busy}
                >
                  <SelectTrigger className="h-8 w-auto min-w-[5rem] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPS.map((op) => (
                      <SelectItem key={op} value={op}>
                        {SMART_OP_LABELS[op]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rule.op !== 'exists' ? (
                  <Input
                    value={
                      rule.value === true
                        ? 'true'
                        : rule.value === false
                          ? 'false'
                          : rule.value == null
                            ? ''
                            : String(rule.value)
                    }
                    disabled={busy}
                    onChange={(e) => {
                      const raw = e.target.value
                      let value: string | number | boolean = raw
                      if (rule.field === 'is_favorite') {
                        value = raw.toLowerCase() === 'true' || raw === '1'
                      } else if (
                        rule.field === 'page_count' ||
                        rule.field === 'rating' ||
                        rule.field === 'finished_year'
                      ) {
                        value = raw === '' ? '' : Number(raw)
                      }
                      updateRule(ci, ri, { value })
                    }}
                    className="h-8 w-28 text-xs"
                    placeholder="value"
                  />
                ) : null}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={busy || col.rules.length <= 1}
                  onClick={() => {
                    const next = collections.map((c, i) =>
                      i === ci
                        ? { ...c, rules: c.rules.filter((_, j) => j !== ri) }
                        : c,
                    )
                    setDraft(next)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                const next = collections.map((c, i) =>
                  i === ci
                    ? {
                        ...c,
                        rules: [
                          ...c.rules,
                          { field: 'category' as const, op: 'eq' as const, value: '' },
                        ],
                      }
                    : c,
                )
                setDraft(next)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Rule
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => persist(collections)}
          >
            Save
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            const next = [...collections, emptySmartCollection()]
            setDraft(next)
          }}
        >
          <Plus className="h-4 w-4" />
          New smart collection
        </Button>
        {collections.length > 0 &&
        !BUILTIN_SMART_PRESETS.every((p) =>
          collections.some((c) => c.name === p.name),
        ) ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              const existing = new Set(collections.map((c) => c.name))
              const extras = createPresetSmartCollections().filter(
                (p) => !existing.has(p.name),
              )
              persist([...collections, ...extras])
            }}
          >
            Add missing presets
          </Button>
        ) : null}
      </div>
    </div>
  )
}
