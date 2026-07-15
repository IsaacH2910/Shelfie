import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  BookText,
  CalendarDays,
  Copy,
  Heart,
  Lock,
  MapPin,
  Pencil,
  StickyNote,
  Tag,
  Trash2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CoverImage } from '@/components/CoverImage'
import { LanguageBadge } from '@/components/LanguageBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { StarRating } from '@/components/StarRating'
import { BookForm } from '@/components/BookForm'
import { BookCard } from '@/components/BookCard'
import { BookAnnotations } from '@/components/BookAnnotations'
import { BookLoans } from '@/components/BookLoans'
import { ReadingStatusSelect } from '@/components/ReadingStatusSelect'
import { FullScreenLoader } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'
import {
  formatProgress,
  normalizeReadingStatus,
  readingTimestampsForStatus,
  type ReadingStatus,
} from '@/lib/reading'
import { OWNERSHIP_OPTIONS } from '@/lib/ownership'
import { cn } from '@/lib/utils'
import {
  useBooks,
  useDeleteBook,
  usePatchBooks,
  useRestoreBooks,
  useTouchBookOpened,
  useUpdateBook,
  type BookWithCreator,
} from '@/hooks/useBooks'
import { useHouseholds } from '@/hooks/useHouseholds'
import { useAuth } from '@/context/AuthProvider'
import { normalizeIsbn, normalizeText } from '@/lib/duplicates'
import { uploadCover } from '@/lib/storage'
import type { Book, BookDraft } from '@/types'

function bookToDraft(book: Book): BookDraft {
  return {
    title: book.title,
    author: book.author ?? '',
    isbn: book.isbn ?? '',
    language: book.language ?? '',
    shelf_location: book.shelf_location ?? '',
    categories: book.categories ?? [],
    collections: book.collections ?? [],
    notes: book.notes ?? '',
    review: book.review ?? '',
    cover_url: book.cover_url,
    source: book.source as BookDraft['source'],
    scope: book.household_id ? 'household' : 'private',
    household_id: book.household_id,
    reading_status: normalizeReadingStatus(book.reading_status),
    rating: book.rating,
    page_count: book.page_count,
    current_page: book.current_page,
    reading_started_at: book.reading_started_at,
    reading_finished_at: book.reading_finished_at,
    ownership: (book.ownership as BookDraft['ownership']) ?? 'owned',
    is_favorite: !!book.is_favorite,
    series: book.series ?? '',
    publisher: book.publisher ?? '',
    published_year: book.published_year,
  }
}

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: books, isLoading } = useBooks()
  const { data: households } = useHouseholds()
  const updateBook = useUpdateBook()
  const patchBooks = usePatchBooks()
  const deleteBook = useDeleteBook()
  const restoreBooks = useRestoreBooks()
  const touchOpened = useTouchBookOpened()

  const [editing, setEditing] = useState(false)
  const [panel, setPanel] = useState<'details' | 'notes' | 'loans'>('details')
  const [draft, setDraft] = useState<BookDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingCover, setPendingCover] = useState<{
    blob: Blob
    previewUrl: string
  } | null>(null)

  const book = useMemo(
    () => (books ?? []).find((b) => b.id === id) ?? null,
    [books, id],
  )

  useEffect(() => {
    if (book?.id) void touchOpened.mutateAsync(book.id).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id])

  const related = useMemo(() => {
    if (!book) return [] as BookWithCreator[]
    const title = normalizeText(book.title)
    const isbn = normalizeIsbn(book.isbn)
    return (books ?? []).filter((other) => {
      if (other.id === book.id) return false
      if (isbn && normalizeIsbn(other.isbn) === isbn) return true
      return normalizeText(other.title) === title
    })
  }, [books, book])

  if (isLoading && !book) return <FullScreenLoader />

  if (!book) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <EmptyState
          icon={<BookText />}
          title="Book not found"
          description="It may have been removed."
          action={
            <Button asChild>
              <Link to="/">Back to library</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const household = households?.find((h) => h.id === book.household_id)

  const startEdit = () => {
    setDraft(bookToDraft(book))
    setPendingCover(null)
    setEditing(true)
  }

  const handleUpdate = async () => {
    if (!draft) return
    setSaving(true)
    try {
      let cover = draft.cover_url
      if (
        pendingCover &&
        user &&
        (!cover || cover === pendingCover.previewUrl)
      ) {
        cover = await uploadCover(pendingCover.blob, user.id)
      }
      await updateBook.mutateAsync({
        id: book.id,
        draft: { ...draft, cover_url: cover },
        expectedUpdatedAt: book.updated_at,
      })
      toast.success('Changes saved')
      setEditing(false)
      setPendingCover(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not save'
      toast.error(message, {
        action:
          err instanceof Error && err.name === 'ConflictError'
            ? {
                label: 'Reload',
                onClick: () => window.location.reload(),
              }
            : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  const copyIsbn = async () => {
    if (!book.isbn) return
    try {
      await navigator.clipboard.writeText(book.isbn)
      toast.success('ISBN copied')
    } catch {
      toast.error('Could not copy ISBN')
    }
  }

  const handleDelete = async () => {
    const snapshot = book
    try {
      await deleteBook.mutateAsync(book.id)
      navigate('/')
      toast.success('Book removed', {
        action: {
          label: 'Undo',
          onClick: () => {
            void restoreBooks
              .mutateAsync([snapshot])
              .then(() => toast.success('Restored'))
              .catch((err) =>
                toast.error(
                  err instanceof Error ? err.message : 'Could not undo',
                ),
              )
          },
        },
        duration: 6000,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete')
    }
  }

  const toggleFavorite = () => {
    const next = !book.is_favorite
    void patchBooks
      .mutateAsync({
        ids: [book.id],
        patch: { is_favorite: next },
      })
      .then(() => toast.success(next ? 'Added to favorites' : 'Removed from favorites'))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Could not update'),
      )
  }

  const setReadingStatus = (status: ReadingStatus) => {
    const stamps = readingTimestampsForStatus(status, book)
    void patchBooks
      .mutateAsync({
        ids: [book.id],
        patch: { reading_status: status, ...stamps },
      })
      .then(() => toast.success('Status updated'))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Could not update'),
      )
  }

  if (editing && draft) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditing(false)}
            aria-label="Cancel"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Edit book</h1>
        </div>
        <BookForm
          value={draft}
          onChange={setDraft}
          households={households ?? []}
          existingBooks={books ?? []}
          currentBookId={book.id}
          submitting={saving}
          submitLabel="Save changes"
          onSubmit={handleUpdate}
          onCancel={() => {
            setEditing(false)
            setPendingCover(null)
          }}
          onCoverFile={(file, previewUrl) => {
            setPendingCover({ blob: file, previewUrl })
            setDraft((d) => (d ? { ...d, cover_url: previewUrl } : d))
          }}
        />
      </div>
    )
  }

  const PANELS = [
    { id: 'details' as const, label: 'Details' },
    { id: 'notes' as const, label: 'Notes' },
    { id: 'loans' as const, label: 'Loans' },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFavorite}
            disabled={patchBooks.isPending}
            aria-pressed={!!book.is_favorite}
          >
            <Heart
              className={cn(
                'h-4 w-4',
                book.is_favorite && 'fill-red-500 text-red-500',
              )}
            />
            {book.is_favorite ? 'Favorited' : 'Favorite'}
          </Button>
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleDelete()}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="mx-auto w-40 shrink-0 sm:mx-0">
          <CoverImage url={book.cover_url} title={book.title} />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight">
              {book.title}
            </h1>
            {book.author ? (
              <p className="text-base text-muted-foreground">{book.author}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={book.reading_status} />
            <Badge variant="secondary">
              {OWNERSHIP_OPTIONS.find((o) => o.value === (book.ownership ?? 'owned'))
                ?.short ?? 'Owned'}
            </Badge>
            {book.is_favorite ? (
              <Badge variant="outline" className="gap-1">
                <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                Favorite
              </Badge>
            ) : null}
            <LanguageBadge code={book.language} />
            {book.household_id ? (
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {household?.name ?? 'Shared'}
              </Badge>
            ) : (
              <Badge variant="muted" className="gap-1">
                <Lock className="h-3 w-3" />
                Private
              </Badge>
            )}
            {(book.categories ?? []).map((label) => (
              <Badge key={label.toLowerCase()} variant="outline" className="gap-1">
                <Tag className="h-3 w-3" />
                {label}
              </Badge>
            ))}
            {(book.collections ?? []).map((label) => (
              <Badge
                key={`c-${label.toLowerCase()}`}
                variant="default"
                className="gap-1"
              >
                {label}
              </Badge>
            ))}
          </div>

          <div className="max-w-xs">
            <ReadingStatusSelect
              value={normalizeReadingStatus(book.reading_status)}
              onChange={setReadingStatus}
              disabled={patchBooks.isPending}
            />
          </div>

          {book.series ? (
            <p className="text-sm text-muted-foreground">Series · {book.series}</p>
          ) : null}

          {book.rating ? (
            <div className="flex items-center gap-2">
              <StarRating value={book.rating} />
              <span className="text-sm text-muted-foreground">
                {book.rating} / 5
              </span>
            </div>
          ) : null}

          {formatProgress(book.current_page, book.page_count) ? (
            <p className="text-sm text-muted-foreground">
              {formatProgress(book.current_page, book.page_count)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="inline-flex rounded-lg bg-muted p-1">
        {PANELS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setPanel(option.id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              panel === option.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {panel === 'details' ? (
        <div className="space-y-4">
          <dl className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
            {book.shelf_location ? (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <dd>{book.shelf_location}</dd>
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <dd>
                Added{' '}
                {new Date(book.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
                {book.creator?.display_name
                  ? ` · ${book.creator.display_name}`
                  : ''}
              </dd>
            </div>
            {book.reading_started_at ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <dd>
                  Started{' '}
                  {new Date(book.reading_started_at).toLocaleDateString(
                    undefined,
                    { year: 'numeric', month: 'short', day: 'numeric' },
                  )}
                </dd>
              </div>
            ) : null}
            {book.reading_finished_at ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <dd>
                  Finished{' '}
                  {new Date(book.reading_finished_at).toLocaleDateString(
                    undefined,
                    { year: 'numeric', month: 'short', day: 'numeric' },
                  )}
                </dd>
              </div>
            ) : null}
            {book.last_opened_at ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <dd>
                  Last opened{' '}
                  {new Date(book.last_opened_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </dd>
              </div>
            ) : null}
            {book.isbn ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookText className="h-4 w-4 shrink-0" />
                <dd className="font-mono text-sm">ISBN {book.isbn}</dd>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => void copyIsbn()}
                  aria-label="Copy ISBN"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
            {book.publisher || book.published_year ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookText className="h-4 w-4" />
                <dd>
                  {[book.publisher, book.published_year].filter(Boolean).join(' · ')}
                </dd>
              </div>
            ) : null}
          </dl>

          {book.review ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-semibold">Review</h2>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {book.review}
              </p>
            </div>
          ) : null}

          {related.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Other editions you own ({related.length})
              </h2>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
                {related.map((other) => (
                  <BookCard key={other.id} book={other} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {panel === 'notes' ? (
        <div className="space-y-4">
          {book.notes ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                Book notes
              </h2>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {book.notes}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No book notes yet — add them in Edit.
            </p>
          )}
          <BookAnnotations bookId={book.id} />
        </div>
      ) : null}

      {panel === 'loans' ? <BookLoans bookId={book.id} /> : null}
    </div>
  )
}
