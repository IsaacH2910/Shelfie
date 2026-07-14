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

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
      <path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.47 7.82 1.3 10.38.86 1.25 1.89 2.66 3.24 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.28 3.15-2.54.99-1.46 1.4-2.87 1.42-2.94-.03-.01-2.72-1.05-2.75-4.16ZM14.6 4.84c.72-.87 1.2-2.08 1.07-3.28-1.03.04-2.28.69-3.02 1.55-.66.77-1.24 2-1.08 3.18 1.15.09 2.32-.58 3.03-1.45Z" />
    </svg>
  )
}

export default function AuthPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [signUp, setSignUp] = useState(false)
  const [loading, setLoading] = useState<null | 'magic' | 'password' | 'oauth'>(
    null,
  )
  const [sentTo, setSentTo] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      const redirect = localStorage.getItem(REDIRECT_KEY)
      localStorage.removeItem(REDIRECT_KEY)
      navigate(redirect || '/', { replace: true })
    }
  }, [session, navigate])

  const redirectTo = window.location.origin

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading('oauth')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) {
      toast.error(error.message)
      setLoading(null)
    }
  }

  const handleMagicLink = async () => {
    if (!email) return
    setLoading('magic')
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
    setLoading('password')
    const { error } = signUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        })
      : await supabase.auth.signInWithPassword({ email, password })
    setLoading(null)
    if (error) {
      toast.error(error.message)
    } else if (signUp) {
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
                onClick={() => handleOAuth('google')}
                disabled={loading !== null}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOAuth('apple')}
                disabled={loading !== null}
              >
                <AppleIcon />
                Continue with Apple
              </Button>
            </div>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or with email
              <span className="h-px flex-1 bg-border" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (usePassword) void handlePassword()
                else void handleMagicLink()
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

              {usePassword ? (
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={signUp ? 'new-password' : 'current-password'}
                    minLength={6}
                    required
                  />
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={loading !== null}>
                {loading === 'magic' || loading === 'password' ? (
                  <Spinner className="h-4 w-4" />
                ) : usePassword ? (
                  signUp ? (
                    'Create account'
                  ) : (
                    'Sign in'
                  )
                ) : (
                  'Send magic link'
                )}
              </Button>
            </form>

            <div className="mt-4 space-y-1 text-center text-sm">
              <button
                type="button"
                className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => setUsePassword((v) => !v)}
              >
                {usePassword ? 'Email me a magic link instead' : 'Use a password instead'}
              </button>
              {usePassword ? (
                <div>
                  <button
                    type="button"
                    className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    onClick={() => setSignUp((v) => !v)}
                  >
                    {signUp
                      ? 'Already have an account? Sign in'
                      : "New here? Create an account"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
