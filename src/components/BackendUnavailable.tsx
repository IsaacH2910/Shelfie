import { RefreshCw, Unplug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'

export function BackendUnavailable({
  onRetry,
  retrying,
}: {
  onRetry: () => void
  retrying?: boolean
}) {
  return (
    <EmptyState
      icon={<Unplug />}
      title="Can't reach your library"
      description="Stopping the database does not delete your books — they are stored in Docker and return when you run npm run db:start. To wipe all local data permanently, use npm run db:reset."
      action={
        <Button onClick={onRetry} disabled={retrying}>
          <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? 'Connecting…' : 'Retry'}
        </Button>
      }
    />
  )
}
