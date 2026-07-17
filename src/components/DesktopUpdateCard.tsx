import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { isTauri } from '@/lib/platform'

/**
 * Desktop-only: show version and check GitHub Releases for updates.
 */
export function DesktopUpdateCard() {
  const [version, setVersion] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!isTauri()) return
    void import('@tauri-apps/api/app')
      .then(({ getVersion }) => getVersion())
      .then(setVersion)
      .catch(() => setVersion(null))
  }, [])

  if (!isTauri()) return null

  const checkForUpdates = async () => {
    setChecking(true)
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const { relaunch } = await import('@tauri-apps/plugin-process')
      const update = await check()
      if (!update) {
        toast.message('You are up to date')
        return
      }
      toast.message(`Downloading ${update.version}…`)
      await update.downloadAndInstall()
      toast.success('Update installed — restarting')
      await relaunch()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not check for updates',
      )
    } finally {
      setChecking(false)
    }
  }

  return (
    <Card id="desktop">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          Desktop app
        </CardTitle>
        <CardDescription>
          {version ? `Version ${version}` : 'Native Shelfie shell'}
          . Updates come from GitHub Releases.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          variant="outline"
          disabled={checking}
          onClick={() => void checkForUpdates()}
        >
          <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking…' : 'Check for updates'}
        </Button>
      </CardContent>
    </Card>
  )
}
