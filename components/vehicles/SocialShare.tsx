'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { 
  Share2, 
  MessageCircle, 
  Facebook, 
  Twitter, 
  Link2,
  Check,
  Mail,
  Shield
} from 'lucide-react';
import { formatPrice } from '@/lib/format-utils';

interface SocialShareProps {
  vehicle: {
    id: string;
    title: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    price: string | null;
    currency: string;
    location: string;
  };
}

/**
 * Sanitizes text for safe use in URLs and messages
 * @param text - Text to sanitize
 * @param maxLength - Maximum length of the sanitized text
 * @returns Sanitized text
 */
function sanitizeText(text: string | null | undefined, maxLength: number = 200): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/[<>"'&\n\r\t]/g, '') // Remove HTML/script injection chars
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/data:/gi, '') // Remove data protocol
    .replace(/vbscript:/gi, '') // Remove vbscript protocol
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '') // Remove control characters
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates URL to prevent malicious redirects
 * @param url - URL to validate
 * @returns boolean indicating if URL is safe
 */
function isValidShareUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol) && 
           urlObj.hostname.length > 0 &&
           !urlObj.hostname.includes('localhost') &&
           !urlObj.hostname.match(/^\d+\.\d+\.\d+\.\d+$/) && // No direct IP addresses
           url.length < 2048; // Reasonable URL length limit
  } catch {
    return false;
  }
}

export default function SocialShare({ vehicle }: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Memoized sanitized data to prevent recalculation
  const sanitizedData = useMemo(() => {
    const safeTitle = [
      sanitizeText(vehicle.brand, 50),
      sanitizeText(vehicle.model, 50),
      vehicle.year && !isNaN(vehicle.year) && vehicle.year > 1900 && vehicle.year <= new Date().getFullYear() + 2
        ? vehicle.year.toString() 
        : ''
    ].filter(Boolean).join(' ');
    
    const safeLocation = sanitizeText(vehicle.location, 100);
    const safePrice = formatPrice(vehicle.price, vehicle.currency);
    
    // Create safe share text with length limits
    const shareText = `¡Mira este ${safeTitle}! ${safePrice}${safeLocation ? ` en ${safeLocation}` : ''}`;
    
    return {
      title: safeTitle || 'Vehículo',
      location: safeLocation,
      shareText: shareText.slice(0, 280), // Twitter character limit
      url: typeof window !== 'undefined' ? window.location.href : ''
    };
  }, [vehicle]);

  // Validate the current URL
  const isValidUrl = useMemo(() => {
    return sanitizedData.url && isValidShareUrl(sanitizedData.url);
  }, [sanitizedData.url]);

  const handleShare = async (platform: string) => {
    // Prevent multiple simultaneous sharing operations
    if (isSharing) return;
    
    if (!isValidUrl) {
      toast({
        title: "Error de URL",
        description: "La URL actual no es válida para compartir",
        variant: "destructive",
      });
      return;
    }

    if (!sanitizedData.title || sanitizedData.title === 'Vehículo') {
      toast({
        title: "Datos insuficientes",
        description: "No hay suficiente información del vehículo para compartir",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);
    
    try {
      switch (platform) {
        case 'whatsapp':
          const whatsappText = `${sanitizedData.shareText} ${sanitizedData.url}`;
          if (whatsappText.length > 1000) { // WhatsApp practical limit
            toast({
              title: "Mensaje muy largo",
              description: "El mensaje es demasiado largo para WhatsApp",
              variant: "destructive",
            });
            return;
          }
          window.open(
            `https://wa.me/?text=${encodeURIComponent(whatsappText)}`,
            '_blank',
            'noopener,noreferrer'
          );
          break;

        case 'facebook':
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sanitizedData.url)}`,
            '_blank',
            'noopener,noreferrer'
          );
          break;

        case 'twitter':
          const twitterText = sanitizedData.shareText.slice(0, 220); // Leave room for URL
          window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(sanitizedData.url)}`,
            '_blank',
            'noopener,noreferrer'
          );
          break;

        case 'email':
          const emailSubject = `${sanitizedData.title} - GarageAI`.slice(0, 100);
          const emailBody = `${sanitizedData.shareText}\n\nVer detalles en: ${sanitizedData.url}`;
          
          if (emailBody.length > 2000) {
            toast({
              title: "Contenido muy largo",
              description: "El contenido es demasiado largo para email",
              variant: "destructive",
            });
            return;
          }
          
          try {
            window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
          } catch (error) {
            toast({
              title: "Error de email",
              description: "No se pudo abrir el cliente de email",
              variant: "destructive",
            });
          }
          break;

        case 'copy':
          await handleCopyToClipboard();
          break;

        case 'native':
          if (typeof navigator !== 'undefined' && navigator.share) {
            try {
              await navigator.share({
                title: sanitizedData.title,
                text: sanitizedData.shareText,
                url: sanitizedData.url,
              });
            } catch (error) {
              // User cancelled or error occurred
              if (error instanceof Error && error.name !== 'AbortError') {
                console.warn('Share error:', error);
                // Fallback to copy
                await handleCopyToClipboard();
              }
            }
          } else {
            // Fallback to copy
            await handleCopyToClipboard();
          }
          break;
      }
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "Error al compartir",
        description: "No se pudo completar la acción",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(sanitizedData.url);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = sanitizedData.url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopied(true);
      toast({
        title: "¡Enlace copiado!",
        description: "El enlace se copió al portapapeles",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Clipboard error:', error);
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar el enlace al portapapeles",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Compartir vehículo</h3>
          {isValidUrl && (
            <Shield className="w-4 h-4 text-green-600" title="URL verificada y segura" />
          )}
        </div>
        {typeof navigator !== 'undefined' && navigator.share && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleShare('native')}
            className="lg:hidden"
            disabled={isSharing || !isValidUrl}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare('whatsapp')}
          className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 dark:bg-green-950 dark:hover:bg-green-900 dark:border-green-800 dark:text-green-400"
          disabled={isSharing || !isValidUrl}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          WhatsApp
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare('facebook')}
          className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:border-blue-800 dark:text-blue-400"
          disabled={isSharing || !isValidUrl}
        >
          <Facebook className="w-4 h-4 mr-2" />
          Facebook
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare('twitter')}
          className="bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-700 dark:bg-sky-950 dark:hover:bg-sky-900 dark:border-sky-800 dark:text-sky-400"
          disabled={isSharing || !isValidUrl}
        >
          <Twitter className="w-4 h-4 mr-2" />
          Twitter
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare('copy')}
          className="relative"
          disabled={isSharing || !isValidUrl}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Copiado
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4 mr-2" />
              Copiar
            </>
          )}
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare('email')}
        className="w-full mt-2"
        disabled={isSharing || !isValidUrl}
      >
        <Mail className="w-4 h-4 mr-2" />
        Enviar por email
      </Button>
    </Card>
  );
}