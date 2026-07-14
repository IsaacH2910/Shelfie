import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import {
  isBackendUnreachable,
  isBrowserOffline,
  isServerBackedQueryKey,
  shouldUseOfflineCache,
} from '@/lib/serverQueries'

/**
 * Query client tuned for an offline-capable PWA. Cached data is kept for a week
 * so the catalog stays browsable with no connection (e.g. in a bookshop with
 * weak signal). When the browser is online but the server is down, stale cache
 * is cleared so you don't see phantom books after stopping the local database.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 60 * 24 * 7, // keep for offline use (7 days)
      retry: (failureCount, error) =>
        failureCount < 1 && !isBackendUnreachable(error),
      refetchOnWindowFocus: true,
      networkMode: 'online',
    },
    mutations: {
      networkMode: 'online',
    },
  },
})

/** Drop stale server data when online but the backend cannot be reached. */
export function setupQueryCacheListeners(client: QueryClient) {
  client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') return
    const query = event.query
    if (!isServerBackedQueryKey(query.queryKey)) return
    if (query.state.status !== 'error') return
    if (shouldUseOfflineCache()) return
    if (!isBackendUnreachable(query.state.error)) return

    client.removeQueries({ queryKey: query.queryKey, exact: true })
  })
}

export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'shelfie-query-cache',
  throttleTime: 1000,
})

/** Only persist server-backed queries after a successful fetch. */
export function shouldPersistQuery(query: {
  queryKey: readonly unknown[]
  state: { status: string }
}): boolean {
  if (!isServerBackedQueryKey(query.queryKey)) return false
  return query.state.status === 'success'
}

/** After restoring from disk, clear server cache and refetch when online. */
export function onPersistRestore(client: QueryClient) {
  if (isBrowserOffline()) return

  // Wipe rehydrated books/households so stale data never renders while we check
  // whether the database is actually running.
  for (const query of client.getQueryCache().getAll()) {
    if (isServerBackedQueryKey(query.queryKey)) {
      client.removeQueries({ queryKey: query.queryKey, exact: true })
    }
  }

  void client.invalidateQueries({
    predicate: (query) => isServerBackedQueryKey(query.queryKey),
  })
}
