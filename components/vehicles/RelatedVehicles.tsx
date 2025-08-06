'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/format-utils';
import { MapPin, Calendar, Gauge, Fuel } from 'lucide-react';

interface RelatedVehicle {
  id: string;
  title: string;
  price: string | null;
  currency: string;
  year: number | null;
  mileage: number | null;
  brand: string | null;
  model: string | null;
  location: string;
  primaryImage: string | null;
  isOpportunity: boolean | null;
  opportunityScore: number | null;
  fuel: string | null;
  transmission: string | null;
}

interface RelatedVehiclesProps {
  relatedVehicles: RelatedVehicle[];
  currentVehicleId: string;
}

export default function RelatedVehicles({ relatedVehicles }: RelatedVehiclesProps) {
  if (!relatedVehicles || relatedVehicles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Vehículos Relacionados</h2>
        <Link 
          href="/marketplace" 
          className="text-primary hover:underline text-sm font-medium"
        >
          Ver todos →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedVehicles.map((vehicle) => (
          <Link 
            key={vehicle.id} 
            href={`/vehiculos/${vehicle.id}`}
            className="group block"
          >
            <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1">
              {/* Image Container */}
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {vehicle.primaryImage ? (
                  <Image
                    src={vehicle.primaryImage}
                    alt={vehicle.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <svg
                      className="w-16 h-16 text-muted-foreground/30"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7m-18 0l2-4h12l2 4m-11 0v10"
                      />
                    </svg>
                  </div>
                )}

                {/* Opportunity Badge */}
                {vehicle.isOpportunity && (
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-green-500 text-white border-0 shadow-md">
                      ⚡ Oportunidad
                    </Badge>
                  </div>
                )}
              </div>

              <CardContent className="p-4 space-y-3">
                {/* Title and Price */}
                <div>
                  <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                    {vehicle.title}
                  </h3>
                  <p className="text-xl font-bold text-primary mt-1">
                    {formatPrice(vehicle.price, vehicle.currency)}
                  </p>
                </div>

                {/* Vehicle Details */}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {vehicle.year && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{vehicle.year}</span>
                    </div>
                  )}
                  {vehicle.mileage && (
                    <div className="flex items-center gap-1">
                      <Gauge className="w-3 h-3" />
                      <span>{vehicle.mileage.toLocaleString()} km</span>
                    </div>
                  )}
                  {vehicle.fuel && (
                    <div className="flex items-center gap-1 col-span-2">
                      <Fuel className="w-3 h-3" />
                      <span>{vehicle.fuel}</span>
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{vehicle.location}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Mobile Scroll Hint */}
      <div className="lg:hidden text-center text-sm text-muted-foreground">
        <span>Desliza para ver más →</span>
      </div>
    </div>
  );
}