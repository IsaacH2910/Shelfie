import { Link } from 'react-router-dom'
import { MapPin, Tag, Users } from 'lucide-react'
import { CoverImage } from '@/components/CoverImage'
import { LanguageBadge } from '@/components/LanguageBadge'
import type { BookWithCreator } from '@/hooks/useBooks'

export function BookCard({ book }: { book: BookWithCreator }) {
  const categories = book.categories ?? []

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
        {book.household_id ? (
          <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
            <Users className="h-3.5 w-3.5" />
          </span>
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
          <LanguageBadge code={book.language} showLabel={false} />
          {categories.slice(0, 2).map((label) => (
            <span
              key={label.toLowerCase()}
              className="inline-flex max-w-full items-center gap-0.5 truncate text-xs text-muted-foreground"
            >
              <Tag className="h-3 w-3 shrink-0" />
              <span className="truncate">{label}</span>
            </span>
          ))}
          {categories.length > 2 ? (
            <span className="text-xs text-muted-foreground">
              +{categories.length - 2}
            </span>
          ) : null}
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
