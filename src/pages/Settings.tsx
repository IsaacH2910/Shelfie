import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Check,
  Download,
  LogOut,
  MapPin,
  Monitor,
  Moon,
  Share,
  Sun,
  Tag,
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
import { useTheme } from '@/components/theme-provider'
import { useAuth } from '@/context/AuthProvider'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { useLibraryTaxonomy } from '@/hooks/useLibraryTaxonomy'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { collectCategories } from '@/lib/categories'
import { collectShelves } from '@/lib/shelves'
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
  const install = usePwaInstall()
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

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
            emptyHint="Add places like “Living room · Shelf A” or “Bedroom nightstand”."
            addPlaceholder="e.g. Living room · Shelf A"
            onAdd={taxonomy.addShelf}
            onRename={taxonomy.renameShelf}
            onRemove={taxonomy.removeShelf}
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

      {!install.installed ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Install the app</CardTitle>
            <CardDescription>
              Add Shelfie to your home screen for quick access at the bookshop.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {install.canInstall ? (
              <Button onClick={() => void install.promptInstall()}>
                <Download className="h-4 w-4" />
                Install Shelfie
              </Button>
            ) : install.isIos ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                Tap <Share className="inline h-4 w-4" /> then “Add to Home
                Screen”.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Use your browser’s “Install app” option in the address bar.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

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
