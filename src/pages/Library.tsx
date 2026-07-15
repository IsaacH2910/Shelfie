import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  BookPlus,
  CheckSquare,
  Heart,
  LibraryBig,
  ScanBarcode,
  Search,
  Square,
  Trash2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookCard } from '@/components/BookCard'
import { VirtualBookGrid } from '@/components/VirtualBookGrid'
import { LibraryDashboard } from '@/components/LibraryDashboard'
import { BackendUnavailable } from '@/components/BackendUnavailable'
import { EmptyState } from '@/components/EmptyState'
import {
  useBooks,
  useDeleteBooks,
  usePatchBooks,
  useRestoreBooks,
  type BookWithCreator,
} from '@/hooks/useBooks'
import { useAuth } from '@/context/AuthProvider'
import { useLibraryTaxonomy } from '@/hooks/useLibraryTaxonomy'
import {
  bookHasCategory,
  collectCategories,
} from '@/lib/categories'
import {
  bookHasCollection,
  collectCollections,
} from '@/lib/collections'
import { collectShelves } from '@/lib/shelves'
import {
  READING_STATUSES,
  READING_STATUS_META,
  type ReadingStatus,
} from '@/lib/reading'
import { OWNERSHIP_OPTIONS } from '@/lib/ownership'
import type { Ownership } from '@/types'
import { getLanguage, normalizeLanguageCode } from '@/lib/languages'
import { normalizeIsbn, normalizeText } from '@/lib/duplicates'
import { cn } from '@/lib/utils'

type Scope = 'all' | 'mine' | 'shared'
type Sort = 'recent' | 'title' | 'author' | 'rating'
type StatusFilter = 'all' | ReadingStatus
type OwnershipFilter = 'all' | Ownership | 'favorites'

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Mine' },
  { value: 'shared', label: 'Shared' },
]

export default function LibraryPage() {
  const {
    data: books,
    isLoading,
    isBackendUnavailable,
    refetch,
    isFetching,
  } = useBooks()
  const { user } = useAuth()
  const { shelfOptions, collectionOptions } = useLibraryTaxonomy()
  const patchBooks = usePatchBooks()
  const deleteBooks = useDeleteBooks()
  const restoreBooks = useRestoreBooks()

  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [language, setLanguage] = useState('all')
  const [category, setCategory] = useState('all')
  const [collection, setCollection] = useState('all')
  const [shelf, setShelf] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [ownership, setOwnership] = useState<OwnershipFilter>('all')
  const [sort, setSort] = useState<Sort>('recent')
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const languagesPresent = useMemo(() => {
    const codes = new Set<string>()
    for (const book of books ?? []) {
      if (book.language) codes.add(normalizeLanguageCode(book.language))
    }
    return Array.from(codes).filter(Boolean)
  }, [books])

  const categoriesPresent = useMemo(
    () => collectCategories(books ?? []),
    [books],
  )
  const collectionsPresent = useMemo(
    () => collectCollections(books ?? []),
    [books],
  )
  const shelvesPresent = useMemo(() => collectShelves(books ?? []), [books])

  const statusesPresent = useMemo(() => {
    const seen = new Set<string>()
    for (const book of books ?? []) {
      if (book.reading_status) seen.add(book.reading_status)
    }
    return READING_STATUSES.filter((s) => seen.has(s))
  }, [books])

  const filtered = useMemo(() => {
    const q = normalizeText(query)
    const isbnQ = normalizeIsbn(query)
    let list = (books ?? []).filter((book) => {
      if (scope === 'mine' && book.created_by !== user?.id) return false
      if (scope === 'shared' && !book.household_id) return false
      if (
        language !== 'all' &&
        normalizeLanguageCode(book.language) !== language
      )
        return false
      if (category !== 'all' && !bookHasCategory(book, category)) return false
      if (collection !== 'all' && !bookHasCollection(book, collection))
        return false
      if (
        shelf !== 'all' &&
        (book.shelf_location ?? '').toLowerCase() !== shelf.toLowerCase()
      )
        return false
      if (status !== 'all' && book.reading_status !== status) return false
      if (ownership === 'favorites' && !book.is_favorite) return false
      if (
        ownership !== 'all' &&
        ownership !== 'favorites' &&
        (book.ownership ?? 'owned') !== ownership
      )
        return false
      if (!q && !isbnQ) return true
      const matchesIsbn =
        isbnQ.length > 0 && normalizeIsbn(book.isbn).includes(isbnQ)
      const matchesCategory = (book.categories ?? []).some((c) =>
        normalizeText(c).includes(q),
      )
      return (
        matchesIsbn ||
        matchesCategory ||
        normalizeText(book.title).includes(q) ||
        normalizeText(book.author).includes(q) ||
        normalizeText(book.shelf_location).includes(q) ||
        normalizeText(book.series).includes(q) ||
        normalizeText(book.publisher).includes(q)
      )
    })
    list = [...list].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title)
      if (sort === 'author')
        return (a.author ?? '').localeCompare(b.author ?? '')
      if (sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0)
      return b.created_at.localeCompare(a.created_at)
    })
    return list
  }, [
    books,
    query,
    scope,
    language,
    category,
    collection,
    shelf,
    status,
    ownership,
    sort,
    user?.id,
  ])

  const total = books?.length ?? 0
  const selectedIds = [...selected]

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exitSelect = () => {
    setSelecting(false)
    setSelected(new Set())
  }

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return
    const snapshot = (books ?? []).filter((b) => selected.has(b.id))
    try {
      await deleteBooks.mutateAsync(selectedIds)
      exitSelect()
      toast.success(`Removed ${snapshot.length} books`, {
        action: {
          label: 'Undo',
          onClick: () => {
            void restoreBooks
              .mutateAsync(snapshot)
              .then(() => toast.success('Restored'))
              .catch((e) =>
                toast.error(e instanceof Error ? e.message : 'Could not undo'),
              )
          },
        },
        duration: 7000,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete')
    }
  }

  const bulkFavorite = async () => {
    try {
      await patchBooks.mutateAsync({
        ids: selectedIds,
        patch: { is_favorite: true },
      })
      toast.success('Marked as favorites')
      exitSelect()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update')
    }
  }

  const bulkMoveShelf = async (shelf_location: string) => {
    try {
      await patchBooks.mutateAsync({
        ids: selectedIds,
        patch: { shelf_location: shelf_location || null },
      })
      toast.success('Moved to shelf')
      exitSelect()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Library</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length === total
              ? `${total} ${total === 1 ? 'book' : 'books'}`
              : `${filtered.length} of ${total} books`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              selecting ? exitSelect() : setSelecting(true)
            }
            className="hidden sm:inline-flex"
          >
            {selecting ? (
              <>
                <Square className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4" />
                Select
              </>
            )}
          </Button>
          <Button asChild variant="outline" size="sm" className="md:hidden">
            <Link to="/add?scan=barcode">
              <ScanBarcode className="h-4 w-4" />
              Scan ISBN
            </Link>
          </Button>
          <Button asChild className="hidden md:inline-flex">
            <Link to="/add">
              <BookPlus className="h-4 w-4" />
              Add book
            </Link>
          </Button>
        </div>
      </div>

      {!isBackendUnavailable ? (
        <LibraryDashboard books={books ?? []} />
      ) : null}

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, author, ISBN, series, shelf…"
            className="pl-9"
            type="search"
            data-testid="library-search"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted p-1">
            {SCOPES.map((option) => (
              <button
                key={option.value}
                onClick={() => setScope(option.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  scope === option.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Select
            value={ownership}
            onValueChange={(v) => setOwnership(v as OwnershipFilter)}
          >
            <SelectTrigger className="h-9 w-auto min-w-[7rem] text-sm">
              <SelectValue placeholder="List" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lists</SelectItem>
              <SelectItem value="favorites">Favorites</SelectItem>
              {OWNERSHIP_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {statusesPresent.length > 0 ? (
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as StatusFilter)}
            >
              <SelectTrigger className="h-9 w-auto min-w-[7rem] text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusesPresent.map((value) => (
                  <SelectItem key={value} value={value}>
                    {READING_STATUS_META[value].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {languagesPresent.length > 1 ? (
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-9 w-auto min-w-[7rem] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All languages</SelectItem>
                {languagesPresent.map((code) => {
                  const lang = getLanguage(code)
                  return (
                    <SelectItem key={code} value={code}>
                      {lang ? `${lang.flag} ${lang.name}` : code}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          ) : null}

          {categoriesPresent.length > 0 ? (
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-auto min-w-[7rem] text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoriesPresent.map((label) => (
                  <SelectItem key={label.toLowerCase()} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {collectionsPresent.length > 0 ? (
            <Select value={collection} onValueChange={setCollection}>
              <SelectTrigger className="h-9 w-auto min-w-[7rem] text-sm">
                <SelectValue placeholder="Collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All collections</SelectItem>
                {collectionsPresent.map((label) => (
                  <SelectItem key={label.toLowerCase()} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {shelvesPresent.length > 0 ? (
            <Select value={shelf} onValueChange={setShelf}>
              <SelectTrigger className="h-9 w-auto min-w-[7rem] text-sm">
                <SelectValue placeholder="Shelf" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All shelves</SelectItem>
                {shelvesPresent.map((label) => (
                  <SelectItem key={label.toLowerCase()} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="h-9 w-auto min-w-[7rem] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently added</SelectItem>
              <SelectItem value="title">Title A–Z</SelectItem>
              <SelectItem value="author">Author A–Z</SelectItem>
              <SelectItem value="rating">Highest rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selecting && selectedIds.length > 0 ? (
        <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/95 p-2.5 shadow-sm backdrop-blur md:top-4">
          <span className="px-1 text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <Button size="sm" variant="outline" onClick={() => void bulkFavorite()}>
            <Heart className="h-4 w-4" />
            Favorite
          </Button>
          {shelfOptions.length > 0 ? (
            <Select onValueChange={(v) => void bulkMoveShelf(v)}>
              <SelectTrigger className="h-8 w-auto min-w-[8rem] text-sm">
                <SelectValue placeholder="Move shelf" />
              </SelectTrigger>
              <SelectContent>
                {shelfOptions.map((label) => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {collectionOptions[0] ? (
            <Select
              onValueChange={(label) => {
                const ids = selectedIds
                const current = (books ?? []).filter((b) => ids.includes(b.id))
                void Promise.all(
                  current.map((book) =>
                    patchBooks.mutateAsync({
                      ids: [book.id],
                      patch: {
                        collections: [
                          ...new Set([...(book.collections ?? []), label]),
                        ],
                      },
                    }),
                  ),
                ).then(() => {
                  toast.success(`Added to ${label}`)
                  exitSelect()
                })
              }}
            >
              <SelectTrigger className="h-8 w-auto min-w-[8rem] text-sm">
                <SelectValue placeholder="Add collection" />
              </SelectTrigger>
              <SelectContent>
                {collectionOptions.map((label) => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => void bulkDelete()}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      ) : null}

      {isBackendUnavailable ? (
        <BackendUnavailable
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : isLoading || (books === undefined && isFetching) ? (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        total === 0 ? (
          <EmptyState
            icon={<LibraryBig />}
            title="Your shelf is empty"
            description="Scan a barcode, snap a cover, import a CSV, or add details by hand."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/add?scan=barcode">
                    <ScanBarcode className="h-4 w-4" />
                    Scan first book
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/settings#import-export">Import library</Link>
                </Button>
              </div>
            }
          />
        ) : (
          <EmptyState
            icon={<Search />}
            title="No matches"
            description="Try a different search or clear the filters."
          />
        )
      ) : (
        <VirtualBookGrid
          items={filtered}
          getKey={(book) => book.id}
          renderItem={(book) => (
            <SelectableCard
              book={book}
              selecting={selecting}
              selected={selected.has(book.id)}
              onToggle={() => toggleSelect(book.id)}
            />
          )}
        />
      )}
    </div>
  )
}

function SelectableCard({
  book,
  selecting,
  selected,
  onToggle,
}: {
  book: BookWithCreator
  selecting: boolean
  selected: boolean
  onToggle: () => void
}) {
  if (!selecting) {
    return (
      <div style={{ contentVisibility: 'auto', containIntrinsicSize: '200px' }}>
        <BookCard book={book} />
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'relative rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'ring-2 ring-primary',
      )}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '200px' }}
    >
      <span
        className={cn(
          'absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-md border bg-background/90',
          selected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border',
        )}
      >
        {selected ? <CheckSquare className="h-3.5 w-3.5" /> : null}
      </span>
      <div className="pointer-events-none">
        <BookCard book={book} />
      </div>
    </button>
  )
}
