import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import {
  Check,
  Download,
  Keyboard,
  Link2,
  LogOut,
  Monitor,
  Moon,
  Sun,
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
import { ImportExportPanel } from '@/components/ImportExportPanel'
import { DesktopUpdateCard } from '@/components/DesktopUpdateCard'
import { useTheme } from '@/components/theme-provider'
import { useAuth } from '@/context/AuthProvider'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { isTauri } from '@/lib/platform'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState('')
  const [linkingGoogle, setLinkingGoogle] = useState(false)

  const googleLinked =
    user?.identities?.some((identity) => identity.provider === 'google') ?? false

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name)
  }, [profile?.display_name])

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const el = document.getElementById(hash)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  const linkGoogle = async () => {
    setLinkingGoogle(true)
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/settings#account' },
    })
    if (error) {
      toast.error(error.message)
      setLinkingGoogle(false)
    }
  }

  const TOC = [
    { href: '#import-export', label: 'Import' },
    { href: '#shortcuts', label: 'Shortcuts' },
    { href: '#appearance', label: 'Appearance' },
    ...(isTauri() ? ([{ href: '#desktop', label: 'Desktop' }] as const) : []),
    { href: '#account', label: 'Account' },
  ] as const

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-in">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Profile, backups, appearance, and account.
          </p>
        </div>
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
            Desktop shortcuts while you’re not typing in a field. Press ? for a
            cheatsheet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Open search</span>
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
            <li className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Library navigate</span>
              <kbd className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                J / K
              </kbd>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            On Windows / Linux, use Ctrl instead of ⌘.
          </p>
        </CardContent>
      </Card>

      <Card id="appearance">
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Choose how Shelfie looks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
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

      <DesktopUpdateCard />

      <Card id="account">
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Sign-in methods</p>
            {googleLinked ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <GoogleIcon />
                Google linked
                <Check className="h-3.5 w-3.5 text-primary" />
              </p>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={linkingGoogle}
                onClick={() => void linkGoogle()}
              >
                <GoogleIcon />
                {linkingGoogle ? 'Opening Google…' : 'Link Google'}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Link Gmail so you can sign in with Google or email on any device.
            </p>
          </div>
          {!isTauri() ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/download">
                <Download className="h-4 w-4" />
                Install app
              </Link>
            </Button>
          ) : null}
          <div>
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => void signOut()}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
