import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  BookText,
  CalendarDays,
  Copy,
  Lock,
  MapPin,
  Pencil,
  Tag,
  Trash2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CoverImage } from '@/components/CoverImage'
import { LanguageBadge } from '@/components/LanguageBadge'
import { BookForm } from '@/components/BookForm'
import { BookCard } from '@/components/BookCard'
import { FullScreenLoader } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'
import {
  useBooks,
  useDeleteBook,
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
    notes: book.notes ?? '',
    cover_url: book.cover_url,
    source: book.source as BookDraft['source'],
    scope: book.household_id ? 'household' : 'private',
    household_id: book.household_id,
  }
}

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: books, isLoading } = useBooks()
  const { data: households } = useHouseholds()
  const updateBook = useUpdateBook()
  const deleteBook = useDeleteBook()

  const [editing, setEditing] = useState(false)
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
      })
      toast.success('Changes saved')
      setEditing(false)
      setPendingCover(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
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
    try {
      await deleteBook.mutateAsync(book.id)
      toast.success('Book removed')
      navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete')
    }
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this book?</DialogTitle>
                <DialogDescription>
                  “{book.title}” will be removed from your library. This can’t be
                  undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
          </div>

          <dl className="space-y-2 pt-1 text-sm">
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
          </dl>
        </div>
      </div>

      {book.notes ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {book.notes}
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
  )
}
