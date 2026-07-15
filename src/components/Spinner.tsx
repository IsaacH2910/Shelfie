import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin', className)} />
}

export function FullScreenLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-background px-4">
      <Spinner className="h-7 w-7 text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
