'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Calendar, Gauge, Fuel, Settings, Star, Eye, Heart } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPrice, formatMileage, formatLocation, formatRelativeTime } from '@/lib/format-utils';
import { translations } from '@/lib/translations';
import type { VehicleSearchResult } from '@/lib/car-queries';

interface VehicleCardProps {
  vehicle: VehicleSearchResult;
  className?: string;
  priority?: boolean; // For image loading priority
  showDealership?: boolean;
  compact?: boolean; // For smaller card variant
}

export default function VehicleCard({ 
  vehicle, 
  className, 
  priority = false,
  showDealership = true,
  compact = false
}: VehicleCardProps) {
  const vehicleUrl = `/vehiculos/${vehicle.id}`;
  
  // Create vehicle title
  const vehicleTitle = [vehicle.brand, vehicle.model, vehicle.year]
    .filter(Boolean)
    .join(' ') || vehicle.title || 'Vehículo';

  // Handle image error with fallback chain
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    // Try placeholder.jpg first, then placeholder.svg as final fallback
    if (img.src !== '/placeholder.jpg') {
      img.src = '/placeholder.jpg';
    } else if (img.src !== '/placeholder.svg') {
      img.src = '/placeholder.svg';
    }
  };

  return (
    <Card className={cn(
      "group overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02]",
      compact ? "w-full" : "w-full",
      className
    )}>
      {/* Image Section */}
      <div className={cn(
        "relative overflow-hidden bg-muted",
        compact ? "aspect-[4/3]" : "aspect-video"
      )}>
        <Link href={vehicleUrl}>
          <Image
            src={vehicle.primaryImage || '/placeholder.jpg'}
            alt={`${vehicleTitle} - Imagen principal`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            priority={priority}
            onError={handleImageError}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          />
        </Link>
        
        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {vehicle.isOpportunity && (
            <Badge variant="secondary" className="bg-yellow-500/90 text-yellow-900 hover:bg-yellow-500">
              <Star className="h-3 w-3 mr-1" />
              {translations.vehicle.opportunity}
            </Badge>
          )}
          {vehicle.condition && (
            <Badge variant="outline" className="bg-background/90">
              {vehicle.condition}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 bg-background/90 hover:bg-background"
            asChild
          >
            <Link href={vehicleUrl} aria-label={`Ver detalles de ${vehicleTitle}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 bg-background/90 hover:bg-background"
            onClick={(e) => {
              e.preventDefault();
              // Add to favorites using localStorage for now
              const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
              const isAlreadyFavorite = favorites.includes(vehicle.id);
              
              if (isAlreadyFavorite) {
                const updatedFavorites = favorites.filter((id: string) => id !== vehicle.id);
                localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
              } else {
                favorites.push(vehicle.id);
                localStorage.setItem('favorites', JSON.stringify(favorites));
              }
            }}
            aria-label={`Agregar ${vehicleTitle} a favoritos`}
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>

        {/* Price Overlay - Mobile */}
        {compact && (
          <div className="absolute bottom-3 right-3 md:hidden">
            <Badge className="bg-primary text-primary-foreground text-sm font-bold">
              {formatPrice(vehicle.price)}
            </Badge>
          </div>
        )}
      </div>

      {/* Content Section */}
      <CardContent className={cn("p-4", compact && "p-3")}>
        {/* Title and Price */}
        <div className="space-y-2">
          <Link href={vehicleUrl}>
            <h3 className={cn(
              "font-semibold line-clamp-2 hover:text-primary transition-colors",
              compact ? "text-sm" : "text-base lg:text-lg"
            )}>
              {vehicleTitle}
            </h3>
          </Link>
          
          {!compact && (
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold text-primary">
                {formatPrice(vehicle.price)}
              </p>
              {vehicle.currency && vehicle.currency !== 'ARS' && (
                <span className="text-sm text-muted-foreground">
                  {vehicle.currency}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Vehicle Details */}
        <div className={cn(
          "grid grid-cols-2 gap-2 text-sm text-muted-foreground",
          compact ? "mt-2" : "mt-4"
        )}>
          {vehicle.year && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{vehicle.year}</span>
            </div>
          )}
          
          {vehicle.mileage && (
            <div className="flex items-center gap-1">
              <Gauge className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{formatMileage(vehicle.mileage)}</span>
            </div>
          )}
          
          {vehicle.fuel && (
            <div className="flex items-center gap-1">
              <Fuel className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{vehicle.fuel}</span>
            </div>
          )}
          
          {vehicle.transmission && (
            <div className="flex items-center gap-1">
              <Settings className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{vehicle.transmission}</span>
            </div>
          )}
        </div>

        {/* Location and Dealership */}
        <div className={cn("space-y-1", compact ? "mt-2" : "mt-3")}>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{vehicle.location}</span>
          </div>
          
          {showDealership && vehicle.dealership && (
            <div className="flex items-center justify-between">
              <Link 
                href={`/concesionarias/${vehicle.dealershipSlug || vehicle.dealership}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {vehicle.dealership}
              </Link>
              {vehicle.createdAt && (
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {formatRelativeTime(vehicle.createdAt)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Opportunity Score */}
        {vehicle.isOpportunity && vehicle.opportunityScore && vehicle.opportunityScore > 0 && (
          <div className={cn("mt-2", compact && "mt-1")}>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(vehicle.opportunityScore, 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-yellow-600">
                {Math.round(vehicle.opportunityScore)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Puntuación de oportunidad
            </p>
          </div>
        )}
      </CardContent>

      {/* Footer with CTA */}
      <CardFooter className={cn(
        "pt-0 px-4 pb-4",
        compact && "px-3 pb-3"
      )}>
        <Button asChild className="w-full" size={compact ? "sm" : "default"}>
          <Link href={vehicleUrl}>
            {translations.actions.viewDetails}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}