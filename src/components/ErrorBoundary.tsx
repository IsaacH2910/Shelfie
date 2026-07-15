import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logCrash } from '@/lib/crashLog'
import { isChunkLoadError } from '@/lib/lazyRetry'

type Props = {
  children?: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
  chunkError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, chunkError: false }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      chunkError: isChunkLoadError(error),
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
    logCrash({
      message: error.message || 'React render error',
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
    })

    // Stale JS chunk after deploy — hard reload once so the new build loads.
    if (isChunkLoadError(error)) {
      const key = 'shelfie_boundary_chunk_reload'
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
      }
    }
  }

  private retry = () => {
    if (this.state.chunkError) {
      sessionStorage.removeItem('shelfie_boundary_chunk_reload')
      sessionStorage.removeItem('shelfie_chunk_reload')
      window.location.reload()
      return
    }
    this.setState({ hasError: false, error: null, chunkError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-6 py-16 text-center animate-in"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" aria-hidden />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">
              {this.state.chunkError
                ? 'App updated'
                : 'Something went wrong'}
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              {this.state.chunkError
                ? 'A newer version of Shelfie is available. Refresh to continue.'
                : this.state.error?.message ||
                  'An unexpected error occurred. You can try again.'}
            </p>
            {!this.state.chunkError ? (
              <p className="text-xs text-muted-foreground">
                Details were saved under Settings → Diagnostics.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={this.retry}>
              <RefreshCw className="h-4 w-4" />
              {this.state.chunkError ? 'Refresh' : 'Try again'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.assign('/')}
            >
              Back to home
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children ?? null
  }
}
