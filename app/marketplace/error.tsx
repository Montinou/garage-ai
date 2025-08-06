'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MarketplaceErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MarketplaceError({ error, reset }: MarketplaceErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Marketplace error:', error);
  }, [error]);

  // Determine error type and message
  const getErrorInfo = () => {
    if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
      return {
        title: 'Error de Conexión',
        description: 'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet.',
        action: 'Reintentar'
      };
    }

    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return {
        title: 'Tiempo de Espera Agotado',
        description: 'La búsqueda está tomando más tiempo del esperado. Por favor, intenta nuevamente.',
        action: 'Reintentar'
      };
    }

    if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
      return {
        title: 'Error del Servidor',
        description: 'Ocurrió un problema interno. Nuestro equipo ha sido notificado y está trabajando en solucionarlo.',
        action: 'Reintentar'
      };
    }

    if (error.message.includes('400') || error.message.includes('Bad Request')) {
      return {
        title: 'Error de Búsqueda',
        description: 'Los parámetros de búsqueda no son válidos. Por favor, ajusta los filtros e intenta nuevamente.',
        action: 'Limpiar filtros'
      };
    }

    // Generic error
    return {
      title: 'Error Inesperado',
      description: 'Ocurrió un error inesperado al cargar el marketplace. Por favor, intenta nuevamente.',
      action: 'Reintentar'
    };
  };

  const errorInfo = getErrorInfo();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Error Card */}
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">{errorInfo.title}</CardTitle>
              <CardDescription className="text-base mt-2">
                {errorInfo.description}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* Technical details for development */}
              {process.env.NODE_ENV === 'development' && (
                <Alert className="text-left mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Detalles técnicos:</strong>
                    <br />
                    <code className="text-sm bg-muted px-2 py-1 rounded mt-1 block">
                      {error.message}
                    </code>
                    {error.digest && (
                      <div className="mt-2">
                        <strong>ID del error:</strong> <code>{error.digest}</code>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Si el problema persiste, puedes:
                </p>
                <ul className="text-sm text-muted-foreground text-left max-w-md mx-auto">
                  <li className="flex items-start gap-2 mb-2">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0"></span>
                    Verificar tu conexión a internet
                  </li>
                  <li className="flex items-start gap-2 mb-2">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0"></span>
                    Limpiar los filtros de búsqueda
                  </li>
                  <li className="flex items-start gap-2 mb-2">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0"></span>
                    Actualizar la página
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0"></span>
                    Contactar nuestro soporte técnico
                  </li>
                </ul>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={reset} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {errorInfo.action}
              </Button>
              
              <Button variant="outline" asChild className="gap-2">
                <Link href="/marketplace">
                  <Search className="h-4 w-4" />
                  Nueva búsqueda
                </Link>
              </Button>
              
              <Button variant="ghost" asChild className="gap-2">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Volver al inicio
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Suggested Actions */}
          <div className="mt-8 text-center">
            <h3 className="text-lg font-medium mb-4">¿Buscas algo específico?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button variant="outline" asChild size="sm">
                <Link href="/marketplace?oportunidades=true">
                  Ver Oportunidades AI
                </Link>
              </Button>
              
              <Button variant="outline" asChild size="sm">
                <Link href="/marketplace?destacados=true">
                  Vehículos Destacados
                </Link>
              </Button>
              
              <Button variant="outline" asChild size="sm">
                <Link href="/concesionarias">
                  Ver Concesionarias
                </Link>
              </Button>
            </div>
          </div>

          {/* Contact Support */}
          <div className="mt-12 text-center">
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-medium mb-2">¿Necesitas ayuda?</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Nuestro equipo de soporte está disponible para ayudarte
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="mailto:soporte@garageai.com.ar">
                      Enviar email
                    </Link>
                  </Button>
                  
                  <Button variant="outline" size="sm" asChild>
                    <Link href="https://wa.me/5491112345678?text=Hola,%20necesito%20ayuda%20con%20el%20marketplace">
                      WhatsApp
                    </Link>
                  </Button>
                  
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/ayuda">
                      Centro de ayuda
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}