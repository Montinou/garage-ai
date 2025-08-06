'use client';

import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/format-utils';
import { VehicleDetails } from '@/lib/car-queries';
import { CalendarIcon, MapPinIcon, GaugeIcon } from 'lucide-react';

interface VehicleHeaderProps {
  vehicle: VehicleDetails;
}

export default function VehicleHeader({ vehicle }: VehicleHeaderProps) {
  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left Column - Title and Details */}
        <div className="flex-1">
          {/* Title */}
          <div className="mb-4">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              {vehicle.brand} {vehicle.model}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                <span>{vehicle.year}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPinIcon className="h-4 w-4" />
                <span>{vehicle.location}</span>
              </div>
              {vehicle.mileage && (
                <div className="flex items-center gap-1">
                  <GaugeIcon className="h-4 w-4" />
                  <span>{vehicle.mileage.toLocaleString()} km</span>
                </div>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {vehicle.condition && (
              <Badge variant="outline" className="capitalize">
                {vehicle.condition}
              </Badge>
            )}
            {vehicle.fuel && (
              <Badge variant="outline" className="capitalize">
                {vehicle.fuel}
              </Badge>
            )}
            {vehicle.transmission && (
              <Badge variant="outline" className="capitalize">
                {vehicle.transmission}
              </Badge>
            )}
            {vehicle.isOpportunity && (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                <span className="mr-1">🤖</span>
                Oportunidad AI
              </Badge>
            )}
          </div>

          {/* Dealership Info */}
          {vehicle.dealershipInfo && (
            <div className="text-sm text-muted-foreground">
              <p>
                Publicado por <span className="font-medium text-foreground">{vehicle.dealershipInfo.name}</span>
                {vehicle.dealershipInfo.dealershipType && (
                  <span className="ml-2">
                    • <span className="capitalize">{vehicle.dealershipInfo.dealershipType}</span>
                  </span>
                )}
                {vehicle.dealershipInfo.officialBrand && (
                  <span className="ml-2">
                    • Oficial {vehicle.dealershipInfo.officialBrand}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Price */}
        <div className="lg:text-right">
          <div className="mb-2">
            <p className="text-3xl lg:text-4xl font-bold text-primary">
              {formatPrice(vehicle.price, vehicle.currency)}
            </p>
            {vehicle.opportunityScore && vehicle.isOpportunity && (
              <p className="text-sm text-green-600 font-medium mt-1">
                Puntuación AI: {vehicle.opportunityScore}/100
              </p>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="flex lg:flex-col gap-2">
            <button
              onClick={() => {
                const message = `Hola! Me interesa este vehículo: ${vehicle.brand} ${vehicle.model} ${vehicle.year} - ${formatPrice(vehicle.price, vehicle.currency)}. ¿Podemos coordinar una visita?`;
                const whatsappUrl = `https://wa.me/${vehicle.dealershipInfo?.whatsapp?.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
              }}
              disabled={!vehicle.dealershipInfo?.whatsapp}
              className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Contactar por WhatsApp
            </button>
            
            <button
              onClick={() => {
                const element = document.getElementById('contact-dealer');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex-1 lg:flex-none border border-primary text-primary hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Ver más contacto
            </button>
          </div>
        </div>
      </div>

      {/* Key Features Row */}
      <div className="mt-6 pt-6 border-t">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {vehicle.year && (
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{vehicle.year}</p>
              <p className="text-sm text-muted-foreground">Año</p>
            </div>
          )}
          {vehicle.mileage && (
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{Math.round(vehicle.mileage / 1000)}k</p>
              <p className="text-sm text-muted-foreground">Kilómetros</p>
            </div>
          )}
          {vehicle.fuel && (
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-lg font-bold capitalize">{vehicle.fuel}</p>
              <p className="text-sm text-muted-foreground">Combustible</p>
            </div>
          )}
          {vehicle.transmission && (
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-lg font-bold capitalize">{vehicle.transmission}</p>
              <p className="text-sm text-muted-foreground">Transmisión</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}