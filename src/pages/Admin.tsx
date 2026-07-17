import { useEffect, useState } from 'react'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CrashLogPanel } from '@/components/CrashLogPanel'
import { FullScreenLoader } from '@/components/Spinner'
import { useAuth } from '@/context/AuthProvider'
import { useUpdateProfile } from '@/hooks/useProfile'
import { queryClient } from '@/lib/queryClient'
import {
  clearAdminToken,
  isAdminSessionValid,
  unlockAdminWithSession,
} from '@/lib/adminSession'

export default function AdminPage() {
  const { session } = useAuth()
  const [status, setStatus] = useState<'checking' | 'ok' | 'denied'>(() =>
    isAdminSessionValid() ? 'ok' : 'checking',
  )
  const [error, setError] = useState('')
  const updateProfile = useUpdateProfile()

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (isAdminSessionValid()) {
        if (!cancelled) setStatus('ok')
        return
      }
      const token = session?.access_token
      if (!token) {
        if (!cancelled) {
          setStatus('denied')
          setError('Sign in first.')
        }
        return
      }
      if (!cancelled) setStatus('checking')
      const result = await unlockAdminWithSession(token)
      if (cancelled) return
      if (result.ok) {
        setStatus('ok')
        setError('')
      } else {
        clearAdminToken()
        setStatus('denied')
        setError(result.error ?? 'Not authorized')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [session?.access_token])

  if (status === 'checking') {
    return <FullScreenLoader label="Checking access…" />
  }

  if (status !== 'ok') {
    return (
      <div className="mx-auto max-w-sm space-y-4 animate-in">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground" role="alert">
          {error || 'Not authorized.'}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-in">
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
