/**
 * Vehicle-specific utility functions for the Argentine car marketplace
 * Data processing, validation, and helper functions for vehicle operations
 */

import { formatPrice, formatMileage, formatVehicleTitle, formatLocation } from './format-utils';
import type { VehicleSearchResult, VehicleDetails } from './car-queries';
import type { VehicleFilters } from './validation-schemas';

// Argentine provinces data
export const ARGENTINE_PROVINCES = {
  '1': { name: 'Buenos Aires', code: 'BA', region: 'Centro' },
  '2': { name: 'Catamarca', code: 'CT', region: 'NOA' },
  '3': { name: 'Chaco', code: 'CC', region: 'NEA' },
  '4': { name: 'Chubut', code: 'CH', region: 'Patagonia' },
  '5': { name: 'Córdoba', code: 'CB', region: 'Centro' },
  '6': { name: 'Corrientes', code: 'CN', region: 'NEA' },
  '7': { name: 'Entre Ríos', code: 'ER', region: 'Centro' },
  '8': { name: 'Formosa', code: 'FA', region: 'NEA' },
  '9': { name: 'Jujuy', code: 'JY', region: 'NOA' },
  '10': { name: 'La Pampa', code: 'LP', region: 'Centro' },
  '11': { name: 'La Rioja', code: 'LR', region: 'NOA' },
  '12': { name: 'Mendoza', code: 'MZ', region: 'Cuyo' },
  '13': { name: 'Misiones', code: 'MN', region: 'NEA' },
  '14': { name: 'Neuquén', code: 'NQ', region: 'Patagonia' },
  '15': { name: 'Río Negro', code: 'RN', region: 'Patagonia' },
  '16': { name: 'Salta', code: 'SA', region: 'NOA' },
  '17': { name: 'San Juan', code: 'SJ', region: 'Cuyo' },
  '18': { name: 'San Luis', code: 'SL', region: 'Cuyo' },
  '19': { name: 'Santa Cruz', code: 'SC', region: 'Patagonia' },
  '20': { name: 'Santa Fe', code: 'SF', region: 'Centro' },
  '21': { name: 'Santiago del Estero', code: 'SE', region: 'NOA' },
  '22': { name: 'Tierra del Fuego', code: 'TF', region: 'Patagonia' },
  '23': { name: 'Tucumán', code: 'TM', region: 'NOA' },
  '24': { name: 'Ciudad Autónoma de Buenos Aires', code: 'CABA', region: 'Centro' }
} as const;

// Common fuel types in Argentina
export const FUEL_TYPES = {
  'nafta': 'Nafta',
  'diesel': 'Diésel',
  'gnc': 'GNC',
  'hibrido': 'Híbrido',
  'electrico': 'Eléctrico',
  'flex': 'Flex'
} as const;

// Transmission types
export const TRANSMISSION_TYPES = {
  'manual': 'Manual',
  'automatica': 'Automática',
  'cvt': 'CVT',
  'semiautomatica': 'Semiautomática'
} as const;

// Vehicle conditions
export const VEHICLE_CONDITIONS = {
  'nuevo': 'Nuevo',
  'usado': 'Usado',
  'excelente': 'Excelente',
  'muy_bueno': 'Muy bueno',
  'bueno': 'Bueno',
  'regular': 'Regular'
} as const;

// Popular car brands in Argentina
export const POPULAR_BRANDS = [
  'Toyota', 'Ford', 'Chevrolet', 'Volkswagen', 'Renault', 'Peugeot', 'Fiat',
  'Honda', 'Nissan', 'Hyundai', 'Citroën', 'Kia', 'Suzuki', 'Mitsubishi'
];

/**
 * Normalize vehicle data for consistent display
 */
export function normalizeVehicleData(vehicle: Partial<VehicleSearchResult>): VehicleSearchResult {
  return {
    id: vehicle.id || '',
    title: vehicle.title || 'Vehículo sin título',
    price: vehicle.price || null,
    currency: vehicle.currency || 'ARS',
    year: vehicle.year || null,
    mileage: vehicle.mileage || null,
    brand: vehicle.brand || null,
    model: vehicle.model || null,
    location: vehicle.location || 'Ubicación no especificada',
    dealership: vehicle.dealership || null,
    dealershipSlug: vehicle.dealershipSlug || null,
    primaryImage: vehicle.primaryImage || null,
    isOpportunity: vehicle.isOpportunity || false,
    opportunityScore: vehicle.opportunityScore || null,
    condition: vehicle.condition || 'usado',
    fuel: vehicle.fuel || null,
    transmission: vehicle.transmission || null,
    createdAt: vehicle.createdAt || new Date()
  };
}

/**
 * Calculate opportunity badge type based on score
 */
export function getOpportunityBadgeType(score: number | null | undefined): {
  type: 'excellent' | 'good' | 'moderate' | 'low' | null;
  label: string;
  color: string;
} {
  if (!score || score < 40) {
    return { type: null, label: '', color: '' };
  }

  if (score >= 80) {
    return { 
      type: 'excellent', 
      label: 'Excelente oportunidad', 
      color: 'bg-green-500 text-white' 
    };
  } else if (score >= 60) {
    return { 
      type: 'good', 
      label: 'Buena oportunidad', 
      color: 'bg-blue-500 text-white' 
    };
  } else if (score >= 40) {
    return { 
      type: 'moderate', 
      label: 'Oportunidad', 
      color: 'bg-yellow-500 text-white' 
    };
  }

  return { type: null, label: '', color: '' };
}

/**
 * Generate vehicle SEO-friendly URL slug
 */
export function generateVehicleSlug(vehicle: Pick<VehicleSearchResult, 'brand' | 'model' | 'year' | 'id'>): string {
  const parts = [];
  
  if (vehicle.brand) parts.push(vehicle.brand.toLowerCase());
  if (vehicle.model) parts.push(vehicle.model.toLowerCase());
  if (vehicle.year) parts.push(vehicle.year.toString());
  
  const slug = parts
    .join('-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  return slug || vehicle.id;
}

/**
 * Extract vehicle features from description or specifications
 */
export function extractVehicleFeatures(description: string | null): string[] {
  if (!description) return [];

  const features: string[] = [];
  const text = description.toLowerCase();

  // Common features to look for
  const featureMap = {
    'aire acondicionado': ['aire', 'a/c', 'clima'],
    'airbag': ['airbag', 'air bag'],
    'abs': ['abs', 'frenos abs'],
    'dirección asistida': ['direccion asistida', 'hidraulica'],
    'control de estabilidad': ['esp', 'control estabilidad'],
    'bluetooth': ['bluetooth', 'hands free'],
    'gps': ['gps', 'navegador'],
    'cámara trasera': ['camara trasera', 'sensor parking'],
    'techo corredizo': ['techo corredizo', 'sunroof'],
    'llantas de aleación': ['llantas aleacion', 'rines'],
    'tapizado de cuero': ['cuero', 'leather'],
    'xenón': ['xenon', 'luces xenon'],
    'turbo': ['turbo', 'turbocargado']
  };

  Object.entries(featureMap).forEach(([feature, keywords]) => {
    if (keywords.some(keyword => text.includes(keyword))) {
      features.push(feature);
    }
  });

  return features;
}

/**
 * Calculate estimated monthly payment
 */
export function calculateEstimatedPayment(
  price: number, 
  downPayment: number = 0, 
  months: number = 60, 
  interestRate: number = 0.25 // 25% annual rate (typical in Argentina)
): {
  monthlyPayment: number;
  totalAmount: number;
  totalInterest: number;
} {
  const loanAmount = price - downPayment;
  const monthlyRate = interestRate / 12;
  
  if (monthlyRate === 0) {
    const monthlyPayment = loanAmount / months;
    return {
      monthlyPayment,
      totalAmount: loanAmount,
      totalInterest: 0
    };
  }

  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
    (Math.pow(1 + monthlyRate, months) - 1);
  
  const totalAmount = monthlyPayment * months;
  const totalInterest = totalAmount - loanAmount;

  return {
    monthlyPayment: Math.round(monthlyPayment),
    totalAmount: Math.round(totalAmount),
    totalInterest: Math.round(totalInterest)
  };
}

/**
 * Validate vehicle data completeness
 */
export function validateVehicleData(vehicle: Partial<VehicleSearchResult>): {
  isValid: boolean;
  score: number;
  missing: string[];
  warnings: string[];
} {
  let score = 0;
  const missing: string[] = [];
  const warnings: string[] = [];

  // Essential fields (20 points each)
  const essentialFields = {
    title: vehicle.title,
    price: vehicle.price,
    year: vehicle.year,
    brand: vehicle.brand,
    model: vehicle.model
  };

  Object.entries(essentialFields).forEach(([field, value]) => {
    if (value) {
      score += 20;
    } else {
      missing.push(field);
    }
  });

  // Important fields (10 points each)
  const importantFields = {
    mileage: vehicle.mileage,
    fuel: vehicle.fuel,
    transmission: vehicle.transmission,
    condition: vehicle.condition,
    location: vehicle.location,
    primaryImage: vehicle.primaryImage
  };

  Object.entries(importantFields).forEach(([field, value]) => {
    if (value) {
      score += 10;
    } else {
      warnings.push(field);
    }
  });

  // Bonus for dealership info (10 points)
  if (vehicle.dealership) {
    score += 10;
  }

  const isValid = score >= 60; // At least 60% completeness

  return {
    isValid,
    score: Math.min(score, 100),
    missing,
    warnings
  };
}

/**
 * Compare two vehicles for similarity
 */
export function compareVehicles(vehicle1: VehicleSearchResult, vehicle2: VehicleSearchResult): {
  similarity: number;
  commonFeatures: string[];
  differences: string[];
} {
  let similarity = 0;
  const commonFeatures: string[] = [];
  const differences: string[] = [];

  // Brand comparison (25 points)
  if (vehicle1.brand === vehicle2.brand) {
    similarity += 25;
    commonFeatures.push('Misma marca');
  } else {
    differences.push('Marca diferente');
  }

  // Model comparison (25 points)
  if (vehicle1.model === vehicle2.model) {
    similarity += 25;
    commonFeatures.push('Mismo modelo');
  } else {
    differences.push('Modelo diferente');
  }

  // Year comparison (20 points - more similar if closer years)
  if (vehicle1.year && vehicle2.year) {
    const yearDiff = Math.abs(vehicle1.year - vehicle2.year);
    if (yearDiff === 0) {
      similarity += 20;
      commonFeatures.push('Mismo año');
    } else if (yearDiff <= 2) {
      similarity += 15;
      commonFeatures.push('Años similares');
    } else if (yearDiff <= 5) {
      similarity += 10;
    }
  }

  // Price comparison (15 points)
  if (vehicle1.price && vehicle2.price) {
    const price1 = parseFloat(vehicle1.price);
    const price2 = parseFloat(vehicle2.price);
    const priceDiff = Math.abs(price1 - price2) / Math.max(price1, price2);
    
    if (priceDiff <= 0.1) { // Within 10%
      similarity += 15;
      commonFeatures.push('Precio similar');
    } else if (priceDiff <= 0.25) { // Within 25%
      similarity += 10;
    }
  }

  // Fuel type comparison (10 points)
  if (vehicle1.fuel === vehicle2.fuel) {
    similarity += 10;
    commonFeatures.push('Mismo combustible');
  } else {
    differences.push('Combustible diferente');
  }

  // Transmission comparison (5 points)
  if (vehicle1.transmission === vehicle2.transmission) {
    similarity += 5;
    commonFeatures.push('Misma transmisión');
  } else {
    differences.push('Transmisión diferente');
  }

  return {
    similarity: Math.min(similarity, 100),
    commonFeatures,
    differences
  };
}

/**
 * Get vehicle age category
 */
export function getVehicleAgeCategory(year: number | null): {
  category: 'new' | 'recent' | 'modern' | 'older' | 'classic';
  label: string;
} {
  if (!year) {
    return { category: 'older', label: 'Año no especificado' };
  }

  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  if (age <= 1) {
    return { category: 'new', label: 'Nuevo/Casi nuevo' };
  } else if (age <= 3) {
    return { category: 'recent', label: 'Reciente' };
  } else if (age <= 7) {
    return { category: 'modern', label: 'Moderno' };
  } else if (age <= 15) {
    return { category: 'older', label: 'Usado' };
  } else {
    return { category: 'classic', label: 'Clásico' };
  }
}

/**
 * Get mileage category
 */
export function getMileageCategory(mileage: number | null): {
  category: 'low' | 'average' | 'high' | 'very_high';
  label: string;
} {
  if (!mileage) {
    return { category: 'average', label: 'Kilometraje no especificado' };
  }

  if (mileage <= 50000) {
    return { category: 'low', label: 'Bajo kilometraje' };
  } else if (mileage <= 150000) {
    return { category: 'average', label: 'Kilometraje promedio' };
  } else if (mileage <= 250000) {
    return { category: 'high', label: 'Alto kilometraje' };
  } else {
    return { category: 'very_high', label: 'Kilometraje muy alto' };
  }
}

/**
 * Generate vehicle sharing data
 */
export function generateSharingData(vehicle: VehicleSearchResult): {
  title: string;
  description: string;
  url: string;
  price: string;
} {
  const title = formatVehicleTitle(vehicle.brand, vehicle.model, vehicle.year);
  const price = vehicle.price ? formatPrice(parseFloat(vehicle.price)) : 'Consultar precio';
  
  return {
    title: `${title} - ${price}`,
    description: `${title} en ${vehicle.location}. ${vehicle.mileage ? formatMileage(vehicle.mileage) : ''} ${vehicle.fuel || ''} ${vehicle.transmission || ''}`.trim(),
    url: `/vehiculos/${vehicle.id}`,
    price
  };
}

/**
 * Filter active filters for display
 */
export function getActiveFilters(filters: Partial<VehicleFilters>): Array<{
  key: string;
  label: string;
  value: string;
}> {
  const activeFilters: Array<{ key: string; label: string; value: string }> = [];

  if (filters.searchQuery) {
    activeFilters.push({
      key: 'searchQuery',
      label: 'Búsqueda',
      value: filters.searchQuery
    });
  }

  if (filters.priceMin || filters.priceMax) {
    const min = filters.priceMin ? formatPrice(filters.priceMin) : 'Sin mínimo';
    const max = filters.priceMax ? formatPrice(filters.priceMax) : 'Sin máximo';
    activeFilters.push({
      key: 'price',
      label: 'Precio',
      value: `${min} - ${max}`
    });
  }

  if (filters.yearMin || filters.yearMax) {
    const min = filters.yearMin || 'Sin mínimo';
    const max = filters.yearMax || 'Sin máximo';
    activeFilters.push({
      key: 'year',
      label: 'Año',
      value: `${min} - ${max}`
    });
  }

  if (filters.mileageMax) {
    activeFilters.push({
      key: 'mileage',
      label: 'Kilometraje máximo',
      value: formatMileage(filters.mileageMax)
    });
  }

  if (filters.fuelType) {
    activeFilters.push({
      key: 'fuelType',
      label: 'Combustible',
      value: FUEL_TYPES[filters.fuelType as keyof typeof FUEL_TYPES] || filters.fuelType
    });
  }

  if (filters.transmissionType) {
    activeFilters.push({
      key: 'transmissionType',
      label: 'Transmisión',
      value: TRANSMISSION_TYPES[filters.transmissionType as keyof typeof TRANSMISSION_TYPES] || filters.transmissionType
    });
  }

  if (filters.onlyOpportunities) {
    activeFilters.push({
      key: 'onlyOpportunities',
      label: 'Filtro',
      value: 'Solo oportunidades'
    });
  }

  if (filters.onlyFeatured) {
    activeFilters.push({
      key: 'onlyFeatured',
      label: 'Filtro',
      value: 'Solo destacados'
    });
  }

  return activeFilters;
}

/**
 * Generate default contact message for a vehicle
 */
export function generateContactMessage(vehicle: VehicleSearchResult, inquiryType: string = 'general'): string {
  const title = formatVehicleTitle(vehicle.brand, vehicle.model, vehicle.year);
  const price = vehicle.price ? formatPrice(parseFloat(vehicle.price)) : '';
  
  let message = `Hola! Me interesa el ${title}`;
  
  if (price) {
    message += ` publicado a ${price}`;
  }
  
  switch (inquiryType) {
    case 'pricing':
      message += '. ¿Cuál es el mejor precio que pueden ofrecer?';
      break;
    case 'financing':
      message += '. ¿Tienen opciones de financiación disponibles?';
      break;
    case 'test_drive':
      message += '. ¿Puedo programar una prueba de manejo?';
      break;
    case 'inspection':
      message += '. ¿Puedo ver el vehículo y hacer una inspección?';
      break;
    default:
      message += '. ¿Podrían brindarme más información?';
  }
  
  message += ' ¡Gracias!';
  
  return message;
}

export default {
  ARGENTINE_PROVINCES,
  FUEL_TYPES,
  TRANSMISSION_TYPES,
  VEHICLE_CONDITIONS,
  POPULAR_BRANDS,
  normalizeVehicleData,
  getOpportunityBadgeType,
  generateVehicleSlug,
  extractVehicleFeatures,
  calculateEstimatedPayment,
  validateVehicleData,
  compareVehicles,
  getVehicleAgeCategory,
  getMileageCategory,
  generateSharingData,
  getActiveFilters,
  generateContactMessage
};