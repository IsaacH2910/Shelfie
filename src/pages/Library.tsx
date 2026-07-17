import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  BookPlus,
  CheckSquare,
  Download,
  Heart,
  LayoutGrid,
  List,
  LibraryBig,
  ScanBarcode,
  Search,
  SlidersHorizontal,
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
import { BookListRow } from '@/components/BookListRow'
import { BookInspector } from '@/components/BookInspector'
import { VirtualBookGrid } from '@/components/VirtualBookGrid'
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
import { useProfile } from '@/hooks/useProfile'
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
  readingTimestampsForStatus,
  type ReadingStatus,
} from '@/lib/reading'
import type { Ownership } from '@/types'
import { getLanguage, normalizeLanguageCode } from '@/lib/languages'
import { normalizeIsbn, normalizeText } from '@/lib/duplicates'
import { booksToCsv, booksToJson, downloadText } from '@/lib/importExport'
import {
  bookMatchesSmartCollection,
  parseSmartCollections,
} from '@/lib/smartCollections'
import { OWNERSHIP_OPTIONS } from '@/lib/ownership'
import { cn } from '@/lib/utils'

type Scope = 'all' | 'mine' | 'shared'
type Sort = 'recent' | 'title' | 'author' | 'rating'
type StatusFilter = 'all' | ReadingStatus
type OwnershipFilter = 'all' | Ownership | 'favorites'
type LibraryView = 'grid' | 'list'

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Mine' },
  { value: 'shared', label: 'Shared' },
]

const VIEW_KEY = 'shelfie_library_view'

function loadView(): LibraryView {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    if (v === 'list' || v === 'grid') return v
  } catch {
    /* ignore */
  }
  return 'grid'
}

export default function LibraryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    data: books,
    isLoading,
    isBackendUnavailable,
    refetch,
    isFetching,
  } = useBooks()
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const { shelfOptions, collectionOptions } = useLibraryTaxonomy()
  const patchBooks = usePatchBooks()
  const deleteBooks = useDeleteBooks()
  const restoreBooks = useRestoreBooks()

  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [language, setLanguage] = useState('all')
  const [category, setCategory] = useState('all')
  const [collection, setCollection] = useState('all')
  const [smartId, setSmartId] = useState('all')
  const [shelf, setShelf] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [ownership, setOwnership] = useState<OwnershipFilter>('all')
  const [sort, setSort] = useState<Sort>('recent')
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [view, setView] = useState<LibraryView>(loadView)
  const [moreFilters, setMoreFilters] = useState(false)
  const [inspectorId, setInspectorId] = useState<string | null>(null)
  const [focusIndex, setFocusIndex] = useState(0)

  const smartCollections = useMemo(
    () => parseSmartCollections(profile?.smart_collections),
    [profile?.smart_collections],
  )

  // Hydrate filters from URL
  useEffect(() => {
    const s = searchParams.get('status')
    if (s && (READING_STATUSES as readonly string[]).includes(s)) {
      setStatus(s as StatusFilter)
    } else if (!s) {
      setStatus('all')
    }
    const o = searchParams.get('ownership')
    if (
      o === 'owned' ||
      o === 'wishlist' ||
      o === 'want_to_buy' ||
      o === 'favorites'
    ) {
      setOwnership(o)
    } else if (!o) {
      setOwnership('all')
    }
    const sortParam = searchParams.get('sort')
    if (
      sortParam === 'recent' ||
      sortParam === 'title' ||
      sortParam === 'author' ||
      sortParam === 'rating'
    ) {
      setSort(sortParam)
    }
    const col = searchParams.get('collection')
    if (col) setCollection(col)
    const smart = searchParams.get('smart')
    if (smart) setSmartId(smart)
    const book = searchParams.get('book')
    if (book) setInspectorId(book)
  }, [searchParams])

  const writeParams = useCallback(
    (patch: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value == null || value === 'all' || value === '') {
              next.delete(key)
            } else {
              next.set(key, value)
            }
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setStatusAndUrl = (value: StatusFilter) => {
    setStatus(value)
    writeParams({ status: value === 'all' ? null : value })
  }
  const setOwnershipAndUrl = (value: OwnershipFilter) => {
    setOwnership(value)
    writeParams({ ownership: value === 'all' ? null : value })
  }
  const setSortAndUrl = (value: Sort) => {
    setSort(value)
    writeParams({ sort: value === 'recent' ? null : value })
  }
  const setCollectionAndUrl = (value: string) => {
    setCollection(value)
    writeParams({ collection: value === 'all' ? null : value })
  }
  const setSmartAndUrl = (value: string) => {
    setSmartId(value)
    writeParams({ smart: value === 'all' ? null : value })
  }

  const setViewPersist = (next: LibraryView) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* ignore */
    }
  }

  const openBook = (id: string) => {
    const wide = window.matchMedia('(min-width: 1024px)').matches
    if (wide) {
      setInspectorId(id)
      writeParams({ book: id })
    } else {
      navigate(`/book/${id}`)
    }
  }

  const closeInspector = () => {
    setInspectorId(null)
    writeParams({ book: null })
  }

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

  const activeSmart = useMemo(
    () => smartCollections.find((c) => c.id === smartId) ?? null,
    [smartCollections, smartId],
  )

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
      if (activeSmart && !bookMatchesSmartCollection(book, activeSmart))
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
    activeSmart,
    shelf,
    status,
    ownership,
    sort,
    user?.id,
  ])

  const total = books?.length ?? 0
  const selectedIds = [...selected]
  const inspectorBook =
    (books ?? []).find((b) => b.id === inspectorId) ?? null

  useEffect(() => {
    setFocusIndex((i) =>
      filtered.length === 0 ? 0 : Math.min(i, filtered.length - 1),
    )
  }, [filtered.length])

  useEffect(() => {
    if (view !== 'list') return
    const el = document.querySelector('[data-focused="true"]')
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focusIndex, view])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selecting) return
      const t = e.target
      if (t instanceof HTMLElement) {
        const tag = t.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          t.isContentEditable
        )
          return
      }
      if (filtered.length === 0) return

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusIndex((i) => Math.min(filtered.length - 1, i + 1))
        return
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusIndex((i) => Math.max(0, i - 1))
        return
      }
      if (e.key === 'Enter') {
        const book = filtered[focusIndex]
        if (book) {
          e.preventDefault()
          openBook(book.id)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // openBook is stable enough for navigation; avoid rebinding every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, focusIndex, selecting])

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

  const bulkStatus = async (reading_status: ReadingStatus) => {
    try {
      await Promise.all(
        selectedIds.map((id) => {
          const book = (books ?? []).find((b) => b.id === id)
          const stamps = readingTimestampsForStatus(reading_status, book ?? {})
          return patchBooks.mutateAsync({
            ids: [id],
            patch: { reading_status, ...stamps },
          })
        }),
      )
      toast.success('Updated status')
      exitSelect()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update')
    }
  }

  const bulkRating = async (rating: number) => {
    try {
      await patchBooks.mutateAsync({
        ids: selectedIds,
        patch: { rating },
      })
      toast.success('Updated rating')
      exitSelect()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update')
    }
  }

  const bulkOwnership = async (ownershipValue: Ownership) => {
    try {
      await patchBooks.mutateAsync({
        ids: selectedIds,
        patch: { ownership: ownershipValue },
      })
      toast.success('Updated ownership')
      exitSelect()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update')
    }
  }

  const exportCsv = () => {
    const source = filtered.length > 0 ? filtered : (books ?? [])
    downloadText(
      `shelfie-library-${new Date().toISOString().slice(0, 10)}.csv`,
      booksToCsv(source),
      'text/csv;charset=utf-8',
    )
    toast.success(`Exported ${source.length} books`)
  }

  const exportJson = () => {
    const source = filtered.length > 0 ? filtered : (books ?? [])
    downloadText(
      `shelfie-library-${new Date().toISOString().slice(0, 10)}.json`,
      booksToJson(source),
      'application/json',
    )
    toast.success(`Exported ${source.length} books`)
  }

  const patchOne = async (
    id: string,
    patch: Parameters<typeof patchBooks.mutateAsync>[0]['patch'],
  ) => {
    try {
      await patchBooks.mutateAsync({ ids: [id], patch })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update')
    }
  }

  return (
    <div
      className={cn(
        'animate-in',
        inspectorBook ? 'lg:flex lg:gap-0 lg:-mx-1' : '',
      )}
    >
      <div
        className={cn(
          'min-w-0 flex-1 space-y-5',
          inspectorBook ? 'lg:pr-4' : '',
        )}
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Library</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length === total
                ? `${total} ${total === 1 ? 'book' : 'books'}`
                : `${filtered.length} of ${total} books`}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <div className="inline-flex rounded-lg border border-border p-0.5">
              <button
                type="button"
                aria-label="Grid view"
                data-testid="library-view-grid"
                className={cn(
                  'rounded-md p-1.5',
                  view === 'grid'
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setViewPersist('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="List view"
                data-testid="library-view-list"
                className={cn(
                  'rounded-md p-1.5',
                  view === 'list'
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setViewPersist('list')}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                selecting ? exitSelect() : setSelecting(true)
              }
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
            <Button asChild className="hidden md:inline-flex">
              <Link to="/add">
                <BookPlus className="h-4 w-4" />
                Add book
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter this list…"
              className="pl-9"
              type="search"
              data-testid="library-search"
            />
            <Link
              to="/search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
            >
              Spotlight
            </Link>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {(
              [
                { value: 'all' as const, label: 'All' },
                { value: 'owned' as const, label: 'Owned' },
                { value: 'wishlist' as const, label: 'Wishlist' },
                { value: 'want_to_buy' as const, label: 'Want' },
                { value: 'favorites' as const, label: 'Favorites' },
              ] as const
            ).map((option) => (
              <Chip
                key={option.value}
                active={ownership === option.value}
                onClick={() => setOwnershipAndUrl(option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            <Chip
              active={status === 'all'}
              onClick={() => setStatusAndUrl('all')}
            >
              Any status
            </Chip>
            {(statusesPresent.length > 0
              ? statusesPresent
              : READING_STATUSES
            ).map((value) => (
              <Chip
                key={value}
                active={status === value}
                onClick={() => setStatusAndUrl(value)}
              >
                {READING_STATUS_META[value].label}
              </Chip>
            ))}
          </div>

          {smartCollections.length > 0 ? (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              <Chip
                active={smartId === 'all'}
                onClick={() => setSmartAndUrl('all')}
              >
                Any smart
              </Chip>
              {smartCollections.map((sc) => (
                <Chip
                  key={sc.id}
                  active={smartId === sc.id}
                  onClick={() =>
                    setSmartAndUrl(smartId === sc.id ? 'all' : sc.id)
                  }
                >
                  {sc.name}
                </Chip>
              ))}
            </div>
          ) : null}

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

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="lg:hidden"
              onClick={() => setMoreFilters((v) => !v)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              More filters
            </Button>

            <div
              className={cn(
                'flex flex-wrap items-center gap-2',
                !moreFilters && 'max-lg:hidden',
              )}
            >
              {languagesPresent.map((code) => {
                const lang = getLanguage(code)
                return (
                  <Chip
                    key={code}
                    active={language === code}
                    onClick={() =>
                      setLanguage((prev) => (prev === code ? 'all' : code))
                    }
                  >
                    {lang ? `${lang.flag} ${lang.name}` : code}
                  </Chip>
                )
              })}
              {categoriesPresent.slice(0, 8).map((label) => (
                <Chip
                  key={label}
                  active={category === label}
                  onClick={() =>
                    setCategory((prev) => (prev === label ? 'all' : label))
                  }
                >
                  {label}
                </Chip>
              ))}

              {collectionsPresent.length > 0 ? (
                <Select
                  value={collection}
                  onValueChange={setCollectionAndUrl}
                >
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

              <Select
                value={sort}
                onValueChange={(v) => setSortAndUrl(v as Sort)}
              >
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

              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={exportJson}
              >
                JSON
              </Button>
            </div>
          </div>
        </div>

        {selecting && selectedIds.length > 0 ? (
          <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/95 p-2.5 shadow-sm backdrop-blur md:top-4">
            <span className="px-1 text-sm font-medium">
              {selectedIds.length} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void bulkFavorite()}
            >
              <Heart className="h-4 w-4" />
              Favorite
            </Button>
            <Select onValueChange={(v) => void bulkStatus(v as ReadingStatus)}>
              <SelectTrigger className="h-8 w-auto min-w-[7rem] text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {READING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {READING_STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => void bulkRating(Number(v))}>
              <SelectTrigger className="h-8 w-auto min-w-[6rem] text-sm">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} ★
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={(v) => void bulkOwnership(v as Ownership)}
            >
              <SelectTrigger className="h-8 w-auto min-w-[7rem] text-sm">
                <SelectValue placeholder="Ownership" />
              </SelectTrigger>
              <SelectContent>
                {OWNERSHIP_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  const current = (books ?? []).filter((b) =>
                    ids.includes(b.id),
                  )
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
              title="Your library is empty"
              description="Scan a barcode, import a Goodreads export, or add your first book."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild>
                    <Link to="/add?scan=barcode">
                      <ScanBarcode className="h-4 w-4" />
                      Scan book
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/settings#import-export">Import library</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link to="/add">Add first book</Link>
                  </Button>
                </div>
              }
            />
          ) : (
            <EmptyState
              icon={<Search />}
              title="No matches"
              description="Try a different filter or clear the chips above."
            />
          )
        ) : view === 'list' ? (
          <ul className="space-y-2" data-testid="library-list">
            {filtered.map((book, index) => (
              <li
                key={book.id}
                data-focused={index === focusIndex ? 'true' : undefined}
                className={cn(
                  'rounded-xl transition',
                  index === focusIndex &&
                    'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
              >
                <BookListRow
                  book={book}
                  selecting={selecting}
                  selected={selected.has(book.id)}
                  onSelect={() => toggleSelect(book.id)}
                  onOpen={
                    selecting
                      ? undefined
                      : () => {
                          setFocusIndex(index)
                          openBook(book.id)
                        }
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <VirtualBookGrid
            items={filtered}
            getKey={(book) => book.id}
            renderItem={(book, index) => (
              <div
                className={cn(
                  'rounded-lg transition',
                  index === focusIndex &&
                    'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
              >
              <SelectableCard
                book={book}
                selecting={selecting}
                selected={selected.has(book.id)}
                onToggle={() => toggleSelect(book.id)}
                onOpen={() => {
                  setFocusIndex(index)
                  openBook(book.id)
                }}
                onFavorite={(b) => {
                  void patchBooks
                    .mutateAsync({
                      ids: [b.id],
                      patch: { is_favorite: !b.is_favorite },
                    })
                    .then(() =>
                      toast.success(
                        b.is_favorite
                          ? 'Removed from favorites'
                          : 'Favorited',
                      ),
                    )
                    .catch((err) =>
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : 'Could not update',
                      ),
                    )
                }}
                onStatus={(b, statusNext) => {
                  const stamps = readingTimestampsForStatus(statusNext, b)
                  void patchBooks
                    .mutateAsync({
                      ids: [b.id],
                      patch: { reading_status: statusNext, ...stamps },
                    })
                    .then(() =>
                      toast.success(
                        `Marked ${READING_STATUS_META[statusNext].label.toLowerCase()}`,
                      ),
                    )
                    .catch((err) =>
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : 'Could not update',
                      ),
                    )
                }}
                onDelete={(b) => {
                  void deleteBooks
                    .mutateAsync([b.id])
                    .then(() => {
                      toast.success('Book deleted', {
                        action: {
                          label: 'Undo',
                          onClick: () => {
                            void restoreBooks.mutateAsync([b])
                          },
                        },
                      })
                    })
                    .catch((err) =>
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : 'Could not delete',
                      ),
                    )
                }}
              />
              </div>
            )}
          />
        )}
      </div>

      {inspectorBook ? (
        <BookInspector
          book={inspectorBook}
          onClose={closeInspector}
          onFavorite={() =>
            void patchOne(inspectorBook.id, {
              is_favorite: !inspectorBook.is_favorite,
            })
          }
          onStatus={(statusNext) => {
            const stamps = readingTimestampsForStatus(
              statusNext,
              inspectorBook,
            )
            void patchOne(inspectorBook.id, {
              reading_status: statusNext,
              ...stamps,
            })
          }}
          onRating={(rating) => void patchOne(inspectorBook.id, { rating })}
        />
      ) : null}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function SelectableCard({
  book,
  selecting,
  selected,
  onToggle,
  onOpen,
  onFavorite,
  onStatus,
  onDelete,
}: {
  book: BookWithCreator
  selecting: boolean
  selected: boolean
  onToggle: () => void
  onOpen: () => void
  onFavorite: (book: BookWithCreator) => void
  onStatus: (book: BookWithCreator, status: ReadingStatus) => void
  onDelete: (book: BookWithCreator) => void
}) {
  if (!selecting) {
    return (
      <div style={{ contentVisibility: 'auto', containIntrinsicSize: '200px' }}>
        <BookCard
          book={book}
          onOpen={onOpen}
          onFavorite={onFavorite}
          onStatus={onStatus}
          onDelete={onDelete}
        />
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
