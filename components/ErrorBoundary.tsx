'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Home } from 'lucide-react';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'widget';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error,
      errorId: Math.random().toString(36).substr(2, 9)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;
    
    // Log the error
    logger.error(`React Error Boundary caught error at ${level} level`, error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: level,
      errorId: this.state.errorId
    }, 'error-boundary');

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { fallback, level = 'component' } = this.props;
      
      if (fallback) {
        return fallback;
      }

      return <ErrorFallback 
        error={this.state.error} 
        errorInfo={this.state.errorInfo}
        errorId={this.state.errorId}
        level={level}
        onRetry={this.handleRetry}
      />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  level: 'page' | 'component' | 'widget';
  onRetry: () => void;
}

function ErrorFallback({ error, level, onRetry, errorId }: ErrorFallbackProps) {
  const isPageLevel = level === 'page';
  
  if (level === 'widget') {
    // Minimal error display for small components
    return (
      <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground bg-muted/50 rounded">
        <AlertCircle className="h-4 w-4" />
        <span>Error al cargar este componente</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRetry}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${
      isPageLevel ? 'min-h-screen p-8' : 'p-6 min-h-[200px]'
    }`}>
      <Alert className={`max-w-lg ${isPageLevel ? 'border-destructive' : ''}`} variant={isPageLevel ? 'destructive' : 'default'}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>
          {isPageLevel ? 'Error en la página' : 'Error en el componente'}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>
            {isPageLevel 
              ? 'Ha ocurrido un error inesperado. Por favor, intenta recargar la página.'
              : 'Este componente encontró un error y no se puede mostrar correctamente.'
            }
          </p>
          
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-4 p-3 bg-muted rounded text-xs font-mono">
              <summary className="cursor-pointer font-sans font-medium">
                Detalles del error (desarrollo)
              </summary>
              <div className="mt-2 whitespace-pre-wrap">
                <p><strong>Error:</strong> {error.message}</p>
                {error.stack && (
                  <p className="mt-2"><strong>Stack:</strong></p>
                )}
                <pre className="mt-1 text-xs">{error.stack}</pre>
              </div>
            </details>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button onClick={onRetry} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
            
            {isPageLevel && (
              <Button 
                size="sm" 
                onClick={() => window.location.href = '/'}
              >
                <Home className="h-4 w-4 mr-2" />
                Ir al inicio
              </Button>
            )}
          </div>
          
          {errorId && (
            <p className="text-xs text-muted-foreground pt-2">
              ID del error: {errorId}
            </p>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Specialized error boundaries for different use cases
export const PageErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <ErrorBoundary {...props} level="page" />
);

export const ComponentErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <ErrorBoundary {...props} level="component" />
);

export const WidgetErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <ErrorBoundary {...props} level="widget" />
);

export default ErrorBoundary;