import { Link } from 'react-router-dom'
import { Heart, MapPin, X } from 'lucide-react'
import { CoverImage } from '@/components/CoverImage'
import { LanguageBadge } from '@/components/LanguageBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { StarRating } from '@/components/StarRating'
import { ReadingStatusSelect } from '@/components/ReadingStatusSelect'
import { Button } from '@/components/ui/button'
import {
  formatProgress,
  progressPercent,
  type ReadingStatus,
} from '@/lib/reading'
import type { BookWithCreator } from '@/hooks/useBooks'
import { cn } from '@/lib/utils'

export function BookInspector({
  book,
  onClose,
  onFavorite,
  onStatus,
  onRating,
}: {
  book: BookWithCreator
  onClose: () => void
  onFavorite: () => void
  onStatus: (status: ReadingStatus) => void
  onRating: (rating: number | null) => void
}) {
  const pct = progressPercent(book.current_page, book.page_count)
  const progress = formatProgress(book.current_page, book.page_count)

  return (
    <aside
      className={cn(
        'hidden w-[22rem] shrink-0 flex-col border-l border-border bg-card/40 lg:flex',
      )}
      aria-label="Book details"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Details
        </p>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onClose}
          aria-label="Close inspector"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="mx-auto w-36">
          <CoverImage url={book.cover_url} title={book.title} />
        </div>

        <div className="space-y-1 text-center">
          <h2 className="text-lg font-semibold leading-snug tracking-tight">
            {book.title}
          </h2>
          {book.author ? (
            <p className="text-sm text-muted-foreground">{book.author}</p>
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <StatusBadge status={book.reading_status} />
            <LanguageBadge code={book.language} />
          </div>
        </div>

        {pct != null ? (
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
            {progress ? (
              <p className="text-center text-xs text-muted-foreground">
                {progress}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <ReadingStatusSelect
            value={(book.reading_status as ReadingStatus) ?? 'unread'}
            onChange={onStatus}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Rating</p>
          <StarRating
            value={book.rating}
            onChange={onRating}
            size="md"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={book.is_favorite ? 'default' : 'outline'}
            onClick={onFavorite}
          >
            <Heart
              className={cn('h-4 w-4', book.is_favorite && 'fill-current')}
            />
            {book.is_favorite ? 'Favorited' : 'Favorite'}
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to={`/book/${book.id}`}>Open full</Link>
          </Button>
        </div>

        {book.shelf_location ? (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {book.shelf_location}
          </p>
        ) : null}

        {book.series ? (
          <p className="text-xs text-muted-foreground">
            Series · {book.series}
          </p>
        ) : null}

        {book.isbn ? (
          <p className="font-mono text-[11px] text-muted-foreground">
            {book.isbn}
          </p>
        ) : null}
      </div>
    </aside>
  )
}
