import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logCrash } from '@/lib/crashLog'

type Props = {
  children?: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
    logCrash({
      message: error.message || 'React render error',
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
    })
  }

  private retry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" aria-hidden />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">
              Something went wrong
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              {this.state.error?.message ||
                'An unexpected error occurred. You can try again.'}
            </p>
            <p className="text-xs text-muted-foreground">
              Details were saved under Settings → Diagnostics.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={this.retry}>
              Try again
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.assign('/')}
            >
              Back to library
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children ?? null
  }
}
