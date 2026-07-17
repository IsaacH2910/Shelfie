import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BookMarked, Eye, EyeOff, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/Spinner'
import { useAuth } from '@/context/AuthProvider'
import { unlockAdminWithPassword } from '@/lib/adminSession'
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

type Mode = 'signIn' | 'signUp' | 'magic'

function isAdminLogin(value: string) {
  return value.trim().toLowerCase() === 'admin'
}

export default function AuthPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    const trimmed = email.trim()
    if (!trimmed) return
    if (isAdminLogin(trimmed)) {
      toast.error('Use Sign in with a password for that account.')
      return
    }
    setLoading('email')
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirectTo },
    })
    setLoading(null)
    if (error) toast.error(error.message)
    else setSentTo(trimmed)
  }

  const handlePassword = async () => {
    const trimmed = email.trim()
    if (!trimmed || !password) return
    setLoading('email')

    if (isAdminLogin(trimmed) && mode !== 'signUp') {
      const result = await unlockAdminWithPassword('admin', password)
      setLoading(null)
      if (!result.ok) {
        toast.error(result.error ?? 'Invalid login credentials')
        return
      }
      navigate('/admin', { replace: true })
      return
    }

    if (mode === 'signUp') {
      if (isAdminLogin(trimmed) || !trimmed.includes('@')) {
        setLoading(null)
        toast.error('Enter a valid email address.')
        return
      }
      const { data, error } = await supabase.auth.signUp({
        email: trimmed,
        password,
        options: { emailRedirectTo: redirectTo },
      })
      setLoading(null)
      if (error) {
        toast.error(error.message)
        return
      }
      if (!data.session) setSentTo(trimmed)
      return
    }

    if (!trimmed.includes('@')) {
      setLoading(null)
      toast.error('Invalid login credentials')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    })
    setLoading(null)
    if (error) {
      const hint = /invalid login credentials/i.test(error.message)
        ? ' No account yet? Create one first.'
        : ''
      toast.error(`${error.message}${hint}`)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <BookMarked className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Shelfie</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'signUp'
              ? 'Create an account'
              : mode === 'magic'
                ? 'Email a sign-in link'
                : 'Sign in to your library'}
          </p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-muted-foreground">
            Add Supabase keys to <code className="rounded bg-muted px-1">.env.local</code>.
          </div>
        ) : null}

        {sentTo ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <Mail className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h2 className="font-semibold">Check your inbox</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Link sent to <span className="font-medium text-foreground">{sentTo}</span>
            </p>
            <Button variant="ghost" className="mt-4" onClick={() => setSentTo(null)}>
              Different email
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">
            {mode !== 'magic' ? (
              <>
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => void handleOAuth()}
                  disabled={loading !== null}
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>
              </>
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
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  autoComplete="username"
                  inputMode="email"
                  className="h-11"
                  required
                />
              </div>

              {mode !== 'magic' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete={
                        mode === 'signUp' ? 'new-password' : 'current-password'
                      }
                      minLength={mode === 'signUp' ? 6 : undefined}
                      className="h-11 pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ) : null}

              <Button type="submit" className="h-11 w-full" disabled={loading !== null}>
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

            <div className="mt-5 space-y-2 text-center text-sm text-muted-foreground">
              {mode === 'magic' ? (
                <button
                  type="button"
                  className="hover:text-foreground hover:underline"
                  onClick={() => setMode('signIn')}
                >
                  Use password instead
                </button>
              ) : (
                <>
                  <p>
                    {mode === 'signIn' ? (
                      <>
                        New here?{' '}
                        <button
                          type="button"
                          className="font-medium text-foreground hover:underline"
                          onClick={() => setMode('signUp')}
                        >
                          Create an account
                        </button>
                      </>
                    ) : (
                      <>
                        Have an account?{' '}
                        <button
                          type="button"
                          className="font-medium text-foreground hover:underline"
                          onClick={() => setMode('signIn')}
                        >
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                  <button
                    type="button"
                    className="hover:text-foreground hover:underline"
                    onClick={() => setMode('magic')}
                  >
                    Magic link instead
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/download" className="hover:text-foreground hover:underline">
            Download the app
          </Link>
        </p>
      </div>
    </div>
  )
}
