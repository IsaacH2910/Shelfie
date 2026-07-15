import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  BookMarked,
  Camera,
  MapPin,
  ScanBarcode,
  WifiOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'

const STEPS = [
  {
    id: 'welcome',
    icon: BookMarked,
    title: 'Welcome to Shelfie',
    body: 'Your personal library, always with you — scan books, track reading, and keep shelves organized.',
  },
  {
    id: 'camera',
    icon: Camera,
    title: 'Camera & offline',
    body: 'Scan barcodes or covers to add books fast. Shelfie works offline; changes sync when you’re back online.',
    extra: (
      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <WifiOff className="h-3.5 w-3.5" />
        No signal? Keep browsing your library.
      </p>
    ),
  },
  {
    id: 'shelves',
    icon: MapPin,
    title: 'Create your shelves',
    body: 'Name physical spots like “Living room › Shelf A” so you always know where a book lives.',
    action: (
      <Button asChild variant="secondary" className="w-full">
        <Link to="/organize#shelves">Set up shelves</Link>
      </Button>
    ),
  },
  {
    id: 'scan',
    icon: ScanBarcode,
    title: 'Scan your first book',
    body: 'Point the camera at an ISBN barcode — Shelfie fills in title, author, and cover for you.',
    action: (
      <Button asChild className="w-full">
        <Link to="/add?scan=barcode">Scan a barcode</Link>
      </Button>
    ),
  },
] as const

export function Onboarding() {
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const [step, setStep] = useState(0)

  if (isLoading || !profile || profile.onboarding_completed) return null

  const complete = (skipped: boolean) => {
    updateProfile.mutate(
      { onboarding_completed: true },
      {
        onSuccess: () =>
          toast.success(skipped ? 'You can revisit tips anytime' : 'You’re all set'),
        onError: (e) => toast.error(e.message),
      },
    )
  }

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
      >
        <div className="mb-5 flex justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 w-8 rounded-full transition ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-7 w-7" />
          </div>
          <h2 id="onboarding-title" className="text-xl font-bold tracking-tight">
            {current.title}
          </h2>
          <p className="text-sm text-muted-foreground">{current.body}</p>
          {'extra' in current ? current.extra : null}
          {'action' in current ? (
            <div className="w-full pt-1">{current.action}</div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={updateProfile.isPending}
            onClick={() => complete(true)}
          >
            Skip
          </Button>
          <div className="flex gap-2">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </Button>
            ) : null}
            {isLast ? (
              <Button
                type="button"
                size="sm"
                disabled={updateProfile.isPending}
                onClick={() => complete(false)}
              >
                Finish
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => setStep((s) => s + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
