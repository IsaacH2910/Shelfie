import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  BookOpen,
  Flame,
  Gauge,
  Heart,
  LibraryBig,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
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
import { FullScreenLoader } from '@/components/Spinner'
import { useBooks } from '@/hooks/useBooks'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import {
  computeAchievements,
  computeLibraryStats,
  recommendNext,
} from '@/lib/analytics'
import { groupBySeries, suggestSeriesFills } from '@/lib/series'
import { getLanguage } from '@/lib/languages'
import { cn } from '@/lib/utils'
import { usePatchBooks } from '@/hooks/useBooks'

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 px-3 py-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold tracking-tight">{value}</p>
    </div>
  )
}

function MiniBarChart({
  title,
  items,
}: {
  title: string
  items: { label: string; count: number }[]
}) {
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground">
                  {item.label}
                </span>
                <span className="font-medium tabular-nums">{item.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default function StatsPage() {
  const { data: books = [], isLoading } = useBooks()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const patchBooks = usePatchBooks()
  const [goalDraft, setGoalDraft] = useState<string | null>(null)

  const stats = useMemo(() => computeLibraryStats(books), [books])
  const achievements = useMemo(
    () => computeAchievements(books, stats),
    [books, stats],
  )
  const nextReads = useMemo(() => recommendNext(books, 5), [books])
  const seriesGroups = useMemo(() => groupBySeries(books).slice(0, 6), [books])
  const seriesSuggestions = useMemo(
    () => suggestSeriesFills(books).slice(0, 8),
    [books],
  )

  const goal = profile?.yearly_reading_goal ?? null
  const goalInput =
    goalDraft ?? (goal != null ? String(goal) : '')
  const goalProgress =
    goal && goal > 0
      ? Math.min(100, Math.round((stats.finishedThisYear / goal) * 100))
      : null

  const languageBars = useMemo(() => {
    return Object.entries(stats.languages)
      .map(([code, count]) => ({
        label: getLanguage(code)?.name ?? (code === 'unknown' ? 'Unknown' : code),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [stats.languages])

  const saveGoal = () => {
    const raw = goalInput.trim()
    const value = raw === '' ? null : Number(raw)
    if (value != null && (!Number.isFinite(value) || value <= 0)) {
      toast.error('Goal must be a positive number')
      return
    }
    updateProfile.mutate(
      { yearly_reading_goal: value },
      {
        onSuccess: () => {
          setGoalDraft(null)
          toast.success(value ? 'Yearly goal updated' : 'Yearly goal cleared')
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  if (isLoading && books.length === 0) return <FullScreenLoader />

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stats</h1>
        <p className="text-sm text-muted-foreground">
          How your library and reading are growing.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={<LibraryBig className="h-3.5 w-3.5" />}
          label="Owned"
          value={String(stats.totalOwned)}
        />
        <StatCard
          icon={<BookOpen className="h-3.5 w-3.5" />}
          label="Finished"
          value={String(stats.finished)}
        />
        <StatCard
          icon={<Flame className="h-3.5 w-3.5" />}
          label="Streak"
          value={`${stats.streakDays}d`}
        />
        <StatCard
          icon={<Heart className="h-3.5 w-3.5" />}
          label="Favorites"
          value={String(stats.favorites)}
        />
        <StatCard
          icon={<BookOpen className="h-3.5 w-3.5" />}
          label="Pages read"
          value={String(stats.pagesRead)}
        />
        <StatCard
          icon={<Gauge className="h-3.5 w-3.5" />}
          label="Speed"
          value={stats.readingSpeedLabel}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            {new Date().getFullYear()} reading goal
          </CardTitle>
          <CardDescription>
            {stats.finishedThisYear} finished this year
            {goal ? ` · goal ${goal}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {goalProgress != null ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {stats.finishedThisYear} / {goal}
                </span>
                <span>{goalProgress}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="yearly-goal">Books this year</Label>
              <Input
                id="yearly-goal"
                type="number"
                min={1}
                className="w-28"
                placeholder="e.g. 24"
                value={goalInput}
                onChange={(e) => setGoalDraft(e.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={updateProfile.isPending}
              onClick={saveGoal}
            >
              Save goal
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <MiniBarChart title="Languages" items={languageBars} />
        <MiniBarChart
          title="Finished by month"
          items={stats.finishedByMonth.map((m) => ({
            label: m.label,
            count: m.count,
          }))}
        />
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Trophy className="h-4 w-4 text-primary" />
          Achievements
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={cn(
                'rounded-xl border px-3 py-3',
                a.unlocked
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-muted/30 opacity-60',
              )}
            >
              <p className="text-sm font-medium">{a.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {a.description}
              </p>
              {a.unlocked ? (
                <Badge variant="success" className="mt-2">
                  Unlocked
                </Badge>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          What should I read next?
        </h2>
        {nextReads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Add unread owned books to get recommendations.
          </p>
        ) : (
          <ul className="space-y-2">
            {nextReads.map((book) => (
              <li key={book.id}>
                <Link
                  to={`/book/${book.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 transition hover:bg-accent/40"
                >
                  <div className="w-10 shrink-0">
                    <CoverImage url={book.cover_url} title={book.title} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{book.title}</p>
                    {book.author ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {book.author}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {seriesGroups.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Series in your library</h2>
          <ul className="space-y-2">
            {seriesGroups.map((group) => (
              <li
                key={group.series}
                className="rounded-xl border border-border px-3 py-2.5"
              >
                <p className="text-sm font-medium">{group.series}</p>
                <p className="text-xs text-muted-foreground">
                  {group.books.length} books
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {seriesSuggestions.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Auto-detect series</CardTitle>
            <CardDescription>
              Titles that look like numbered series. Apply one or all.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {seriesSuggestions.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    → {item.series}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void patchBooks
                      .mutateAsync({
                        ids: [item.id],
                        patch: { series: item.series },
                      })
                      .then(() => toast.success('Series saved'))
                      .catch((e) =>
                        toast.error(
                          e instanceof Error ? e.message : 'Could not save',
                        ),
                      )
                  }}
                >
                  Apply
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                void Promise.all(
                  seriesSuggestions.map((item) =>
                    patchBooks.mutateAsync({
                      ids: [item.id],
                      patch: { series: item.series },
                    }),
                  ),
                )
                  .then(() => toast.success('Series applied'))
                  .catch((e) =>
                    toast.error(
                      e instanceof Error ? e.message : 'Could not save',
                    ),
                  )
              }}
            >
              Apply all suggestions
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
