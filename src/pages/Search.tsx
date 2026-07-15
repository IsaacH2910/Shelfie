import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookMarked,
  Clock,
  Heart,
  Search as SearchIcon,
  Sparkles,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { CoverImage } from '@/components/CoverImage'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/EmptyState'
import { FullScreenLoader } from '@/components/Spinner'
import { useBooks } from '@/hooks/useBooks'
import { normalizeIsbn, normalizeText } from '@/lib/duplicates'
import { cn } from '@/lib/utils'

const RECENT_KEY = 'shelfie_recent_searches'
const MAX_RECENT = 8

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed
          .filter((x): x is string => typeof x === 'string')
          .slice(0, MAX_RECENT)
      : []
  } catch {
    return []
  }
}

function saveRecent(query: string) {
  const next = [
    query,
    ...loadRecent().filter((q) => q.toLowerCase() !== query.toLowerCase()),
  ].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

const SUGGESTIONS = [
  { label: 'Unread', to: '/library?status=unread' },
  { label: 'Reading', to: '/library?status=reading' },
  { label: 'Finished', to: '/library?status=finished' },
  { label: 'Wishlist', to: '/library?ownership=wishlist' },
  { label: 'Favorites', to: '/library?ownership=favorites' },
  { label: 'Recently added', to: '/library?sort=recent' },
] as const

export default function SearchPage() {
  const navigate = useNavigate()
  const { data: books = [], isLoading } = useBooks()
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>(() => loadRecent())

  useEffect(() => {
    document.getElementById('spotlight-search')?.focus()
  }, [])

  const results = useMemo(() => {
    const q = query.trim()
    if (!q) return []
    const qNorm = normalizeText(q)
    const qIsbn = normalizeIsbn(q)
    return books
      .filter((book) => {
        if (qIsbn.length >= 10 && normalizeIsbn(book.isbn) === qIsbn) {
          return true
        }
        const hay = normalizeText(
          [
            book.title,
            book.author,
            book.series,
            book.publisher,
            book.shelf_location,
            ...(book.categories ?? []),
            ...(book.collections ?? []),
          ]
            .filter(Boolean)
            .join(' '),
        )
        return hay.includes(qNorm)
      })
      .slice(0, 40)
  }, [books, query])

  const authors = useMemo(() => {
    const counts = new Map<string, number>()
    for (const book of books) {
      const a = book.author?.trim()
      if (!a) continue
      counts.set(a, (counts.get(a) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  }, [books])

  const commitSearch = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    saveRecent(trimmed)
    setRecent(loadRecent())
    setQuery(trimmed)
  }

  if (isLoading && books.length === 0) return <FullScreenLoader />

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Find books by title, author, ISBN, series, or shelf.
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="spotlight-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitSearch(query)
          }}
          placeholder="Search books…"
          className="h-12 rounded-xl pl-10 text-base"
          type="search"
          autoComplete="off"
          data-testid="spotlight-search"
        />
      </div>

      {!query.trim() ? (
        <div className="space-y-6">
          {recent.length > 0 ? (
            <section className="space-y-2">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Recent
              </h2>
              <ul className="space-y-0.5">
                {recent.map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => commitSearch(item)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-accent/50"
                    >
                      <SearchIcon className="h-4 w-4 text-muted-foreground" />
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Suggestions
            </h2>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </section>

          {authors.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Authors
              </h2>
              <div className="flex flex-wrap gap-2">
                {authors.map(([author, count]) => (
                  <button
                    key={author}
                    type="button"
                    onClick={() => commitSearch(author)}
                    className="rounded-full border border-border px-3 py-1.5 text-sm transition hover:border-primary/40"
                  >
                    {author}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<BookMarked />}
          title="No matches"
          description={`Nothing matched “${query.trim()}”. Try another spelling or browse the library.`}
          action={
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => navigate('/library')}
            >
              Browse library
            </button>
          }
        />
      ) : (
        <ul className="space-y-1">
          <p className="px-1 text-xs text-muted-foreground">
            {results.length} result{results.length === 1 ? '' : 's'}
          </p>
          {results.map((book) => (
            <li key={book.id}>
              <Link
                to={`/book/${book.id}`}
                onClick={() => commitSearch(query)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-accent/40',
                )}
              >
                <div className="w-11 shrink-0">
                  <CoverImage url={book.cover_url} title={book.title} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{book.title}</p>
                  {book.author ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {book.author}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {book.is_favorite ? (
                    <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                  ) : null}
                  <StatusBadge status={book.reading_status} short />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
