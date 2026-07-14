import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ScanBarcode, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BookForm } from '@/components/BookForm'
import type { OcrResult } from '@/components/CoverScanner'
import { CoverImage } from '@/components/CoverImage'
import { LanguageBadge } from '@/components/LanguageBadge'
import { Spinner } from '@/components/Spinner'
import { useBooks, useCreateBook } from '@/hooks/useBooks'
import { useHouseholds } from '@/hooks/useHouseholds'
import { useAuth } from '@/context/AuthProvider'
import { searchBooks, type LookupResult } from '@/lib/bookLookup'
import { findDuplicates, normalizeIsbn, toLookupIsbn } from '@/lib/duplicates'
import { uploadCover } from '@/lib/storage'
import type { BookDraft } from '@/types'

const BarcodeScanner = lazy(() =>
  import('@/components/BarcodeScanner').then((m) => ({
    default: m.BarcodeScanner,
  })),
)
const CoverScanner = lazy(() =>
  import('@/components/CoverScanner').then((m) => ({ default: m.CoverScanner })),
)

function ScannerFallback() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Spinner className="h-6 w-6" />
    </div>
  )
}

/** Which optional camera assist is open. The form is always the source of truth. */
type Assist = 'none' | 'barcode' | 'photo'

const EMPTY_DRAFT: BookDraft = {
  title: '',
  author: '',
  isbn: '',
  language: '',
  shelf_location: '',
  categories: [],
  notes: '',
  cover_url: null,
  source: 'manual',
  scope: 'private',
  household_id: null,
}

function buildQuery(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 2)
    .slice(0, 2)
    .join(' ')
    .slice(0, 100)
}

export default function AddBookPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { data: books } = useBooks()
  const { data: households } = useHouseholds()
  const createBook = useCreateBook()

  const [draft, setDraft] = useState<BookDraft>(EMPTY_DRAFT)
  const [assist, setAssist] = useState<Assist>(() =>
    searchParams.get('scan') === 'barcode' ? 'barcode' : 'none',
  )
  const [manualIsbn, setManualIsbn] = useState('')
  const [saving, setSaving] = useState(false)
  const [searching, setSearching] = useState(false)
  const [candidates, setCandidates] = useState<LookupResult[] | null>(null)
  const [captured, setCaptured] = useState<OcrResult | null>(null)

  const existingBooks = useMemo(() => books ?? [], [books])

  useEffect(() => {
    if (searchParams.get('scan') === 'barcode') {
      setAssist('barcode')
    }
  }, [searchParams])

  const closePhoto = () => {
    setAssist('none')
    setCandidates(null)
  }

  // Barcode scanned → check duplicates, then drop ISBN into form for auto-lookup.
  const handleBarcode = (text: string) => {
    const isbn = toLookupIsbn(text)
    if (isbn.length < 10) {
      setDraft((d) => ({
        ...d,
        isbn: normalizeIsbn(text),
        source: 'barcode',
      }))
      setAssist('none')
      toast.error('That barcode does not look like an ISBN — check the digits')
      return
    }
    const matches = findDuplicates(
      {
        title: '',
        author: '',
        isbn,
        scope: draft.scope,
        household_id: draft.household_id,
      },
      existingBooks,
    )
    if (matches.length > 0) {
      const existing = matches[0].book
      toast.warning('You already own this book', {
        description: existing.title,
        action: {
          label: 'View it',
          onClick: () => navigate(`/book/${existing.id}`),
        },
      })
    }
    setDraft((d) => ({ ...d, isbn, source: 'barcode' }))
    setAssist('none')
    toast.success('Barcode captured — looking it up')
  }

  const handleOcr = async (result: OcrResult) => {
    setCaptured(result)
    setSearching(true)
    try {
      const found = await searchBooks(buildQuery(result.text))
      setCandidates(found)
      if (found.length === 0) {
        toast.info('No match found — you can still save your photo.')
      }
    } finally {
      setSearching(false)
    }
  }

  const pickCandidate = (result: LookupResult) => {
    setDraft((d) => ({
      ...d,
      title: result.title,
      author: result.author,
      isbn: result.isbn,
      language: result.language,
      cover_url: result.cover_url ?? captured?.previewUrl ?? null,
      source: 'ocr',
    }))
    closePhoto()
  }

  const useMyPhoto = () => {
    setDraft((d) => ({
      ...d,
      cover_url: captured?.previewUrl ?? null,
      source: 'ocr',
    }))
    closePhoto()
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let cover = draft.cover_url
      // Upload the captured photo only if we're relying on it as the cover.
      if (captured && user && (!cover || cover === captured.previewUrl)) {
        cover = await uploadCover(captured.blob, user.id)
      }
      await createBook.mutateAsync({ ...draft, cover_url: cover })
      toast.success('Added to your library')
      navigate('/')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not save the book',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (assist === 'none' ? navigate(-1) : closePhoto())}
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Add a book</h1>
      </div>

      {assist === 'barcode' ? (
        <div className="space-y-3">
          <Suspense fallback={<ScannerFallback />}>
            <BarcodeScanner onResult={handleBarcode} onError={() => undefined} />
          </Suspense>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const value = manualIsbn.trim()
              if (!value) return
              handleBarcode(value)
              setManualIsbn('')
            }}
          >
            <Input
              value={manualIsbn}
              onChange={(e) => setManualIsbn(e.target.value)}
              placeholder="Or type the ISBN, e.g. 9780452284241"
              inputMode="numeric"
              autoComplete="off"
              className="flex-1"
            />
            <Button type="submit" variant="secondary" disabled={!manualIsbn.trim()}>
              Look up
            </Button>
          </form>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setAssist('none')}
          >
            <X className="h-4 w-4" />
            Cancel scanning
          </Button>
        </div>
      ) : assist === 'photo' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Snap the cover</p>
            <Button variant="ghost" size="sm" onClick={closePhoto}>
              Cancel
            </Button>
          </div>
          <Suspense fallback={<ScannerFallback />}>
            <CoverScanner
              defaultLanguage={draft.language}
              onRecognized={handleOcr}
              onError={(m) => toast.error(m)}
            />
          </Suspense>

          {searching ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              Searching for matches…
            </div>
          ) : candidates ? (
            <div className="space-y-2">
              {candidates.length > 0 ? (
                <>
                  <p className="text-sm font-medium">Is it one of these?</p>
                  <ul className="space-y-2">
                    {candidates.map((result, i) => (
                      <li key={`${result.title}-${i}`}>
                        <button
                          onClick={() => pickCandidate(result)}
                          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-left transition hover:border-primary/50 hover:bg-accent/40"
                        >
                          <div className="w-10 shrink-0">
                            <CoverImage
                              url={result.cover_url}
                              title={result.title}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {result.title}
                            </p>
                            {result.author ? (
                              <p className="truncate text-xs text-muted-foreground">
                                {result.author}
                              </p>
                            ) : null}
                          </div>
                          <LanguageBadge
                            code={result.language}
                            showLabel={false}
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <Button variant="outline" className="w-full" onClick={useMyPhoto}>
                None of these — use my photo
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAssist('barcode')}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 text-center transition hover:border-primary/50 hover:bg-accent/40 active:scale-[0.98]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ScanBarcode className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold">Scan barcode</span>
              <span className="text-xs text-muted-foreground">Fastest way</span>
            </button>
            <button
              type="button"
              onClick={() => setAssist('photo')}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 text-center transition hover:border-primary/50 hover:bg-accent/40 active:scale-[0.98]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold">Snap the cover</span>
              <span className="text-xs text-muted-foreground">
                No barcode? Use a photo
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or enter the details below
            <span className="h-px flex-1 bg-border" />
          </div>

          <BookForm
            value={draft}
            onChange={setDraft}
            households={households ?? []}
            existingBooks={existingBooks}
            submitting={saving}
            submitLabel="Add to library"
            onSubmit={handleSave}
          />
        </div>
      )}
    </div>
  )
}
