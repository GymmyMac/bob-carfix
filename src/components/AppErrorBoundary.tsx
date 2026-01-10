import React, { Component, ErrorInfo, ReactNode } from 'react';
import { getStorageType } from '@/lib/backend/safeStorage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[AppErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleCopyDiagnostics = () => {
    const { error, errorInfo } = this.state;
    const diagnostics = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      storageType: getStorageType(),
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      },
      componentStack: errorInfo?.componentStack,
    };
    
    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    alert('Diagnostics copied to clipboard');
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      
      return (
        <div 
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: '#1a1a2e',
            color: '#eaeaea',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div 
            style={{
              maxWidth: '500px',
              width: '100%',
              backgroundColor: '#16213e',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚠️</div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                Something went wrong
              </h1>
            </div>
            
            <div 
              style={{
                backgroundColor: '#0f0f23',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                fontFamily: 'monospace',
                overflow: 'auto',
                maxHeight: '150px',
              }}
            >
              <strong style={{ color: '#ff6b6b' }}>{error?.name}:</strong>{' '}
              {error?.message}
            </div>
            
            <div 
              style={{
                fontSize: '0.75rem',
                color: '#888',
                marginBottom: '1.5rem',
                textAlign: 'center',
              }}
            >
              Storage: {getStorageType()}
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  backgroundColor: '#e94560',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Reload
              </button>
              <button
                onClick={this.handleCopyDiagnostics}
                style={{
                  backgroundColor: 'transparent',
                  color: '#888',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Copy Diagnostics
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
