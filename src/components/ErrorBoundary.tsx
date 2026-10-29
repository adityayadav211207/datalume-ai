import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="error-boundary" style={{ padding: '24px', textAlign: 'center' }}>
            <strong style={{ display: 'block', marginBottom: '8px' }}>
              Something went wrong on this page.
            </strong>
            <small style={{ display: 'block', marginBottom: '12px', color: 'var(--muted)' }}>
              {this.state.error?.message}
            </small>
            <button
              className="button-secondary"
              type="button"
              onClick={() => this.setState({ hasError: false })}
            >
              Retry
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
