/**
 * Formatting utilities for Argentine locale
 * Handles currency (ARS), dates, numbers, and other locale-specific formatting
 */

import { translations } from './translations';

// Argentine locale configuration
const ARGENTINE_LOCALE = 'es-AR';
const ARGENTINE_TIMEZONE = 'America/Argentina/Buenos_Aires';

/**
 * Format price in Argentine Pesos (ARS)
 */
export function formatPrice(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return 'Consultar precio';
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return 'Consultar precio';
  }

  // Format with ARS currency
  return new Intl.NumberFormat(ARGENTINE_LOCALE, {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
}

/**
 * Format price in a compact way (e.g., $1.5M instead of $1.500.000)
 */
export function formatPriceCompact(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return 'Consultar';
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return 'Consultar';
  }

  // Format with compact notation
  return new Intl.NumberFormat(ARGENTINE_LOCALE, {
    style: 'currency',
    currency: 'ARS',
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(numAmount);
}

/**
 * Format number with Argentine locale (uses . for thousands separator)
 */
export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined || num === '') {
    return '0';
  }

  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  
  if (isNaN(numValue)) {
    return '0';
  }

  return new Intl.NumberFormat(ARGENTINE_LOCALE).format(numValue);
}

/**
 * Format mileage with km suffix
 */
export function formatMileage(mileage: number | string | null | undefined): string {
  if (mileage === null || mileage === undefined || mileage === '') {
    return 'N/A';
  }

  const numMileage = typeof mileage === 'string' ? parseFloat(mileage) : mileage;
  
  if (isNaN(numMileage) || numMileage < 0) {
    return 'N/A';
  }

  return `${formatNumber(numMileage)} km`;
}

/**
 * Format date in Argentine format (DD/MM/YYYY)
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'N/A';
  }

  return dateObj.toLocaleDateString(ARGENTINE_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: ARGENTINE_TIMEZONE
  });
}

/**
 * Format date and time in Argentine format
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'N/A';
  }

  return dateObj.toLocaleString(ARGENTINE_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ARGENTINE_TIMEZONE
  });
}

/**
 * Format relative time (e.g., "hace 2 días")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'N/A';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return 'Ahora';
  } else if (diffMinutes < 60) {
    return `hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
  } else if (diffHours < 24) {
    return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  } else if (diffDays < 7) {
    return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  } else if (diffWeeks < 4) {
    return `hace ${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'}`;
  } else if (diffMonths < 12) {
    return `hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
  } else {
    return `hace ${diffYears} ${diffYears === 1 ? 'año' : 'años'}`;
  }
}

/**
 * Build WhatsApp URL with pre-filled message
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  if (!phone) {
    return '#';
  }

  // Clean phone number (remove all non-numeric characters)
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Add Argentina country code if not present
  const phoneWithCountry = cleanPhone.startsWith('54') ? cleanPhone : `54${cleanPhone}`;
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${phoneWithCountry}?text=${encodedMessage}`;
}

/**
 * Build default WhatsApp message for vehicle inquiries
 */
export function buildVehicleWhatsAppMessage(vehicleTitle: string, vehiclePrice?: string, dealershipName?: string): string {
  const baseMessage = `Hola! Me interesa el vehículo: ${vehicleTitle}`;
  
  let message = baseMessage;
  
  if (vehiclePrice) {
    message += `\nPrecio publicado: ${vehiclePrice}`;
  }
  
  if (dealershipName) {
    message += `\nVisto en: ${dealershipName}`;
  }
  
  message += '\n¿Podrían brindarme más información? ¡Gracias!';
  
  return message;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) {
    return 'N/A';
  }

  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Format as Argentine phone number
  if (cleanPhone.length >= 10) {
    // Mobile: +54 9 11 1234-5678
    if (cleanPhone.startsWith('549')) {
      const areaCode = cleanPhone.substring(3, 5);
      const firstPart = cleanPhone.substring(5, 9);
      const secondPart = cleanPhone.substring(9);
      return `+54 9 ${areaCode} ${firstPart}-${secondPart}`;
    }
    // Landline: +54 11 1234-5678
    else if (cleanPhone.startsWith('54')) {
      const areaCode = cleanPhone.substring(2, 4);
      const firstPart = cleanPhone.substring(4, 8);
      const secondPart = cleanPhone.substring(8);
      return `+54 ${areaCode} ${firstPart}-${secondPart}`;
    }
  }
  
  // If format is not recognized, return as is
  return phone;
}

/**
 * Format engine size (e.g., 2.0 -> "2.0L")
 */
export function formatEngineSize(engineSize: number | string | null | undefined): string {
  if (engineSize === null || engineSize === undefined || engineSize === '') {
    return 'N/A';
  }

  const numEngineSize = typeof engineSize === 'string' ? parseFloat(engineSize) : engineSize;
  
  if (isNaN(numEngineSize) || numEngineSize <= 0) {
    return 'N/A';
  }

  return `${numEngineSize.toFixed(1)}L`;
}

/**
 * Format horsepower (e.g., 150 -> "150 HP")
 */
export function formatHorsepower(horsepower: number | string | null | undefined): string {
  if (horsepower === null || horsepower === undefined || horsepower === '') {
    return 'N/A';
  }

  const numHorsepower = typeof horsepower === 'string' ? parseFloat(horsepower) : horsepower;
  
  if (isNaN(numHorsepower) || numHorsepower <= 0) {
    return 'N/A';
  }

  return `${Math.round(numHorsepower)} HP`;
}

/**
 * Format vehicle specifications for display
 */
export function formatVehicleSpecs(vehicle: {
  year?: number | null;
  mileage?: number | null;
  engineSize?: number | null;
  horsepower?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  condition?: string | null;
  color?: string | null;
  doors?: number | null;
  seats?: number | null;
}) {
  return {
    year: vehicle.year?.toString() || 'N/A',
    mileage: formatMileage(vehicle.mileage),
    engineSize: formatEngineSize(vehicle.engineSize),
    horsepower: formatHorsepower(vehicle.horsepower),
    fuel: vehicle.fuel || 'N/A',
    transmission: vehicle.transmission || 'N/A',
    condition: vehicle.condition || 'Usado',
    color: vehicle.color || 'N/A',
    doors: vehicle.doors ? `${vehicle.doors} puertas` : 'N/A',
    seats: vehicle.seats ? `${vehicle.seats} asientos` : 'N/A'
  };
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) {
    return '';
  }
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate SEO-friendly slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Normalize to decomposed form
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Format percentage
 */
export function formatPercentage(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  return `${value.toFixed(decimals)}%`;
}

/**
 * Format opportunity score as badge text
 */
export function formatOpportunityScore(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) {
    return 'N/A';
  }

  if (score >= 80) {
    return 'Excelente oportunidad';
  } else if (score >= 60) {
    return 'Buena oportunidad';
  } else if (score >= 40) {
    return 'Oportunidad moderada';
  } else {
    return 'Oportunidad baja';
  }
}

/**
 * Format price variation (above/below market price)
 */
export function formatPriceVariation(variation: number | null | undefined): string {
  if (variation === null || variation === undefined || isNaN(variation)) {
    return 'N/A';
  }

  const absVariation = Math.abs(variation);
  const formattedPercentage = formatPercentage(absVariation);
  
  if (variation > 0) {
    return `+${formattedPercentage} sobre mercado`;
  } else if (variation < 0) {
    return `-${formattedPercentage} bajo mercado`;
  } else {
    return 'Precio de mercado';
  }
}

/**
 * Format vehicle title for display
 */
export function formatVehicleTitle(brand?: string, model?: string, year?: number): string {
  const parts = [];
  
  if (brand) parts.push(brand);
  if (model) parts.push(model);
  if (year) parts.push(year.toString());
  
  return parts.join(' ') || 'Vehículo';
}

/**
 * Format location (city, province)
 */
export function formatLocation(city?: string | null, province?: string | null): string {
  const parts = [];
  
  if (city) parts.push(city);
  if (province) parts.push(province);
  
  return parts.join(', ') || 'Ubicación no especificada';
}

/**
 * Validate and format Argentine phone number
 */
export function validateAndFormatPhone(phone: string): { isValid: boolean; formatted: string } {
  if (!phone) {
    return { isValid: false, formatted: '' };
  }

  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check if it's a valid Argentine phone number
  const isValid = cleanPhone.length >= 10 && (
    cleanPhone.startsWith('54') || // International format
    cleanPhone.length === 10 || // National format
    cleanPhone.length === 11 // Mobile with area code
  );

  return {
    isValid,
    formatted: isValid ? formatPhoneNumber(phone) : phone
  };
}

/**
 * Format business hours
 */
export function formatBusinessHours(hours: any): string {
  if (!hours || typeof hours !== 'object') {
    return 'Consultar horarios';
  }

  // Simple formatting - can be enhanced based on data structure
  if (typeof hours === 'string') {
    return hours;
  }

  // If it's an object with day-specific hours, format accordingly
  return 'Consultar horarios';
}

/**
 * Capitalize first letter of each word
 */
export function capitalizeWords(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format currency range (for filters)
 */
export function formatPriceRange(min: number, max: number): string {
  const formattedMin = formatPrice(min);
  const formattedMax = formatPrice(max);
  
  return `${formattedMin} - ${formattedMax}`;
}

/**
 * Format compact number for counters (e.g., 1.2K, 1.5M)
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  } else if (num < 1000000) {
    return `${(num / 1000).toFixed(1)}K`;
  } else {
    return `${(num / 1000000).toFixed(1)}M`;
  }
}

export default {
  formatPrice,
  formatPriceCompact,
  formatNumber,
  formatMileage,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  buildWhatsAppUrl,
  buildVehicleWhatsAppMessage,
  formatPhoneNumber,
  formatEngineSize,
  formatHorsepower,
  formatVehicleSpecs,
  truncateText,
  generateSlug,
  formatPercentage,
  formatOpportunityScore,
  formatPriceVariation,
  formatVehicleTitle,
  formatLocation,
  validateAndFormatPhone,
  formatBusinessHours,
  capitalizeWords,
  formatPriceRange,
  formatCompactNumber
};