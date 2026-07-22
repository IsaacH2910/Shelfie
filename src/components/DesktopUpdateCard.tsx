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
import {
  checkForDesktopUpdate,
  clearSkippedUpdateVersion,
  installDesktopUpdateAndRelaunch,
} from '@/lib/desktopUpdater'
import { isTauri } from '@/lib/platform'

/**
 * Desktop-only: show version and manually check GitHub Releases for updates.
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
      clearSkippedUpdateVersion()
      const update = await checkForDesktopUpdate()
      if (!update) {
        toast.message('You are up to date')
        return
      }
      toast.message(`Downloading ${update.version}…`)
      await installDesktopUpdateAndRelaunch(update)
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
          . Checks GitHub Releases automatically on launch; you can also check
          here.
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
