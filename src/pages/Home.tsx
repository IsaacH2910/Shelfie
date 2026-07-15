import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Heart,
  LibraryBig,
  ScanBarcode,
  Sparkles,
  Target,
} from 'lucide-react'
import { CoverImage } from '@/components/CoverImage'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { BackendUnavailable } from '@/components/BackendUnavailable'
import { useAuth } from '@/context/AuthProvider'
import { useBooks } from '@/hooks/useBooks'
import { useProfile } from '@/hooks/useProfile'
import { progressPercent } from '@/lib/reading'
import { normalizeLanguageCode } from '@/lib/languages'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomePage() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const {
    data: books = [],
    isLoading,
    isBackendUnavailable,
    refetch,
    isFetching,
  } = useBooks()

  const name =
    profile?.display_name ||
    user?.email?.split('@')[0] ||
    'there'

  const currentlyReading = books.filter(
    (b) =>
      b.reading_status === 'reading' || b.reading_status === 'rereading',
  )
  const recent = [...books]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8)
  const wishlist = books
    .filter(
      (b) => b.ownership === 'wishlist' || b.ownership === 'want_to_buy',
    )
    .slice(0, 6)
  const favorites = books.filter((b) => b.is_favorite).slice(0, 6)
  const finished = books.filter((b) => b.reading_status === 'finished').length
  const authors = new Set(
    books.map((b) => b.author?.trim()).filter(Boolean) as string[],
  )
  const languages = new Set(
    books
      .map((b) => normalizeLanguageCode(b.language))
      .filter(Boolean),
  )
  const goal = profile?.yearly_reading_goal ?? null
  const year = new Date().getFullYear()
  const finishedThisYear = books.filter((b) => {
    if (b.reading_status !== 'finished' || !b.reading_finished_at) return false
    return new Date(b.reading_finished_at).getFullYear() === year
  }).length
  const goalPct =
    goal && goal > 0
      ? Math.min(100, Math.round((finishedThisYear / goal) * 100))
      : null

  if (isBackendUnavailable && books.length === 0) {
    return (
      <BackendUnavailable
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    )
  }

  if (isLoading && books.length === 0) {
    return (
      <div className="space-y-8 animate-in">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-48" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (books.length === 0) {
    return (
      <div className="space-y-6 animate-in">
        <header className="space-y-1">
          <p className="text-sm text-muted-foreground">{greeting()}</p>
          <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
        </header>
        <EmptyState
          icon={<LibraryBig />}
          title="Your library is empty"
          description="Scan a barcode, import a Goodreads export, or add your first book to get started."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/add?scan=barcode">
                  <ScanBarcode className="h-4 w-4" />
                  Scan book
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/settings#import-export">Import library</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/add">Add manually</Link>
              </Button>
            </div>
          }
        />
      </div>
    )
  }

  const hero = currentlyReading[0]

  return (
    <div className="space-y-8 animate-in">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{greeting()}</p>
        <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
      </header>

      {hero ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex gap-4 p-4 sm:gap-6 sm:p-5">
            <Link
              to={`/book/${hero.id}`}
              className="w-24 shrink-0 sm:w-28"
            >
              <CoverImage
                url={hero.cover_url}
                title={hero.title}
                className="shadow-md transition hover:-translate-y-0.5"
              />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Currently reading
                </p>
                <Link
                  to={`/book/${hero.id}`}
                  className="mt-1 block truncate text-xl font-semibold tracking-tight hover:underline sm:text-2xl"
                >
                  {hero.title}
                </Link>
                {hero.author ? (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {hero.author}
                  </p>
                ) : null}
              </div>
              {(() => {
                const pct = progressPercent(
                  hero.current_page,
                  hero.page_count,
                )
                return pct != null ? (
                  <div className="space-y-1.5">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{pct}% complete</p>
                  </div>
                ) : null
              })()}
              <Button asChild size="sm" className="w-fit">
                <Link to={`/book/${hero.id}`}>
                  Continue reading
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-6">
          <p className="text-sm font-medium">Nothing in progress</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a book from your library and mark it as reading.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link to="/library">Browse library</Link>
          </Button>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<LibraryBig className="h-4 w-4" />}
          label="Books"
          value={String(books.length)}
          to="/library"
        />
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Finished"
          value={String(finished)}
          to="/stats"
        />
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Authors"
          value={String(authors.size)}
          to="/stats"
        />
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label={goalPct != null ? 'Goal' : 'Languages'}
          value={
            goalPct != null ? `${goalPct}%` : String(languages.size)
          }
          to="/stats"
        />
      </div>

      {goal != null && goal > 0 ? (
        <section className="rounded-2xl border border-border bg-card/60 px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {year} reading goal
            </h2>
            <Link
              to="/stats"
              className="text-xs font-medium text-primary hover:underline"
            >
              Stats
            </Link>
          </div>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {finishedThisYear}
            <span className="text-base font-normal text-muted-foreground">
              {' '}
              / {goal}
            </span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${goalPct ?? 0}%` }}
            />
          </div>
        </section>
      ) : null}

      <ShelfRow title="Recently added" to="/library" books={recent} />

      {currentlyReading.length > 1 ? (
        <ShelfRow
          title="Also reading"
          to="/library?status=reading"
          books={currentlyReading.slice(1)}
        />
      ) : null}

      {wishlist.length > 0 ? (
        <ShelfRow title="Wishlist" to="/library?ownership=wishlist" books={wishlist} />
      ) : null}

      {favorites.length > 0 ? (
        <ShelfRow
          title="Favorites"
          to="/library?ownership=favorites"
          books={favorites}
          icon={<Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />}
        />
      ) : null}

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickLink to="/add?scan=barcode" label="Quick scan" />
        <QuickLink to="/search" label="Search" />
        <QuickLink to="/shop" label="Shop mode" />
        <QuickLink to="/organize" label="Organize" />
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  to,
}: {
  icon: ReactNode
  label: string
  value: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-border bg-card/60 px-3 py-3 transition hover:border-primary/30 hover:bg-accent/30"
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </Link>
  )
}

function ShelfRow({
  title,
  to,
  books,
  icon,
}: {
  title: string
  to: string
  books: { id: string; title: string; cover_url: string | null }[]
  icon?: ReactNode
}) {
  if (books.length === 0) return null
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          {icon}
          {title}
        </h2>
        <Link
          to={to}
          className="text-xs font-medium text-primary hover:underline"
        >
          See all
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {books.map((book) => (
          <Link
            key={book.id}
            to={`/book/${book.id}`}
            className="w-[4.5rem] shrink-0 space-y-1.5 outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring sm:w-20"
          >
            <CoverImage url={book.cover_url} title={book.title} />
            <p className="truncate text-[11px] font-medium leading-tight">
              {book.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-border bg-card/40 px-3 py-3 text-center text-sm font-medium transition hover:border-primary/40 hover:bg-accent/40"
    >
      {label}
    </Link>
  )
}
