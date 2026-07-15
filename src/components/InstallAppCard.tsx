import { Download, Monitor, Share, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { usePwaInstall } from '@/hooks/usePwaInstall'

/** Always-visible install guidance for phones and computers. */
export function InstallAppCard({
  compact,
  id = 'install',
}: {
  compact?: boolean
  id?: string
}) {
  const install = usePwaInstall()

  if (install.installed) {
    return (
      <Card id={id}>
        <CardHeader className={compact ? 'pb-3' : undefined}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4 text-muted-foreground" />
            App installed
          </CardTitle>
          <CardDescription>
            You’re using the installed Shelfie app on this device.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const onInstall = async () => {
    const ok = await install.promptInstall()
    if (ok) toast.success('Shelfie installed')
    else if (!install.canInstall) {
      toast.message('Use the steps below for your device')
    }
  }

  return (
    <Card id={id}>
      <CardHeader className={compact ? 'pb-3' : undefined}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Download className="h-4 w-4 text-muted-foreground" />
          Download Shelfie
        </CardTitle>
        <CardDescription>
          Install on your phone or computer for one-tap scanning and offline
          access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {install.canInstall ? (
          <Button className="w-full sm:w-auto" onClick={() => void onInstall()}>
            <Download className="h-4 w-4" />
            Install Shelfie
          </Button>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
              <Smartphone className="h-4 w-4" />
              Phone
            </p>
            {install.isIos ? (
              <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                <li>
                  Tap <Share className="inline h-3.5 w-3.5" /> Share
                </li>
                <li>Choose “Add to Home Screen”</li>
                <li>Tap Add</li>
              </ol>
            ) : install.isAndroid ? (
              <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                <li>Tap the browser menu (⋮)</li>
                <li>Choose “Install app” or “Add to Home screen”</li>
                <li>Confirm Install</li>
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">
                Open this site in Chrome or Safari on your phone, then use
                Install / Add to Home Screen.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
              <Monitor className="h-4 w-4" />
              Computer
            </p>
            {install.platform === 'mac' ? (
              <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                <li>
                  <strong>Chrome / Edge:</strong> click the install icon in the
                  address bar, or menu → “Install Shelfie…”
                </li>
                <li>
                  <strong>Safari:</strong> File → Add to Dock
                </li>
              </ol>
            ) : install.platform === 'windows' ? (
              <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                <li>Open in Chrome or Edge (HTTPS)</li>
                <li>Click the install icon in the address bar</li>
                <li>Or menu (⋮) → “Install Shelfie…” / “Apps”</li>
              </ol>
            ) : (
              <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                <li>Use Chrome or Edge on this site over HTTPS</li>
                <li>Click Install in the address bar or browser menu</li>
              </ol>
            )}
          </div>
        </div>

        {!install.canInstall ? (
          <p className="text-xs text-muted-foreground">
            Tip: installation only works from the live HTTPS site (not local
            `localhost` in some browsers). After deploy, refresh and try again.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
