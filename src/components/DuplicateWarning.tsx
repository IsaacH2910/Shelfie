import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { getLanguage } from '@/lib/languages'
import type { DuplicateMatch } from '@/lib/duplicates'

export function DuplicateWarning({
  matches,
  onDismissLink,
}: {
  matches: DuplicateMatch[]
  onDismissLink?: () => void
}) {
  if (matches.length === 0) return null

  const languages = [
    ...new Set(
      matches
        .map(({ book }) => getLanguage(book.language)?.name ?? book.language)
        .filter(Boolean),
    ),
  ]

  return (
    <div className="animate-fade-in rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm">
      <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
        <TriangleAlert className="h-4 w-4" />
        You may already own {matches.length === 1 ? 'this book' : 'these'}
      </div>
      {languages.length > 0 ? (
        <p className="mt-1.5 text-xs text-amber-800/80 dark:text-amber-300/80">
          Also owned in {languages.join(', ')} — different editions are fine to
          keep.
        </p>
      ) : null}
      <ul className="mt-2 space-y-1.5">
        {matches.map(({ book, reason }) => {
          const language = getLanguage(book.language)
          return (
            <li
              key={book.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5"
            >
              <Link
                to={`/book/${book.id}`}
                onClick={onDismissLink}
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                {book.title}
              </Link>
              {language ? (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                  {language.flag} {language.name}
                </span>
              ) : null}
              {book.shelf_location ? (
                <span className="text-muted-foreground">
                  · {book.shelf_location}
                </span>
              ) : null}
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                {reason === 'isbn' ? 'same ISBN' : 'same title'}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        You can still add it — handy for duplicates or a different translation.
      </p>
    </div>
  )
}
