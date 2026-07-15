import { useState } from 'react'
import { toast } from 'sonner'
import { Bug, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  clearCrashLog,
  readCrashLog,
  type CrashEntry,
} from '@/lib/crashLog'
import { downloadText } from '@/lib/importExport'

export function CrashLogPanel() {
  const [entries, setEntries] = useState<CrashEntry[]>(() => readCrashLog())

  const refresh = () => setEntries(readCrashLog())

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            downloadText(
              `shelfie-diagnostics-${new Date().toISOString().slice(0, 10)}.json`,
              JSON.stringify(entries, null, 2),
              'application/json',
            )
            toast.success('Diagnostics exported')
          }}
          disabled={entries.length === 0}
        >
          <Bug className="h-4 w-4" />
          Export log
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            clearCrashLog()
            refresh()
            toast.success('Diagnostics cleared')
          }}
          disabled={entries.length === 0}
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No crashes recorded on this device.
        </p>
      ) : (
        <ul className="max-h-56 space-y-2 overflow-auto text-xs">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-border bg-muted/40 px-3 py-2"
            >
              <p className="font-medium text-foreground">{entry.message}</p>
              <p className="text-muted-foreground">
                {new Date(entry.at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
