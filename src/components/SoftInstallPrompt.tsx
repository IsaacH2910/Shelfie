import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBooks } from '@/hooks/useBooks'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { isStandaloneDisplay, isTauri } from '@/lib/platform'

const DISMISS_KEY = 'shelfie_install_dismissed_until'
const SEEN_KEY = 'shelfie_install_seen_count'
const DEFER_MS = 1000 * 60 * 60 * 24 * 14 // 14 days

function isDismissed(): boolean {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) ?? '0')
    return until > Date.now()
  } catch {
    return false
  }
}

function bumpSeen(): number {
  try {
    const n = Number(localStorage.getItem(SEEN_KEY) ?? '0') + 1
    localStorage.setItem(SEEN_KEY, String(n))
    return n
  } catch {
    return 1
  }
}

/**
 * Soft install nudge on Home — only after a little engagement, and respect
 * “Not now” for two weeks. Full guidance stays on /download.
 */
export function SoftInstallPrompt() {
  const { data: books = [] } = useBooks()
  const install = usePwaInstall()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isTauri() || install.installed || isStandaloneDisplay()) return
    if (isDismissed()) return
    const seen = bumpSeen()
    // Wait until they’ve added a few books or visited a few times
    if (books.length < 3 && seen < 3) return
    const t = window.setTimeout(() => setVisible(true), 1800)
    return () => window.clearTimeout(t)
  }, [books.length, install.installed])

  if (isTauri() || !visible || install.installed) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DEFER_MS))
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 px-4 py-3.5 animate-in">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        onClick={dismiss}
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Download className="h-4 w-4" />
        </span>
        <div className="min-w-0 space-y-2">
          <div>
            <p className="text-sm font-semibold">Install Shelfie</p>
            <p className="text-xs text-muted-foreground">
              One-tap scanning and offline access from your home screen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {install.canInstall ? (
              <Button
                size="sm"
                onClick={() => {
                  void install.promptInstall().then((ok) => {
                    if (ok) setVisible(false)
                  })
                }}
              >
                Install
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/download">How to install</Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
