import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ShoppingBag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CoverImage } from '@/components/CoverImage'
import { EmptyState } from '@/components/EmptyState'
import { FullScreenLoader } from '@/components/Spinner'
import { useBooks } from '@/hooks/useBooks'
import { matchShoppingQuery, type ShoppingMatch } from '@/lib/shopping'

const BADGE: Record<
  Exclude<ShoppingMatch['kind'], 'none'>,
  { label: string; variant: 'success' | 'warning' | 'secondary' | 'default' | 'muted' }
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shop mode</h1>
        <p className="text-sm text-muted-foreground">
          Check a title or ISBN before you buy — avoid doubles and spot wishlist
          hits.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, author, or ISBN…"
          className="pl-9"
          autoFocus
          data-testid="shop-search"
        />
      </div>

      {!query.trim() ? (
        <EmptyState
          icon={<ShoppingBag />}
          title="Ready when you are"
          description="Type a book title or scan an ISBN at the store to see if you already own it."
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
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition hover:bg-accent/40"
                >
                  <div className="w-12 shrink-0">
                    <CoverImage url={book.cover_url} title={book.title} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{book.title}</p>
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
