'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MapPin, 
  Phone, 
  Mail,
  MessageCircle,
  ExternalLink,
  Clock,
  Car,
  Star,
  Shield,
  Globe,
  Share2,
  ChevronRight
} from 'lucide-react';
import { PublicDealership } from '@/lib/dealership-queries';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';

interface DealerProfileProps {
  dealership: PublicDealership;
  className?: string;
}

export function DealerProfile({ dealership, className }: DealerProfileProps) {
  const [activeTab, setActiveTab] = useState('overview');

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
    const cleanNumber = phone.replace(/\D/g, '');
    if (cleanNumber.startsWith('54')) return cleanNumber;
    if (cleanNumber.startsWith('9')) return '54' + cleanNumber;
    return '549' + cleanNumber;
  };

  const getLocationString = () => {
    const parts = [];
    if (dealership.cityName) parts.push(dealership.cityName);
    if (dealership.provinceName) parts.push(dealership.provinceName);
    return parts.join(', ') || translations.common.notSpecified;
  };

  const getDealershipTypeLabel = (type: string | null) => {
    if (!type) return translations.common.unknown;
    return translations.dealership.types[type as keyof typeof translations.dealership.types] || type;
  };

  const formatBusinessHours = (hours: Record<string, unknown>) => {
    if (!hours || typeof hours !== 'object') {
      return 'Horarios no especificados';
    }
    
    // This is a placeholder - actual implementation would depend on the business hours structure
    return 'Lunes a Viernes: 9:00 - 18:00, Sábados: 9:00 - 13:00';
  };

  const socialMediaLinks = dealership.socialMedia && typeof dealership.socialMedia === 'object' 
    ? dealership.socialMedia as Record<string, string>
    : {};

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar and Basic Info */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 border-4 border-gray-200">
                <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xl">
                  {getInitials(dealership.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {dealership.name}
                  </h1>
                  {dealership.isVerified && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <Shield className="h-4 w-4 mr-1" />
                      {translations.dealership.verified}
                    </Badge>
                  )}
                </div>
                
                {/* Location */}
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{getLocationString()}</span>
                </div>

                {/* Type and Brand */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">
                    {getDealershipTypeLabel(dealership.dealershipType)}
                  </Badge>
                  {dealership.officialBrand && (
                    <Badge variant="secondary">
                      {dealership.officialBrand}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Stats and Actions */}
            <div className="md:ml-auto flex flex-col gap-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Car className="h-4 w-4 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-600">
                      {dealership.vehicleCount}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {translations.dealership.vehicleCount}
                  </div>
                </div>

                {dealership.rating && (
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-2xl font-bold text-yellow-600">
                        {dealership.rating}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {dealership.reviewCount} {translations.dealership.reviews}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {dealership.whatsapp && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    asChild
                  >
                    <Link
                      href={`https://wa.me/${formatWhatsAppNumber(dealership.whatsapp)}?text=${encodeURIComponent(`Hola, estoy interesado en conocer más sobre ${dealership.name}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Link>
                  </Button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {dealership.phone && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`tel:${dealership.phone}`}>
                        <Phone className="h-4 w-4 mr-1" />
                        Llamar
                      </Link>
                    </Button>
                  )}

                  {dealership.websiteUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <Link 
                        href={dealership.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Sitio web
                      </Link>
                    </Button>
                  )}
                </div>

                <Button variant="ghost" size="sm" className="w-full">
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartir
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Information Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Información</TabsTrigger>
          <TabsTrigger value="contact">Contacto</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="location">Ubicación</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tipo:</span>
                    <span className="text-sm font-medium">
                      {getDealershipTypeLabel(dealership.dealershipType)}
                    </span>
                  </div>
                  
                  {dealership.officialBrand && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Marca oficial:</span>
                      <span className="text-sm font-medium">{dealership.officialBrand}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Estado:</span>
                    <Badge variant={dealership.isVerified ? "default" : "secondary"}>
                      {dealership.isVerified ? "Verificada" : "No verificada"}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Registrada:</span>
                    <span className="text-sm font-medium">
                      {new Date(dealership.createdAt).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Horarios de Atención
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {formatBusinessHours(dealership.businessHours)}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact Methods */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dealership.phone && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium">Teléfono</div>
                      <div className="text-sm text-gray-600">{dealership.phone}</div>
                    </div>
                  </div>
                )}

                {dealership.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium">Email</div>
                      <div className="text-sm text-gray-600">{dealership.email}</div>
                    </div>
                  </div>
                )}

                {dealership.whatsapp && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-sm font-medium">WhatsApp</div>
                      <div className="text-sm text-gray-600">{dealership.whatsapp}</div>
                    </div>
                  </div>
                )}

                {dealership.websiteUrl && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Globe className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium">Sitio web</div>
                      <div className="text-sm text-blue-600 hover:underline">
                        <Link 
                          href={dealership.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Visitar sitio web
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Address */}
              {dealership.address && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Dirección</h4>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-700">{dealership.address}</p>
                      <p className="text-sm text-gray-500 mt-1">{getLocationString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Social Media */}
              {Object.keys(socialMediaLinks).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Redes Sociales</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(socialMediaLinks).map(([platform, url]) => (
                      <Button
                        key={platform}
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link 
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="capitalize"
                        >
                          {platform}
                        </Link>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Inventario de Vehículos
                </CardTitle>
                <Badge variant="secondary">
                  {dealership.vehicleCount} vehículos
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ver inventario completo
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Explora todos los vehículos disponibles en {dealership.name}
                </p>
                <Button asChild>
                  <Link href={`/concesionarias/${dealership.slug}/vehiculos`}>
                    Ver {dealership.vehicleCount} vehículos
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Ubicación
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Map Placeholder */}
              <div className="aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Mapa interactivo próximamente</p>
                </div>
              </div>

              {/* Location Details */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-1">Dirección</h4>
                  <p className="text-sm text-gray-600">
                    {dealership.address || 'Dirección no especificada'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-1">Ubicación</h4>
                  <p className="text-sm text-gray-600">{getLocationString()}</p>
                </div>

                {dealership.coordinates && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Coordenadas</h4>
                    <p className="text-sm text-gray-600 font-mono">
                      {dealership.coordinates.lat}, {dealership.coordinates.lng}
                    </p>
                  </div>
                )}

                <div className="pt-3">
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver en Google Maps
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}