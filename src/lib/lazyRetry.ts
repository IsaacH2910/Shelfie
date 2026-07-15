import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const RELOAD_KEY = 'shelfie_chunk_reload'

/** True for Vite/webpack stale-chunk failures after a new deploy. */
export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(
    message,
  )
}

/**
 * Lazy-load a route module; on stale chunk URLs after deploy, reload once
 * so the browser picks up the new index.html asset map.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await factory()
      sessionStorage.removeItem(RELOAD_KEY)
      return mod
    } catch (error) {
      if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1')
        window.location.reload()
        // Hang the promise until the page reloads.
        return new Promise(() => {})
      }
      sessionStorage.removeItem(RELOAD_KEY)
      throw error
    }
  })
}
