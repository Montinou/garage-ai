'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VehicleDetails } from '@/lib/car-queries';
import { formatPrice } from '@/lib/format-utils';
import { 
  CalendarIcon, 
  GaugeIcon, 
  EngineIcon, 
  PaletteIcon, 
  FuelIcon, 
  SettingsIcon,
  InfoIcon,
  IdCardIcon,
  ZapIcon
} from 'lucide-react';

interface VehicleSpecsProps {
  vehicle: VehicleDetails;
}

export default function VehicleSpecs({ vehicle }: VehicleSpecsProps) {
  const specs = [
    {
      icon: CalendarIcon,
      label: 'Año',
      value: vehicle.specs.year,
      format: (value: any) => value?.toString()
    },
    {
      icon: GaugeIcon,
      label: 'Kilometraje',
      value: vehicle.specs.mileage,
      format: (value: any) => value ? `${value.toLocaleString()} km` : null
    },
    {
      icon: FuelIcon,
      label: 'Combustible',
      value: vehicle.specs.fuel,
      format: (value: any) => value ? value.charAt(0).toUpperCase() + value.slice(1) : null
    },
    {
      icon: SettingsIcon,
      label: 'Transmisión',
      value: vehicle.specs.transmission,
      format: (value: any) => value ? value.charAt(0).toUpperCase() + value.slice(1) : null
    },
    {
      icon: EngineIcon,
      label: 'Motor',
      value: vehicle.specs.engineSize,
      format: (value: any) => value
    },
    {
      icon: ZapIcon,
      label: 'Potencia',
      value: vehicle.specs.horsepower,
      format: (value: any) => value ? `${value} HP` : null
    },
    {
      icon: InfoIcon,
      label: 'Estado',
      value: vehicle.specs.condition,
      format: (value: any) => value ? value.charAt(0).toUpperCase() + value.slice(1) : null
    },
    {
      icon: PaletteIcon,
      label: 'Color',
      value: vehicle.specs.color,
      format: (value: any) => value ? value.charAt(0).toUpperCase() + value.slice(1) : null
    }
  ];

  const additionalInfo = [
    {
      label: 'VIN',
      value: vehicle.vin,
      icon: IdCardIcon
    }
  ];

  const filteredSpecs = specs.filter(spec => spec.value != null);
  const filteredAdditionalInfo = additionalInfo.filter(info => info.value != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          Especificaciones Técnicas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Main Specifications Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSpecs.map((spec, index) => {
              const Icon = spec.icon;
              const formattedValue = spec.format(spec.value);
              
              if (!formattedValue) return null;
              
              return (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="flex-shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">{spec.label}</p>
                    <p className="font-medium truncate">{formattedValue}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional Information */}
          {filteredAdditionalInfo.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Información Adicional</h4>
              <div className="space-y-2">
                {filteredAdditionalInfo.map((info, index) => {
                  const Icon = info.icon;
                  return (
                    <div key={index} className="flex items-center gap-3 p-2 rounded">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{info.label}:</span>
                      <span className="font-mono text-sm">{info.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vehicle Condition and Features */}
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Estado del Vehículo</h4>
            <div className="flex flex-wrap gap-2">
              {vehicle.specs.condition && (
                <Badge variant="outline" className="capitalize">
                  {vehicle.specs.condition}
                </Badge>
              )}
              {vehicle.isOpportunity && (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                  🤖 Oportunidad AI
                </Badge>
              )}
              {vehicle.specs.fuel && (
                <Badge variant="outline" className="capitalize">
                  {vehicle.specs.fuel}
                </Badge>
              )}
              {vehicle.specs.transmission && (
                <Badge variant="outline" className="capitalize">
                  {vehicle.specs.transmission}
                </Badge>
              )}
            </div>
          </div>

          {/* Price Information */}
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Información de Precio</h4>
            <div className="bg-primary/5 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Precio:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(vehicle.price, vehicle.currency)}
                </span>
              </div>
              {vehicle.opportunityScore && vehicle.isOpportunity && (
                <div className="mt-2 pt-2 border-t border-primary/20">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Puntuación AI:</span>
                    <span className="font-medium text-green-600">
                      {vehicle.opportunityScore}/100
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dealer Information */}
          {vehicle.dealershipInfo && (
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Información del Vendedor</h4>
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Concesionaria:</span>
                    <span className="font-medium">{vehicle.dealershipInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tipo:</span>
                    <span className="capitalize">{vehicle.dealershipInfo.dealershipType}</span>
                  </div>
                  {vehicle.dealershipInfo.officialBrand && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Marca oficial:</span>
                      <span>{vehicle.dealershipInfo.officialBrand}</span>
                    </div>
                  )}
                  {vehicle.dealershipInfo.rating && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Calificación:</span>
                      <span>{vehicle.dealershipInfo.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}