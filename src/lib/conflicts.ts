import type { Book } from '@/types'

export class ConflictError extends Error {
  readonly serverUpdatedAt: string
  readonly localUpdatedAt: string | null

  constructor(
    message: string,
    serverUpdatedAt: string,
    localUpdatedAt: string | null,
  ) {
    super(message)
    this.name = 'ConflictError'
    this.serverUpdatedAt = serverUpdatedAt
    this.localUpdatedAt = localUpdatedAt
  }
}

/** Compare optimistic local timestamp with the server row before writing. */
export function assertNoConflict(
  localUpdatedAt: string | null | undefined,
  server: Pick<Book, 'updated_at' | 'title'> | null,
) {
  if (!localUpdatedAt || !server) return
  if (server.updated_at && server.updated_at !== localUpdatedAt) {
    throw new ConflictError(
      `“${server.title}” was changed on another device. Reload and try again.`,
      server.updated_at,
      localUpdatedAt,
    )
  }
}
