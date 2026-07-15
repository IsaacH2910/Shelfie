import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { progressPercent } from '@/lib/reading'

export function ReadingProgressFields({
  currentPage,
  pageCount,
  onChange,
  disabled,
}: {
  currentPage: number | null
  pageCount: number | null
  onChange: (patch: {
    current_page: number | null
    page_count: number | null
  }) => void
  disabled?: boolean
}) {
  const pct = progressPercent(currentPage, pageCount)

  return (
    <div className="space-y-1.5">
      <Label>Reading progress</Label>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Current page</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={currentPage ?? ''}
            disabled={disabled}
            placeholder="0"
            onChange={(e) => {
              const raw = e.target.value
              onChange({
                current_page: raw === '' ? null : Math.max(0, Number(raw)),
                page_count: pageCount,
              })
            }}
          />
        </div>
        <span className="pt-5 text-muted-foreground">/</span>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Total pages</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={pageCount ?? ''}
            disabled={disabled}
            placeholder="420"
            onChange={(e) => {
              const raw = e.target.value
              onChange({
                current_page: currentPage,
                page_count: raw === '' ? null : Math.max(1, Number(raw)),
              })
            }}
          />
        </div>
      </div>
      {pct != null ? (
        <div className="space-y-1 pt-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{pct}% complete</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Optional — track where you left off.
        </p>
      )}
    </div>
  )
}
