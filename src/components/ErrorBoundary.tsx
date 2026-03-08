import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches unhandled render-time errors in the component tree and shows a
 * user-friendly Traditional Chinese message instead of a blank page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="error-banner" role="alert" style={{ margin: '24px auto', maxWidth: '600px' }}>
          <strong>頁面發生錯誤</strong>
          <p style={{ marginTop: '8px', fontSize: '13px' }}>
            {this.state.error?.message ?? '未知錯誤'}
          </p>
          <button
            className="submit-btn"
            style={{ marginTop: '12px' }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            重試
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
