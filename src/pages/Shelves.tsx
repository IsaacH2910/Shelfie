import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CoverImage } from '@/components/CoverImage'
import { EmptyState } from '@/components/EmptyState'
import { FullScreenLoader } from '@/components/Spinner'
import { useBooks } from '@/hooks/useBooks'
import { useLibraryTaxonomy } from '@/hooks/useLibraryTaxonomy'
import { shelfUsage } from '@/lib/shelves'
import { shelfAccent } from '@/lib/shelfColors'
import { cn } from '@/lib/utils'

export default function ShelvesPage() {
  const { data: books = [], isLoading } = useBooks()
  const { managedShelves, shelfCapacities, setShelfCapacity, isSaving } =
    useLibraryTaxonomy()
  const [selected, setSelected] = useState<string | null>(null)
  const [capacityDrafts, setCapacityDrafts] = useState<Record<string, string>>(
    {},
  )

  const ownedOnShelf = useMemo(() => {
    if (!selected) return []
    const key = selected.toLowerCase()
    return books.filter(
      (b) =>
        (b.ownership ?? 'owned') === 'owned' &&
        (b.shelf_location ?? '').toLowerCase() === key,
    )
  }, [books, selected])

  if (isLoading && books.length === 0) return <FullScreenLoader />

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shelves</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capacity map of your physical shelves. Manage labels in Organize.
        </p>
      </div>

      {managedShelves.length === 0 ? (
        <EmptyState
          icon={<MapPin />}
          title="No shelves yet"
          description="Create shelf locations in Organize, then assign books to them."
          action={
            <Button asChild>
              <Link to="/organize#shelves">Manage shelves</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {managedShelves.map((shelf) => {
            const usage = shelfUsage(books, shelf)
            const capacity = shelfCapacities[shelf] ?? null
            const pct =
              capacity && capacity > 0
                ? Math.min(100, Math.round((usage / capacity) * 100))
                : null
            const over = capacity != null && usage > capacity
            const draft =
              capacityDrafts[shelf] ??
              (capacity != null ? String(capacity) : '')
            const accent = shelfAccent(shelf)

            return (
              <Card
                key={shelf}
                className={cn(
                  'cursor-pointer border-l-4 transition',
                  selected === shelf
                    ? 'ring-2 ring-primary/30'
                    : 'hover:border-primary/40',
                )}
                style={{ borderLeftColor: accent.css }}
                onClick={() =>
                  setSelected((s) => (s === shelf ? null : shelf))
                }
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-start justify-between gap-2 text-base">
                    <span className="flex min-w-0 items-center gap-2 break-words">
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: accent.css }}
                        aria-hidden
                      />
                      {shelf}
                    </span>
                    <Badge variant={over ? 'warning' : 'muted'}>
                      {capacity != null ? `${usage}/${capacity}` : usage}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {capacity != null
                      ? over
                        ? 'Over capacity'
                        : `${pct}% full`
                      : 'No capacity set'}
                  </CardDescription>
                </CardHeader>
                <CardContent
                  className="space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {capacity != null ? (
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          over ? 'bg-amber-500' : '',
                        )}
                        style={{
                          width: `${pct ?? 0}%`,
                          background: over ? undefined : accent.css,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-2 rounded-full bg-muted" />
                  )}
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label
                        htmlFor={`cap-${shelf}`}
                        className="text-xs text-muted-foreground"
                      >
                        Capacity
                      </Label>
                      <Input
                        id={`cap-${shelf}`}
                        type="number"
                        min={1}
                        placeholder="Books"
                        value={draft}
                        onChange={(e) =>
                          setCapacityDrafts((prev) => ({
                            ...prev,
                            [shelf]: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={isSaving}
                      onClick={() => {
                        const raw = draft.trim()
                        const n = raw === '' ? null : Number(raw)
                        void setShelfCapacity(
                          shelf,
                          n != null && Number.isFinite(n) && n > 0 ? n : null,
                        )
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {selected ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              Books on {selected}
              <span className="ml-2 font-normal text-muted-foreground">
                ({ownedOnShelf.length})
              </span>
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelected(null)}
            >
              Close
            </Button>
          </div>
          {ownedOnShelf.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No owned books on this shelf.
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {ownedOnShelf.map((book) => (
                <li key={book.id}>
                  <Link
                    to={`/book/${book.id}`}
                    className="block space-y-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <CoverImage url={book.cover_url} title={book.title} />
                    <p className="truncate text-xs font-medium">{book.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        Edit shelf names in{' '}
        <Link
          to="/organize#shelves"
          className="font-medium text-primary hover:underline"
        >
          Settings
        </Link>
        .
      </p>
    </div>
  )
}
