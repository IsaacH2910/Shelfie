import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useBooks, useCreateBook } from '@/hooks/useBooks'
import {
  booksToCsv,
  booksToJson,
  downloadText,
  parseImportCsv,
  parseImportJson,
} from '@/lib/importExport'

export function ImportExportPanel() {
  const { data: books = [] } = useBooks()
  const createBook = useCreateBook()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const exportCsv = () => {
    downloadText(
      `shelfie-library-${new Date().toISOString().slice(0, 10)}.csv`,
      booksToCsv(books),
      'text/csv;charset=utf-8',
    )
    toast.success(`Exported ${books.length} books as CSV`)
  }

  const exportJson = () => {
    downloadText(
      `shelfie-library-${new Date().toISOString().slice(0, 10)}.json`,
      booksToJson(books),
      'application/json',
    )
    toast.success(`Exported ${books.length} books as JSON`)
  }

  const onFile = async (file: File) => {
    setImporting(true)
    const toastId = toast.loading('Reading file…')
    try {
      const text = await file.text()
      const lower = file.name.toLowerCase()
      const drafts = lower.endsWith('.json')
        ? parseImportJson(text)
        : parseImportCsv(text)

      if (drafts.length === 0) {
        toast.error('No books found in that file', { id: toastId })
        return
      }

      let ok = 0
      let failed = 0
      for (let i = 0; i < drafts.length; i++) {
        toast.loading(`Importing ${i + 1} of ${drafts.length}…`, {
          id: toastId,
        })
        try {
          await createBook.mutateAsync(drafts[i])
          ok++
        } catch {
          failed++
        }
      }

      if (failed === 0) {
        toast.success(`Imported ${ok} book${ok === 1 ? '' : 's'}`, {
          id: toastId,
        })
      } else {
        toast.warning(`Imported ${ok}, failed ${failed}`, { id: toastId })
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not import file',
        { id: toastId },
      )
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import & export</CardTitle>
        <CardDescription>
          Download your library or import a CSV/JSON file. Goodreads CSV exports
          are supported.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={exportCsv}
            disabled={books.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={exportJson}
            disabled={books.length === 0}
          >
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Import file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void onFile(file)
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Accepts Shelfie CSV/JSON or a Goodreads library export (.csv).
        </p>
      </CardContent>
    </Card>
  )
}
