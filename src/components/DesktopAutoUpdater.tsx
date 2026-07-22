import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  checkForDesktopUpdate,
  getSkippedUpdateVersion,
  installDesktopUpdateAndRelaunch,
  skipUpdateVersion,
  type DesktopUpdateInfo,
} from '@/lib/desktopUpdater'
import { isTauri } from '@/lib/platform'

const LAUNCH_DELAY_MS = 4_000
const RECHECK_MS = 1000 * 60 * 60 * 6

/**
 * Desktop-only: check GitHub Releases on launch (and periodically).
 * Prompts before downloading so updates stay user-controlled.
 */
export function DesktopAutoUpdater() {
  const [update, setUpdate] = useState<DesktopUpdateInfo | null>(null)
  const [open, setOpen] = useState(false)
  const [installing, setInstalling] = useState(false)
  const checking = useRef(false)

  useEffect(() => {
    if (!isTauri()) return

    let cancelled = false

    const runCheck = async (silent: boolean) => {
      if (checking.current || cancelled) return
      checking.current = true
      try {
        const next = await checkForDesktopUpdate()
        if (cancelled || !next) return
        if (getSkippedUpdateVersion() === next.version) return
        setUpdate(next)
        setOpen(true)
      } catch (err) {
        if (!silent) {
          toast.error(
            err instanceof Error ? err.message : 'Could not check for updates',
          )
        }
      } finally {
        checking.current = false
      }
    }

    const launchTimer = window.setTimeout(() => {
      void runCheck(true)
    }, LAUNCH_DELAY_MS)

    const interval = window.setInterval(() => {
      void runCheck(true)
    }, RECHECK_MS)

    return () => {
      cancelled = true
      window.clearTimeout(launchTimer)
      window.clearInterval(interval)
    }
  }, [])

  if (!isTauri()) return null

  const onInstall = async () => {
    if (!update) return
    setInstalling(true)
    try {
      toast.message(`Downloading Shelfie ${update.version}…`)
      await installDesktopUpdateAndRelaunch(update)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Update failed — try again later',
      )
      setInstalling(false)
    }
  }

  const onLater = () => {
    if (update) skipUpdateVersion(update.version)
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !installing) onLater()
        else setOpen(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {update ? `Shelfie ${update.version} is available` : 'Update available'}
          </DialogTitle>
          <DialogDescription>
            {update?.notes?.trim()
              ? update.notes
              : 'A new version is ready from online distribution. Install and restart to update.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={installing}
            onClick={onLater}
          >
            Later
          </Button>
          <Button
            type="button"
            disabled={installing}
            onClick={() => void onInstall()}
          >
            {installing ? 'Installing…' : 'Install & restart'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
