import { Badge } from '@/components/ui/badge'
import {
  READING_STATUS_META,
  normalizeReadingStatus,
  type ReadingStatus,
} from '@/lib/reading'

export function StatusBadge({
  status,
  short,
}: {
  status: string | null | undefined
  short?: boolean
}) {
  const value: ReadingStatus = normalizeReadingStatus(status)
  if (value === 'unread' && short) return null
  const meta = READING_STATUS_META[value]
  return (
    <Badge variant={meta.badge} className="font-medium">
      {short ? meta.short : meta.label}
    </Badge>
  )
}
