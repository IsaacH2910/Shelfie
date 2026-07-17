import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScanBarcode, Search, ShoppingBag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CoverImage } from '@/components/CoverImage'
import { EmptyState } from '@/components/EmptyState'
import { FullScreenLoader } from '@/components/Spinner'
import { useBooks } from '@/hooks/useBooks'
import { matchShoppingQuery, type ShoppingMatch } from '@/lib/shopping'
import { cn } from '@/lib/utils'

const BADGE: Record<
  Exclude<ShoppingMatch['kind'], 'none'>,
  {
    label: string
    variant: 'success' | 'warning' | 'secondary' | 'default' | 'muted'
  }
> = {
  owned: { label: 'Owned', variant: 'success' },
  edition: { label: 'Different edition', variant: 'warning' },
  wishlist: { label: 'Wishlist', variant: 'secondary' },
  want: { label: 'Want to buy', variant: 'default' },
}

export default function ShopPage() {
  const { data: books = [], isLoading } = useBooks()
  const [query, setQuery] = useState('')

  const { matches } = useMemo(
    () => matchShoppingQuery(query, books),
    [query, books],
  )

  if (isLoading && books.length === 0) return <FullScreenLoader />

  return (
    <div
      className={cn(
        'mx-auto space-y-6',
        !query.trim() ? 'max-w-lg' : 'max-w-2xl',
      )}
    >
      <div className="text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Shop mode
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Already own it?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Check before you buy — catch doubles and wishlist hits instantly.
        </p>
      </div>

      <Button
        asChild
        size="lg"
        className="h-16 w-full text-base font-semibold shadow-md sm:h-14"
      >
        <Link to="/add?scan=barcode">
          <ScanBarcode className="h-6 w-6" />
          Scan ISBN at the store
        </Link>
      </Button>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Or type a title, author, or ISBN…"
          className="h-12 pl-9 text-base"
          autoFocus
          data-testid="shop-search"
        />
      </div>

      {!query.trim() ? (
        <EmptyState
          icon={<ShoppingBag />}
          title="Ready when you are"
          description="Scan a barcode or type a title — we’ll tell you if it’s already on your shelves."
          className="border-0 bg-transparent py-8"
        />
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title="Not owned"
          description="Nothing in your library matches. Want to add it?"
          action={
            <Button asChild>
              <Link to={`/add?q=${encodeURIComponent(query.trim())}`}>
                Add “{query.trim()}”
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {matches.map((match) => {
            if (match.kind === 'none') return null
            const badge = BADGE[match.kind]
            const book = match.book
            return (
              <li key={`${match.kind}-${book.id}`}>
                <Link
                  to={`/book/${book.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-3 transition hover:bg-accent/40"
                >
                  <div className="w-14 shrink-0 sm:w-16">
                    <CoverImage url={book.cover_url} title={book.title} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {book.title}
                      </p>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    {book.author ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {book.author}
                      </p>
                    ) : null}
                    {book.isbn ? (
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {book.isbn}
                      </p>
                    ) : null}
                    {book.shelf_location ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Shelf · {book.shelf_location}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            )
          })}
          <li className="pt-2 text-center">
            <Button asChild variant="outline" size="sm">
              <Link to={`/add?q=${encodeURIComponent(query.trim())}`}>
                Add as new book
              </Link>
            </Button>
          </li>
        </ul>
      )}
    </div>
  )
}
