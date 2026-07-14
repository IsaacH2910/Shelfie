import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, Download, LogOut, Monitor, Moon, Share, Sun } from 'lucide-react'
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
import { useTheme } from '@/components/theme-provider'
import { useAuth } from '@/context/AuthProvider'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { cn } from '@/lib/utils'

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
  const install = usePwaInstall()
  const [name, setName] = useState('')

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name)
  }, [profile?.display_name])

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
