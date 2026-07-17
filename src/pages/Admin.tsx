import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
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
import { useAuth } from '@/context/AuthProvider'
import { useUpdateProfile } from '@/hooks/useProfile'
import { queryClient } from '@/lib/queryClient'
import { clearAdminToken, isAdminSessionValid } from '@/lib/adminSession'

export default function AdminPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [unlocked, setUnlocked] = useState(() => isAdminSessionValid())
  const updateProfile = useUpdateProfile()

  useEffect(() => {
    setUnlocked(isAdminSessionValid())
  }, [])

  const handleLock = () => {
    clearAdminToken()
    setUnlocked(false)
    navigate('/auth', { replace: true })
  }

  if (!unlocked) {
    return <Navigate to="/auth" replace />
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl space-y-6 px-4 py-8 animate-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to={session ? '/settings' : '/auth'}>
              <ArrowLeft className="h-4 w-4" />
              {session ? 'Settings' : 'Sign in'}
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
            disabled={!session || updateProfile.isPending}
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
