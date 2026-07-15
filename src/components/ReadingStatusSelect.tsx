import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  READING_STATUSES,
  READING_STATUS_META,
  type ReadingStatus,
} from '@/lib/reading'

export function ReadingStatusSelect({
  id = 'reading-status',
  value,
  onChange,
  disabled,
}: {
  id?: string
  value: ReadingStatus
  onChange: (status: ReadingStatus) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Reading status</Label>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as ReadingStatus)}
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {READING_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {READING_STATUS_META[status].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
