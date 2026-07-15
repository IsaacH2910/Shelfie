import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Languages, LibraryBig, Sparkles } from 'lucide-react'
import { CoverImage } from '@/components/CoverImage'
import { progressPercent } from '@/lib/reading'
import { normalizeLanguageCode } from '@/lib/languages'
import type { BookWithCreator } from '@/hooks/useBooks'

export function LibraryDashboard({ books }: { books: BookWithCreator[] }) {
  if (books.length === 0) return null

  const authors = new Set(
    books.map((b) => b.author?.trim()).filter(Boolean) as string[],
  )
  const languages = new Set(
    books
      .map((b) => normalizeLanguageCode(b.language))
      .filter(Boolean),
  )
  const finished = books.filter((b) => b.reading_status === 'finished').length
  const currentlyReading = books.filter(
    (b) =>
      b.reading_status === 'reading' || b.reading_status === 'rereading',
  )
  const recent = [...books]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          icon={<LibraryBig className="h-4 w-4" />}
          label="Books"
          value={String(books.length)}
        />
        <Stat
          icon={<Sparkles className="h-4 w-4" />}
          label="Authors"
          value={String(authors.size)}
        />
        <Stat
          icon={<Languages className="h-4 w-4" />}
          label="Languages"
          value={String(languages.size)}
        />
        <Stat
          icon={<BookOpen className="h-4 w-4" />}
          label="Finished"
          value={String(finished)}
        />
      </div>

      {currentlyReading.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            Currently reading
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {currentlyReading.map((book) => {
              const pct = progressPercent(book.current_page, book.page_count)
              return (
                <Link
                  key={book.id}
                  to={`/book/${book.id}`}
                  className="w-28 shrink-0 space-y-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="relative">
                    <CoverImage url={book.cover_url} title={book.title} />
                    {pct != null ? (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                  <p className="truncate text-xs font-medium">{book.title}</p>
                  {pct != null ? (
                    <p className="text-[11px] text-muted-foreground">{pct}%</p>
                  ) : null}
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            Recently added
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recent.map((book) => (
              <Link
                key={book.id}
                to={`/book/${book.id}`}
                className="w-20 shrink-0 space-y-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CoverImage url={book.cover_url} title={book.title} />
                <p className="truncate text-[11px] font-medium">{book.title}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}
