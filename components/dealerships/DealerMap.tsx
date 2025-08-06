'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Map, 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Navigation,
  Info
} from 'lucide-react';
import { PublicDealership } from '@/lib/dealership-queries';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';

interface DealerMapProps {
  dealerships: PublicDealership[];
  selectedDealership?: PublicDealership | null;
  onDealershipSelect?: (dealership: PublicDealership) => void;
  className?: string;
  height?: string | number;
}

export function DealerMap({
  dealerships,
  selectedDealership,
  onDealershipSelect,
  className,
  height = 400
}: DealerMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter dealerships that have coordinates
  const dealershipsWithLocation = dealerships.filter(d => 
    d.coordinates && 
    typeof d.coordinates === 'object' && 
    d.coordinates.lat && 
    d.coordinates.lng
  );

  return (
    <Card className={cn(
      "overflow-hidden",
      isFullscreen && "fixed inset-0 z-50 rounded-none",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            {translations.dealership.viewOnMap}
            <Badge variant="secondary" className="ml-2">
              {dealershipsWithLocation.length} ubicaciones
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 relative">
        {/* Map Placeholder */}
        <div 
          className="relative bg-gradient-to-br from-blue-50 to-green-50 border-2 border-dashed border-gray-300 flex items-center justify-center"
          style={{ height: isFullscreen ? 'calc(100vh - 120px)' : height }}
        >
          {/* Placeholder Content */}
          <div className="text-center space-y-4 p-8">
            <div className="flex justify-center">
              <div className="p-4 bg-blue-100 rounded-full">
                <Map className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800">
                Mapa Interactivo
              </h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Esta sección mostrará un mapa interactivo con las ubicaciones de las concesionarias. 
                Funcionalidad próximamente disponible.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-6">
              <Badge variant="outline" className="text-xs">
                Google Maps Integration
              </Badge>
              <Badge variant="outline" className="text-xs">
                Filtros por ubicación
              </Badge>
              <Badge variant="outline" className="text-xs">
                Direcciones GPS
              </Badge>
            </div>
          </div>

          {/* Mock Map Points */}
          {dealershipsWithLocation.slice(0, 5).map((dealership, index) => (
            <div
              key={dealership.id}
              className={cn(
                "absolute bg-red-500 rounded-full border-2 border-white shadow-lg cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110",
                selectedDealership?.id === dealership.id ? "bg-blue-500 scale-110" : "bg-red-500"
              )}
              style={{
                left: `${25 + (index * 15)}%`,
                top: `${30 + (index * 10)}%`,
                width: '24px',
                height: '24px'
              }}
              onClick={() => onDealershipSelect?.(dealership)}
              title={dealership.name}
            >
              <MapPin className="h-4 w-4 text-white absolute top-0.5 left-0.5" />
            </div>
          ))}

          {/* Map Controls */}
          <div className="absolute top-4 right-4 space-y-2">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <Button variant="ghost" size="sm" className="rounded-none border-b">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="rounded-none">
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              variant="secondary"
              size="sm"
              className="w-full bg-white shadow-md"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Mi ubicación
            </Button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md border border-gray-200 p-3">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full border border-white"></div>
                <span>Concesionarias</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full border border-white"></div>
                <span>Seleccionada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full border border-white"></div>
                <span>Verificada</span>
              </div>
            </div>
          </div>

          {/* Info Panel for Selected Dealership */}
          {selectedDealership && (
            <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{selectedDealership.name}</h4>
                  <p className="text-xs text-gray-600">
                    {selectedDealership.address || 'Dirección no disponible'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedDealership.vehicleCount} vehículos
                    </Badge>
                    {selectedDealership.isVerified && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        Verificada
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" className="w-full mt-2" asChild>
                    <a href={`/concesionarias/${selectedDealership.slug}`}>
                      Ver detalles
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {dealerships.length}
              </div>
              <div className="text-xs text-gray-600">
                Total concesionarias
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {dealershipsWithLocation.length}
              </div>
              <div className="text-xs text-gray-600">
                Con ubicación
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {dealerships.filter(d => d.isVerified).length}
              </div>
              <div className="text-xs text-gray-600">
                Verificadas
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {dealerships.reduce((sum, d) => sum + d.vehicleCount, 0)}
              </div>
              <div className="text-xs text-gray-600">
                Vehículos total
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}