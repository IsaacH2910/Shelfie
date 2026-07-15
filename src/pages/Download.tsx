import { BookMarked } from 'lucide-react'
import { InstallAppCard } from '@/components/InstallAppCard'

export default function DownloadPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-in">
      <div className="space-y-3 text-center sm:text-left">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm sm:mx-0">
          <BookMarked className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Download Shelfie</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Install on your phone or computer for one-tap scanning, a home-screen
            icon, and offline access to your library.
          </p>
        </div>
      </div>

      <InstallAppCard id="install" />
    </div>
  )
}
