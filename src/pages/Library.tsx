import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookPlus, LibraryBig, ScanBarcode, Search } from 'lucide-react'
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
import { BackendUnavailable } from '@/components/BackendUnavailable'
import { EmptyState } from '@/components/EmptyState'
import { useBooks } from '@/hooks/useBooks'
import { useAuth } from '@/context/AuthProvider'
import {
  bookHasCategory,
  collectCategories,
} from '@/lib/categories'
import { getLanguage } from '@/lib/languages'
import { normalizeIsbn, normalizeText } from '@/lib/duplicates'
import { cn } from '@/lib/utils'

type Scope = 'all' | 'mine' | 'shared'
type Sort = 'recent' | 'title' | 'author'

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
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [language, setLanguage] = useState('all')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<Sort>('recent')

  const languagesPresent = useMemo(() => {
    const codes = new Set<string>()
    for (const book of books ?? []) {
      if (book.language) codes.add(book.language)
    }
    return Array.from(codes)
  }, [books])

  const categoriesPresent = useMemo(
    () => collectCategories(books ?? []),
    [books],
  )

  const filtered = useMemo(() => {
    const q = normalizeText(query)
    const isbnQ = normalizeIsbn(query)
    let list = (books ?? []).filter((book) => {
      if (scope === 'mine' && book.created_by !== user?.id) return false
      if (scope === 'shared' && !book.household_id) return false
      if (language !== 'all' && book.language !== language) return false
      if (category !== 'all' && !bookHasCategory(book, category)) return false
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
        normalizeText(book.shelf_location).includes(q)
      )
    })
    list = [...list].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title)
      if (sort === 'author')
        return (a.author ?? '').localeCompare(b.author ?? '')
      return b.created_at.localeCompare(a.created_at)
    })
    return list
  }, [books, query, scope, language, category, sort, user?.id])

  const total = books?.length ?? 0

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

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, author, ISBN, shelf or category…"
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

          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="h-9 w-auto min-w-[7rem] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently added</SelectItem>
              <SelectItem value="title">Title A–Z</SelectItem>
              <SelectItem value="author">Author A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
            description="Add your first book by scanning its barcode, snapping the cover, or entering the details by hand."
            action={
              <Button asChild>
                <Link to="/add">
                  <BookPlus className="h-4 w-4" />
                  Add a book
                </Link>
              </Button>
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
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
