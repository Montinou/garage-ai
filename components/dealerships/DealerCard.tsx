'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MapPin, 
  Phone, 
  Car, 
  Star, 
  Shield, 
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { PublicDealership } from '@/lib/dealership-queries';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';

interface DealerCardProps {
  dealership: PublicDealership;
  className?: string;
  showActions?: boolean;
}

export function DealerCard({ 
  dealership, 
  className,
  showActions = true
}: DealerCardProps) {
  const getDealershipTypeLabel = (type: string | null) => {
    if (!type) return translations.common.unknown;
    return translations.dealership.types[type as keyof typeof translations.dealership.types] || type;
  };

  const getLocationString = () => {
    const parts = [];
    if (dealership.cityName) parts.push(dealership.cityName);
    if (dealership.provinceName) parts.push(dealership.provinceName);
    return parts.join(', ') || translations.common.notSpecified;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatWhatsAppNumber = (phone: string | null) => {
    if (!phone) return null;
    // Remove all non-digits and format for WhatsApp
    const cleanNumber = phone.replace(/\D/g, '');
    // Ensure it has Argentine country code
    if (cleanNumber.startsWith('54')) return cleanNumber;
    if (cleanNumber.startsWith('9')) return '54' + cleanNumber;
    return '549' + cleanNumber;
  };

  return (
    <Card className={cn(
      "group hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-blue-300",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Avatar className="h-12 w-12 border-2 border-gray-200">
              <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                {getInitials(dealership.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link 
                  href={`/concesionarias/${dealership.slug}`}
                  className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 group-hover:text-blue-600"
                >
                  {dealership.name}
                </Link>
                {dealership.isVerified && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 px-2 py-1">
                    <Shield className="h-3 w-3 mr-1" />
                    {translations.dealership.verified}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                <span>{getLocationString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Dealership Type */}
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {getDealershipTypeLabel(dealership.dealershipType)}
            </Badge>
          </div>

          {/* Official Brand */}
          {dealership.officialBrand && (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {dealership.officialBrand}
              </Badge>
            </div>
          )}

          {/* Vehicle Count */}
          <div className="flex items-center text-sm text-gray-600">
            <Car className="h-4 w-4 mr-2 text-gray-500" />
            <span>
              {dealership.vehicleCount} {translations.dealership.vehicleCount}
            </span>
          </div>

          {/* Rating */}
          {dealership.rating && (
            <div className="flex items-center text-sm text-gray-600">
              <Star className="h-4 w-4 mr-2 text-yellow-500 fill-current" />
              <span>{dealership.rating}</span>
              {dealership.reviewCount > 0 && (
                <span className="text-xs text-gray-500 ml-1">
                  ({dealership.reviewCount})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Address */}
        {dealership.address && (
          <div className="mt-4 text-sm text-gray-600">
            <p className="line-clamp-2">{dealership.address}</p>
          </div>
        )}

        {/* Contact Info Quick View */}
        <div className="mt-4 flex items-center gap-4">
          {dealership.phone && (
            <div className="flex items-center text-sm text-gray-500">
              <Phone className="h-3 w-3 mr-1" />
              <span className="truncate">{dealership.phone}</span>
            </div>
          )}
          
          {dealership.whatsapp && (
            <div className="flex items-center text-sm text-green-600">
              <MessageCircle className="h-3 w-3 mr-1" />
              <span>WhatsApp</span>
            </div>
          )}
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 w-full">
            <Button 
              asChild 
              className="flex-1"
              variant="default"
            >
              <Link href={`/concesionarias/${dealership.slug}`}>
                {translations.actions.viewDetails}
              </Link>
            </Button>

            {dealership.whatsapp && (
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <Link
                  href={`https://wa.me/${formatWhatsAppNumber(dealership.whatsapp)}?text=${encodeURIComponent(`Hola, estoy interesado en conocer más sobre ${dealership.name}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {dealership.websiteUrl && (
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <Link
                  href={dealership.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}