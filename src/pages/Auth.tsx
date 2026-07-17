import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BookMarked, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/Spinner'
import { useAuth } from '@/context/AuthProvider'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { REDIRECT_KEY } from '@/lib/constants'
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

type Mode = 'signIn' | 'signUp' | 'magic'

export default function AuthPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<Mode>('signIn')
  const [loading, setLoading] = useState<null | 'email' | 'oauth'>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      const redirect = localStorage.getItem(REDIRECT_KEY)
      localStorage.removeItem(REDIRECT_KEY)
      navigate(redirect || '/', { replace: true })
    }
  }, [session, navigate])

  const redirectTo = window.location.origin

  const handleOAuth = async () => {
    setLoading('oauth')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) {
      toast.error(error.message)
      setLoading(null)
    }
  }

  const handleMagicLink = async () => {
    if (!email) return
    setLoading('email')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    setLoading(null)
    if (error) {
      toast.error(error.message)
    } else {
      setSentTo(email)
    }
  }

  const handlePassword = async () => {
    if (!email || !password) return
    setLoading('email')
    const { error } =
      mode === 'signUp'
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirectTo },
          })
        : await supabase.auth.signInWithPassword({ email, password })
    setLoading(null)
    if (error) {
      toast.error(error.message)
    } else if (mode === 'signUp') {
      setSentTo(email)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <BookMarked className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Shelfie</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your book collection, on every device.
          </p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              Connect Supabase to sign in
            </p>
            <p className="mt-1 text-muted-foreground">
              Add your project URL and anon key to a{' '}
              <code className="rounded bg-muted px-1">.env.local</code> file, then
              restart the dev server. See{' '}
              <code className="rounded bg-muted px-1">README.md</code>.
            </p>
          </div>
        ) : null}

        {sentTo ? (
          <div className="animate-fade-in rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Mail className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-semibold">Check your inbox</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a link to <span className="font-medium">{sentTo}</span>.
              Open it on this device to finish signing in.
            </p>
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => setSentTo(null)}
            >
              Use a different email
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="grid gap-2.5">
              <Button
                variant="outline"
                onClick={() => void handleOAuth()}
                disabled={loading !== null}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
            </div>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or with email
              <span className="h-px flex-1 bg-border" />
            </div>

            {mode !== 'magic' ? (
              <div
                className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
                role="tablist"
                aria-label="Account mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signIn'}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    mode === 'signIn'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setMode('signIn')}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signUp'}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    mode === 'signUp'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setMode('signUp')}
                >
                  Create account
                </button>
              </div>
            ) : null}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (mode === 'magic') void handleMagicLink()
                else void handlePassword()
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              {mode !== 'magic' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={
                      mode === 'signUp' ? 'new-password' : 'current-password'
                    }
                    minLength={6}
                    required
                  />
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={loading !== null}>
                {loading === 'email' ? (
                  <Spinner className="h-4 w-4" />
                ) : mode === 'magic' ? (
                  'Send magic link'
                ) : mode === 'signUp' ? (
                  'Create account'
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <button
                type="button"
                className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() =>
                  setMode((m) => (m === 'magic' ? 'signIn' : 'magic'))
                }
              >
                {mode === 'magic'
                  ? 'Use email and password instead'
                  : 'Email me a magic link instead'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
