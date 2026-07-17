import { Link } from 'react-router-dom'
import { BookMarked, Download, Monitor, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthProvider'
import { usePwaInstall } from '@/hooks/usePwaInstall'

/** Public install page — no app chrome. */
export default function DownloadPage() {
  const { session } = useAuth()
  const install = usePwaInstall()

  const onInstall = async () => {
    const ok = await install.promptInstall()
    if (ok) toast.success('Shelfie installed')
    else if (!install.canInstall) {
      toast.message('Use the steps below for your browser')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <BookMarked className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Download Shelfie</h1>
          <p className="text-sm text-muted-foreground">
            Install for a home-screen icon and offline access.
          </p>
        </div>

        {install.installed ? (
          <p className="text-sm text-muted-foreground">
            Already installed on this device.
          </p>
        ) : (
          <div className="space-y-6 text-left">
            {install.canInstall ? (
              <Button className="h-11 w-full" onClick={() => void onInstall()}>
                <Download className="h-4 w-4" />
                Install
              </Button>
            ) : null}

            <div className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <p className="flex items-center gap-2 font-medium">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  Phone
                </p>
                <p className="pl-6 text-muted-foreground">
                  {install.isIos
                    ? 'Safari → Share → Add to Home Screen'
                    : 'Browser menu → Install app / Add to Home screen'}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="flex items-center gap-2 font-medium">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  Computer
                </p>
                <p className="pl-6 text-muted-foreground">
                  Chrome / Edge: install icon in the address bar. Safari: File →
                  Add to Dock.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {session ? (
            <Button asChild variant="outline">
              <Link to="/">Back to library</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
