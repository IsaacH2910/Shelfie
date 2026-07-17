import { Link } from 'react-router-dom'
import { Heart, MapPin } from 'lucide-react'
import { CoverImage } from '@/components/CoverImage'
import { LanguageBadge } from '@/components/LanguageBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { StarRating } from '@/components/StarRating'
import type { BookWithCreator } from '@/hooks/useBooks'
import { cn } from '@/lib/utils'

export function BookListRow({
  book,
  selected,
  selecting,
  onSelect,
  onOpen,
}: {
  book: BookWithCreator
  selected?: boolean
  selecting?: boolean
  onSelect?: () => void
  onOpen?: () => void
}) {
  const content = (
    <>
      <div className="w-14 shrink-0 sm:w-16">
        <CoverImage url={book.cover_url} title={book.title} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold tracking-tight">
            {book.title}
          </p>
          {book.is_favorite ? (
            <Heart className="h-3.5 w-3.5 shrink-0 fill-red-500 text-red-500" />
          ) : null}
        </div>
        {book.author ? (
          <p className="truncate text-xs text-muted-foreground">{book.author}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={book.reading_status} short />
          <LanguageBadge code={book.language} showLabel={false} />
          {book.rating ? <StarRating value={book.rating} size="sm" /> : null}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {book.shelf_location ? (
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {book.shelf_location}
            </span>
          ) : null}
          {book.isbn ? (
            <span className="font-mono">{book.isbn}</span>
          ) : null}
          {book.publisher ? <span>{book.publisher}</span> : null}
        </div>
      </div>
    </>
  )

  if (selecting) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-left transition hover:bg-accent/40',
          selected && 'border-primary ring-1 ring-primary',
        )}
      >
        {content}
      </button>
    )
  }

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-left transition hover:bg-accent/40"
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      to={`/book/${book.id}`}
      className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition hover:bg-accent/40"
    >
      {content}
    </Link>
  )
}
