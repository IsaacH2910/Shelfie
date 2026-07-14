import { useIsRestoring } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { shouldUseOfflineCache } from '@/lib/serverQueries'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

type ServerQueryResult<TData> = UseQueryResult<TData, Error> & {
  /** Browser is online but the database/API could not be reached. */
  isBackendUnavailable: boolean
  /** Data safe to display — hides stale cache when the server is down. */
  displayData: TData | undefined
}

/**
 * Hide persisted cache when online and the server failed to respond. Also hides
 * data while the persisted cache is being restored from disk.
 */
export function useServerQueryResult<TData>(
  result: UseQueryResult<TData, Error>,
): ServerQueryResult<TData> {
  const online = useOnlineStatus()
  const isRestoring = useIsRestoring()

  const isBackendUnavailable =
    online && result.isError && !shouldUseOfflineCache()

  const displayData =
    (online && isRestoring) || isBackendUnavailable ? undefined : result.data

  return {
    ...result,
    isBackendUnavailable,
    displayData,
  }
}
