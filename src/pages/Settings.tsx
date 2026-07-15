import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import {
  Check,
  FolderOpen,
  Keyboard,
  Link2,
  LogOut,
  MapPin,
  Monitor,
  Moon,
  Sparkles,
  Sun,
  Tag,
  Bug,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { TaxonomyManager } from '@/components/TaxonomyManager'
import { ImportExportPanel } from '@/components/ImportExportPanel'
import { CrashLogPanel } from '@/components/CrashLogPanel'
import { InstallAppCard } from '@/components/InstallAppCard'
import { useTheme } from '@/components/theme-provider'
import { useAuth } from '@/context/AuthProvider'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { useLibraryTaxonomy } from '@/hooks/useLibraryTaxonomy'
import { collectCategories } from '@/lib/categories'
import { DEFAULT_COLLECTIONS } from '@/lib/collections'
import { collectShelves, SHELF_SEP } from '@/lib/shelves'
import { useBooks } from '@/hooks/useBooks'
import { cn } from '@/lib/utils'

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

function QuickStart({
  label,
  suggestions,
  onPick,
  disabled,
}: {
  label: string
  suggestions: string[]
  onPick: (label: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((item) => (
          <button
            key={item}
            type="button"
            disabled={disabled}
            onClick={() => onPick(item)}
            className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:bg-accent/40 hover:text-foreground"
          >
            + {item}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState('')
  const { data: books } = useBooks()
  const taxonomy = useLibraryTaxonomy()

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name)
  }, [profile?.display_name])

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const el = document.getElementById(hash)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const saveName = () => {
    if (!name.trim()) return
    updateProfile.mutate(
      { display_name: name },
      {
        onSuccess: () => toast.success('Name updated'),
        onError: (e) => toast.error(e.message),
      },
    )
  }

  const orphanCategories = collectCategories(books ?? []).filter(
    (c) =>
      !taxonomy.managedCategories.some(
        (m) => m.toLowerCase() === c.toLowerCase(),
      ),
  )
  const orphanShelves = collectShelves(books ?? []).filter(
    (s) =>
      !taxonomy.managedShelves.some((m) => m.toLowerCase() === s.toLowerCase()),
  )
  const canImport = orphanCategories.length > 0 || orphanShelves.length > 0

  const reopenTips = () => {
    updateProfile.mutate(
      { onboarding_completed: false },
      {
        onSuccess: () => toast.success('Tips will show again'),
        onError: (e) => toast.error(e.message),
      },
    )
  }

  const TOC = [
    { href: '#install', label: 'Download' },
    { href: '#shelves', label: 'Shelves' },
    { href: '#collections', label: 'Collections' },
    { href: '#categories', label: 'Categories' },
    { href: '#import-export', label: 'Import' },
    { href: '#shortcuts', label: 'Shortcuts' },
    { href: '#diagnostics', label: 'Diagnostics' },
  ] as const

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <nav
          aria-label="Settings sections"
          className="flex gap-1.5 overflow-x-auto pb-0.5"
        >
          {TOC.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <InstallAppCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            This name shows on books you add to a shared household.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Display name</Label>
            <div className="flex gap-2">
              <Input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
              <Button
                onClick={saveName}
                disabled={
                  updateProfile.isPending ||
                  name.trim() === (profile?.display_name ?? '')
                }
              >
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="shelves">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Shelf locations
          </CardTitle>
          <CardDescription>
            Name the places books live in your home. When you add a book, you’ll
            pick one from a list — no typing every time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {taxonomy.managedShelves.length === 0 ? (
            <QuickStart
              label="Try these"
              suggestions={[
                'Living room',
                'Bedroom',
                'Office',
                'Kids room',
              ]}
              onPick={(label) => void taxonomy.addShelf(label)}
              disabled={taxonomy.isSaving}
            />
          ) : null}
          <TaxonomyManager
            labels={taxonomy.managedShelves}
            emptyHint={`Use “${SHELF_SEP.trim()}” for hierarchy, e.g. Living room${SHELF_SEP}Shelf A.`}
            addPlaceholder={`e.g. Living room${SHELF_SEP}Shelf A`}
            onAdd={taxonomy.addShelf}
            onRename={taxonomy.renameShelf}
            onRemove={taxonomy.removeShelf}
            busy={taxonomy.isSaving}
          />
          <p className="text-xs text-muted-foreground">
            Set capacities and browse a shelf map on{' '}
            <Link to="/shelves" className="font-medium text-primary hover:underline">
              Shelves
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card id="collections">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            Collections
          </CardTitle>
          <CardDescription>
            Group books beyond categories — Favorites, School, Signed Copies…
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {taxonomy.managedCollections.length === 0 ? (
            <QuickStart
              label="Try these"
              suggestions={[...DEFAULT_COLLECTIONS].slice(0, 6)}
              onPick={(label) => void taxonomy.addCollection(label)}
              disabled={taxonomy.isSaving}
            />
          ) : null}
          <TaxonomyManager
            labels={taxonomy.managedCollections}
            emptyHint="Create collections you reuse often."
            addPlaceholder="e.g. Signed Copies"
            onAdd={taxonomy.addCollection}
            onRename={taxonomy.renameCollection}
            onRemove={taxonomy.removeCollection}
            busy={taxonomy.isSaving}
          />
        </CardContent>
      </Card>

      <Card id="categories">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4 text-muted-foreground" />
            Categories
          </CardTitle>
          <CardDescription>
            Labels you reuse across books — Fiction, Kids, To read, School…
            Tap them on the add-book form; filter by them in your library.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {taxonomy.managedCategories.length === 0 ? (
            <QuickStart
              label="Try these"
              suggestions={[
                'Fiction',
                'Non-fiction',
                'Kids',
                'To read',
                'Reference',
              ]}
              onPick={(label) => void taxonomy.addCategory(label)}
              disabled={taxonomy.isSaving}
            />
          ) : null}
          <TaxonomyManager
            labels={taxonomy.managedCategories}
            emptyHint="Add a few categories you actually use. Keep the list short."
            addPlaceholder="e.g. Fiction"
            onAdd={taxonomy.addCategory}
            onRename={taxonomy.renameCategory}
            onRemove={taxonomy.removeCategory}
            busy={taxonomy.isSaving}
          />
          {canImport ? (
            <div className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
              Found {orphanCategories.length + orphanShelves.length} label
              {orphanCategories.length + orphanShelves.length === 1
                ? ''
                : 's'}{' '}
              already on books that aren’t in your lists yet.{' '}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                disabled={taxonomy.isSaving}
                onClick={() => void taxonomy.importFromBooks()}
              >
                Import them
              </button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card id="import-export">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            Import & export
          </CardTitle>
          <CardDescription>
            Back up your library or bring books from CSV / JSON (including
            Goodreads exports).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportExportPanel />
        </CardContent>
      </Card>

      <Card id="shortcuts">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            Keyboard shortcuts
          </CardTitle>
          <CardDescription>
            Desktop shortcuts while you’re not typing in a field.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Focus library search</span>
              <kbd className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                ⌘K
              </kbd>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Add a book</span>
              <kbd className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                ⌘N
              </kbd>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Open shop mode</span>
              <kbd className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                ⌘⇧S
              </kbd>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            On Windows / Linux, use Ctrl instead of ⌘.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reopenTips}
            disabled={updateProfile.isPending}
          >
            <Sparkles className="h-4 w-4" />
            Show welcome tips again
          </Button>
        </CardContent>
      </Card>

      <Card id="diagnostics">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bug className="h-4 w-4 text-muted-foreground" />
            Diagnostics
          </CardTitle>
          <CardDescription>
            Local crash log for this device — export if something breaks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CrashLogPanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Choose how Shelfie looks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors',
                  theme === value
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-border text-muted-foreground hover:bg-accent/50',
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
                {theme === value ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : null}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => void signOut()}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
