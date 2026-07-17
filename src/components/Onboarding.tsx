import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { BookMarked, ScanBarcode, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'

const STEPS = [
  {
    id: 'welcome',
    icon: BookMarked,
    title: 'Welcome to Shelfie',
    body: 'Catalog the books you own — scan at home, check at the shop, and never buy a duplicate.',
  },
  {
    id: 'scan',
    icon: ScanBarcode,
    title: 'Add your first book',
    body: 'Scan an ISBN barcode or cover photo and Shelfie fills in the details for you.',
    action: (
      <Button asChild className="h-11 w-full text-base">
        <Link to="/add?scan=barcode">Scan a barcode</Link>
      </Button>
    ),
  },
  {
    id: 'ready',
    icon: Sparkles,
    title: 'You’re ready',
    body: 'Browse your library, track reading, and share shelves with household when you want.',
    action: (
      <div className="flex w-full flex-col gap-2 text-sm">
        <Button asChild variant="secondary" className="w-full">
          <Link to="/settings#import-export">Import a library</Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link to="/household">Set up a household</Link>
        </Button>
      </div>
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
          toast.success(skipped ? 'You can continue anytime' : 'You’re all set'),
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
          <h2
            id="onboarding-title"
            className="text-xl font-bold tracking-tight"
          >
            {current.title}
          </h2>
          <p className="text-sm text-muted-foreground">{current.body}</p>
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
                Get started
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep((s) => s + 1)}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
