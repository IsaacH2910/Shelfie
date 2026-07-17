import { Link } from 'react-router-dom'
import {
  BookOpen,
  Check,
  Heart,
  MapPin,
  MoreHorizontal,
  Users,
} from 'lucide-react'
import { CoverImage } from '@/components/CoverImage'
import { LanguageBadge } from '@/components/LanguageBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { StarRating } from '@/components/StarRating'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  progressPercent,
  type ReadingStatus,
} from '@/lib/reading'
import type { BookWithCreator } from '@/hooks/useBooks'
import { cn } from '@/lib/utils'

const STATUS_CYCLE: ReadingStatus[] = ['unread', 'reading', 'finished']

function nextStatus(current: string | null | undefined): ReadingStatus {
  const idx = STATUS_CYCLE.indexOf(
    (current as ReadingStatus) ?? 'unread',
  )
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}

export function BookCard({
  book,
  onOpen,
  onFavorite,
  onStatus,
  onDelete,
}: {
  book: BookWithCreator
  onOpen?: () => void
  onFavorite?: (book: BookWithCreator) => void
  onStatus?: (book: BookWithCreator, status: ReadingStatus) => void
  onDelete?: (book: BookWithCreator) => void
}) {
  const pct = progressPercent(book.current_page, book.page_count)
  const showProgress =
    (book.reading_status === 'reading' ||
      book.reading_status === 'rereading' ||
      book.reading_status === 'paused') &&
    pct != null

  const cover = (
    <div className="relative">
      <CoverImage
        url={book.cover_url}
        title={book.title}
        className="transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg group-active:scale-[0.98]"
      />
      <div className="absolute right-1.5 top-1.5 flex flex-col gap-1">
        {book.is_favorite ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-red-400 backdrop-blur-sm">
            <Heart className="h-3.5 w-3.5 fill-current" />
          </span>
        ) : null}
        {book.household_id ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
            <Users className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      {book.ownership && book.ownership !== 'owned' ? (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {book.ownership === 'wishlist' ? 'Wish' : 'Want'}
        </span>
      ) : null}
      {showProgress ? (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/25">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  )

  const meta = (
    <div className="min-w-0 space-y-1 px-0.5">
      <p className="line-clamp-2 text-[13px] font-semibold leading-snug tracking-tight text-foreground sm:text-sm">
        {book.title}
      </p>
      {book.author ? (
        <p className="truncate text-xs text-muted-foreground">{book.author}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <StatusBadge status={book.reading_status} short />
        <LanguageBadge code={book.language} showLabel={false} />
      </div>
      {book.rating ? <StarRating value={book.rating} size="sm" /> : null}
      {book.shelf_location ? (
        <p className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{book.shelf_location}</span>
        </p>
      ) : null}
    </div>
  )

  return (
    <div className="group relative flex flex-col gap-2.5 animate-in">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex flex-col gap-2.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {cover}
          {meta}
        </button>
      ) : (
        <Link
          to={`/book/${book.id}`}
          className="flex flex-col gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {cover}
          {meta}
        </Link>
      )}

      {(onFavorite || onStatus) && (
        <div className="absolute left-1 bottom-[4.5rem] z-10 flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 sm:bottom-[5rem]">
          {onFavorite ? (
            <button
              type="button"
              aria-label={book.is_favorite ? 'Unfavorite' : 'Favorite'}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-background/95 text-muted-foreground shadow-sm ring-1 ring-border hover:text-red-500"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onFavorite(book)
              }}
            >
              <Heart
                className={cn(
                  'h-3.5 w-3.5',
                  book.is_favorite && 'fill-red-500 text-red-500',
                )}
              />
            </button>
          ) : null}
          {onStatus ? (
            <button
              type="button"
              aria-label="Cycle reading status"
              title="Cycle status"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-background/95 text-muted-foreground shadow-sm ring-1 ring-border hover:text-foreground"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onStatus(book, nextStatus(book.reading_status))
              }}
            >
              {book.reading_status === 'finished' ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <BookOpen className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
        </div>
      )}

      {(onFavorite || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Book actions"
              className={cn(
                'absolute right-0 top-0 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm ring-1 ring-border transition hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100',
              )}
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link to={`/book/${book.id}`}>Open</Link>
            </DropdownMenuItem>
            {onFavorite ? (
              <DropdownMenuItem onClick={() => onFavorite(book)}>
                <Heart className="h-4 w-4" />
                {book.is_favorite ? 'Unfavorite' : 'Favorite'}
              </DropdownMenuItem>
            ) : null}
            {onDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(book)}
                >
                  Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
