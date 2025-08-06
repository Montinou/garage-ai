'use client';

import React from 'react';
import { ExternalLink, Phone, MessageCircle, MapPin, Shield, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/format-utils';
import { toast } from '@/components/ui/use-toast';

interface VehicleActionsProps {
  vehicle: {
    id: string;
    title: string;
    price: string | null;
    currency: string;
    sourceUrl?: string;
    dealershipInfo?: {
      id: string;
      name: string;
      phone: string | null;
      whatsapp: string | null;
      email: string | null;
      address: string | null;
      officialBrand: string | null;
      dealershipType: string;
      rating: string | null;
    } | null;
    location?: string;
    isOpportunity?: boolean | null;
    opportunityScore?: number | null;
  };
}

// Security: Domain allowlist for Argentine dealership sites
const ALLOWED_DOMAINS = [
  'mercadolibre.com.ar',
  'autocosmos.com.ar',
  'autopia.com.ar',
  'seminuevos.com',
  'autos.com.ar',
  'autored.com.ar',
  'soloautos.com.ar',
  'automotores.com.ar',
  'coches.net',
  'derco.com.ar',
  'peugeot.com.ar',
  'ford.com.ar',
  'chevrolet.com.ar',
  'toyota.com.ar',
  'volkswagen.com.ar',
  'renault.com.ar',
  'honda.com.ar',
  'nissan.com.ar',
  'hyundai.com.ar',
  'fiat.com.ar',
  'citroen.com.ar'
];

/**
 * Validates if a URL is safe to open
 * @param url - URL to validate
 * @returns boolean indicating if URL is safe
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Only allow https and http protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    // Check against domain allowlist
    const hostname = urlObj.hostname.toLowerCase();
    const isAllowed = ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
    
    return isAllowed;
  } catch {
    return false;
  }
}

/**
 * Sanitizes text for safe use in URLs and messages
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  // Remove any potentially dangerous characters and normalize
  return text
    .replace(/[<>"'&\n\r\t]/g, '') // Remove HTML/script injection chars
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/data:/gi, '') // Remove data protocol
    .replace(/vbscript:/gi, '') // Remove vbscript protocol
    .trim()
    .slice(0, 500); // Limit length to prevent abuse
}

/**
 * Validates and sanitizes phone number
 * @param phone - Phone number to validate
 * @returns Sanitized phone number or null if invalid
 */
function sanitizePhoneNumber(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null;
  
  // Remove all non-digit characters except + at the beginning
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Validate format: should start with + or be 10-15 digits
  if (!/^(\+?[1-9]\d{9,14})$/.test(cleaned)) {
    return null;
  }
  
  return cleaned;
}

export default function VehicleActions({ vehicle }: VehicleActionsProps) {
  const handleViewOriginal = () => {
    if (!vehicle.sourceUrl) {
      toast({
        title: "Error",
        description: "No hay URL disponible para este vehículo",
        variant: "destructive",
      });
      return;
    }

    if (!isValidUrl(vehicle.sourceUrl)) {
      toast({
        title: "URL no válida",
        description: "El enlace no es seguro o no está permitido",
        variant: "destructive",
      });
      return;
    }

    try {
      window.open(vehicle.sourceUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo abrir el enlace",
        variant: "destructive",
      });
    }
  };

  const handleWhatsApp = () => {
    if (!vehicle.dealershipInfo?.whatsapp) {
      toast({
        title: "Error",
        description: "No hay número de WhatsApp disponible",
        variant: "destructive",
      });
      return;
    }

    const sanitizedPhone = sanitizePhoneNumber(vehicle.dealershipInfo.whatsapp);
    if (!sanitizedPhone) {
      toast({
        title: "Número inválido",
        description: "El número de WhatsApp no es válido",
        variant: "destructive",
      });
      return;
    }

    const sanitizedTitle = sanitizeText(vehicle.title);
    const sanitizedPrice = formatPrice(vehicle.price, vehicle.currency);
    
    if (!sanitizedTitle) {
      toast({
        title: "Error",
        description: "Información del vehículo no disponible",
        variant: "destructive",
      });
      return;
    }

    const message = encodeURIComponent(
      `Hola! Me interesa el ${sanitizedTitle} publicado en GarageAI por ${sanitizedPrice}.`
    );
    
    try {
      window.open(`https://wa.me/${sanitizedPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo abrir WhatsApp",
        variant: "destructive",
      });
    }
  };

  const handleCall = () => {
    if (!vehicle.dealershipInfo?.phone) {
      toast({
        title: "Error",
        description: "No hay número de teléfono disponible",
        variant: "destructive",
      });
      return;
    }

    const sanitizedPhone = sanitizePhoneNumber(vehicle.dealershipInfo.phone);
    if (!sanitizedPhone) {
      toast({
        title: "Número inválido",
        description: "El número de teléfono no es válido",
        variant: "destructive",
      });
      return;
    }

    try {
      window.location.href = `tel:${sanitizedPhone}`;
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo realizar la llamada",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Main CTA - View on Original Site */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent" />
        <div className="relative p-6">
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {formatPrice(vehicle.price, vehicle.currency)}
            </h3>
            {vehicle.isOpportunity && vehicle.opportunityScore && (
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <Star className="w-3 h-3 mr-1" />
                  Oportunidad AI
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Puntuación: {vehicle.opportunityScore}/100
                </span>
              </div>
            )}
          </div>

          <Button
            onClick={handleViewOriginal}
            className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 group"
            disabled={!vehicle.sourceUrl}
          >
            <span className="flex items-center justify-center gap-3">
              Ver en Sitio Original
              <ExternalLink className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </span>
          </Button>

          {vehicle.sourceUrl && (
            <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              Serás redirigido al sitio del vendedor
            </p>
          )}
        </div>
      </Card>

      {/* Dealer Information Card */}
      {vehicle.dealershipInfo && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-lg mb-1">{vehicle.dealershipInfo.name}</h4>
              {vehicle.dealershipInfo.officialBrand && (
                <Badge variant="secondary" className="mb-2">
                  Concesionario Oficial {vehicle.dealershipInfo.officialBrand}
                </Badge>
              )}
              {vehicle.dealershipInfo.rating && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  <span>{vehicle.dealershipInfo.rating}</span>
                </div>
              )}
            </div>

            {vehicle.dealershipInfo.address && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground">{vehicle.dealershipInfo.address}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {vehicle.dealershipInfo.phone && (
                <Button
                  variant="outline"
                  onClick={handleCall}
                  className="w-full"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Llamar
                </Button>
              )}
              {vehicle.dealershipInfo.whatsapp && (
                <Button
                  variant="outline"
                  onClick={handleWhatsApp}
                  className="w-full bg-green-50 hover:bg-green-100 border-green-200 text-green-700 dark:bg-green-950 dark:hover:bg-green-900 dark:border-green-800 dark:text-green-400"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Trust Badges */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Verificado por GarageAI</span>
        </div>
      </Card>
    </div>
  );
}