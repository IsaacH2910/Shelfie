import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { Button } from '@/components/ui/button'
import { normalizeIsbn, toLookupIsbn } from '@/lib/duplicates'

function digitsKey(raw: string): string {
  return normalizeIsbn(raw).replace(/[^0-9]/g, '')
}

export function BatchBarcodeScanner({
  onDone,
  onCancel,
}: {
  onDone: (isbns: string[]) => void
  onCancel: () => void
}) {
  const [isbns, setIsbns] = useState<string[]>([])
  const [scannerKey, setScannerKey] = useState(0)
  const [paused, setPaused] = useState(false)

  const handleResult = useCallback((text: string) => {
    const isbn = toLookupIsbn(text)
    const key = digitsKey(isbn)
    if (key.length < 10) {
      toast.error('That barcode does not look like an ISBN')
      setPaused(true)
      window.setTimeout(() => {
        setPaused(false)
        setScannerKey((k) => k + 1)
      }, 400)
      return
    }

    setIsbns((prev) => {
      if (prev.some((x) => digitsKey(x) === key)) {
        toast.info('Already scanned')
        return prev
      }
      toast.success(`Added ${isbn}`)
      return [...prev, isbn]
    })

    setPaused(true)
    window.setTimeout(() => {
      setPaused(false)
      setScannerKey((k) => k + 1)
    }, 600)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Batch scan</h2>
          <p className="text-sm text-muted-foreground">
            {isbns.length} unique ISBN{isbns.length === 1 ? '' : 's'} scanned
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isbns.length === 0}
            onClick={() => onDone(isbns)}
          >
            <Check className="h-4 w-4" />
            Done
          </Button>
        </div>
      </div>

      {paused ? (
        <div className="flex aspect-[3/4] w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
          Ready for next…
        </div>
      ) : (
        <BarcodeScanner
          key={scannerKey}
          onResult={handleResult}
          onError={(m) => toast.error(m)}
        />
      )}

      {isbns.length > 0 ? (
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-3 text-sm">
          {isbns.map((isbn) => (
            <li key={digitsKey(isbn)} className="font-mono text-muted-foreground">
              {isbn}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Keep scanning — duplicates are ignored.
        </p>
      )}
    </div>
  )
}
