/**
 * React ErrorBoundary for catching and displaying errors gracefully.
 * Prevents white screens of death and provides user-facing recovery options.
 */

import { type ReactNode, Component, type ErrorInfo } from 'react';
import { logger } from '../../lib/observability';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRecovering: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      isRecovering: false,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to local error logger and Sentry if configured
    logger.error('React error boundary caught', {
      category: 'ui_error',
      error,
      data: { componentStack: errorInfo.componentStack },
    });

    this.setState({ errorInfo });

    // Call optional callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: true,
    });
    // Reload the page to recover from the error state
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            backgroundColor: '#f3f4f6',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '40px 20px',
              maxWidth: '600px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#1f2937' }}>
              Oops! Something went wrong
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '24px', lineHeight: '1.5' }}>
              We encountered an unexpected error. Your progress is saved safely. Please try again by reloading the page.
            </p>

            {/* Error details for debugging (visible in dev mode) */}
            {import.meta.env.DEV && this.state.error && (
              <details
                style={{
                  textAlign: 'left',
                  marginBottom: '24px',
                  padding: '12px',
                  backgroundColor: '#fee2e2',
                  borderRadius: '4px',
                  border: '1px solid #fecaca',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#991b1b' }}>
                  Error details (dev only)
                </summary>
                <pre
                  style={{
                    marginTop: '12px',
                    overflow: 'auto',
                    fontSize: '12px',
                    color: '#7f1d1d',
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleReset}
              disabled={this.state.isRecovering}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: this.state.isRecovering ? 'wait' : 'pointer',
                opacity: this.state.isRecovering ? 0.7 : 1,
              }}
            >
              {this.state.isRecovering ? 'Reloading...' : 'Reload Page'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
