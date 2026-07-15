import { Link } from 'react-router-dom'
import { Heart, MapPin, Tag, Users } from 'lucide-react'
import { CoverImage } from '@/components/CoverImage'
import { LanguageBadge } from '@/components/LanguageBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { StarRating } from '@/components/StarRating'
import { progressPercent } from '@/lib/reading'
import type { BookWithCreator } from '@/hooks/useBooks'

export function BookCard({ book }: { book: BookWithCreator }) {
  const categories = book.categories ?? []
  const pct = progressPercent(book.current_page, book.page_count)
  const showProgress =
    (book.reading_status === 'reading' ||
      book.reading_status === 'rereading' ||
      book.reading_status === 'paused') &&
    pct != null

  return (
    <Link
      to={`/book/${book.id}`}
      className="group flex flex-col gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative">
        <CoverImage
          url={book.cover_url}
          title={book.title}
          className="transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-active:scale-[0.98]"
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
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
            <div
              className="h-full bg-primary"
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : null}
      </div>
      <div className="min-w-0 px-0.5">
        <p className="truncate text-sm font-semibold leading-snug text-foreground">
          {book.title}
        </p>
        {book.author ? (
          <p className="truncate text-xs text-muted-foreground">
            {book.author}
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={book.reading_status} short />
          <LanguageBadge code={book.language} showLabel={false} />
          {book.rating ? (
            <StarRating value={book.rating} size="sm" />
          ) : null}
          {categories.slice(0, 1).map((label) => (
            <span
              key={label.toLowerCase()}
              className="inline-flex max-w-full items-center gap-0.5 truncate text-xs text-muted-foreground"
            >
              <Tag className="h-3 w-3 shrink-0" />
              <span className="truncate">{label}</span>
            </span>
          ))}
          {book.shelf_location ? (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{book.shelf_location}</span>
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
