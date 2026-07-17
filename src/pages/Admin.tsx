import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Bug,
  Download,
  RefreshCw,
  Sparkles,
  Trash2,
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
import { CrashLogPanel } from '@/components/CrashLogPanel'
import { Spinner } from '@/components/Spinner'
import { useUpdateProfile } from '@/hooks/useProfile'
import { queryClient } from '@/lib/queryClient'
import {
  clearAdminToken,
  isAdminSessionValid,
  unlockAdminWithPassword,
} from '@/lib/adminSession'

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(() => isAdminSessionValid())
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const updateProfile = useUpdateProfile()

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await unlockAdminWithPassword(username, password)
    setLoading(false)
    if (result.ok) {
      setUnlocked(true)
      setPassword('')
    } else {
      clearAdminToken()
      setError(result.error ?? 'Not authorized')
    }
  }

  const handleLock = () => {
    clearAdminToken()
    setUnlocked(false)
    setPassword('')
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-sm space-y-6 animate-in">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with the admin account to open support tools.
          </p>
        </div>
        <form onSubmit={(e) => void handleUnlock(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-user">Account</Label>
            <Input
              id="admin-user"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-pass">Password</Label>
            <Input
              id="admin-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : 'Unlock'}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/settings">
              <ArrowLeft className="h-4 w-4" />
              Settings
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Support tools for this installation.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleLock}>
          Lock
        </Button>
      </div>

      <Card>
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
          <CardTitle className="text-base">Support actions</CardTitle>
          <CardDescription>
            Reset first-run guidance or clear the local query cache.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={updateProfile.isPending}
            onClick={() => {
              updateProfile.mutate(
                { onboarding_completed: false },
                {
                  onSuccess: () => toast.success('Onboarding will show again'),
                  onError: (e) => toast.error(e.message),
                },
              )
            }}
          >
            <Sparkles className="h-4 w-4" />
            Reset onboarding
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.clear()
              toast.success('Local cache cleared')
            }}
          >
            <Trash2 className="h-4 w-4" />
            Clear query cache
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
            Reload app
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/download">
              <Download className="h-4 w-4" />
              Install / download
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
