/**
 * Zod validation schemas for the Argentine car marketplace
 * Handles vehicle filters, contact forms, and data validation 
 */

import { z } from 'zod';

// Current year for validation
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1950;

/**
 * Vehicle Filters Base Schema
 * Used for marketplace search and filtering (without refinements)
 */
const VehicleFiltersBaseSchema = z.object({
  // Price filters
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  
  // Location filters
  provinceId: z.string().optional(),
  cityId: z.string().optional(),
  
  // Brand and model filters
  brandId: z.string().optional(),
  modelId: z.string().optional(),
  
  // Year filters
  yearMin: z.number().min(MIN_YEAR).max(CURRENT_YEAR).optional(),
  yearMax: z.number().min(MIN_YEAR).max(CURRENT_YEAR).optional(),
  
  // Mileage filter
  mileageMax: z.number().min(0).max(1000000).optional(),
  
  // Vehicle characteristics
  fuelType: z.string().optional(),
  transmissionType: z.string().optional(),
  condition: z.string().optional(),
  color: z.string().optional(),
  
  // Special filters
  onlyOpportunities: z.boolean().optional(),
  onlyFeatured: z.boolean().optional(),
  withPhotos: z.boolean().optional(),
  withFinancing: z.boolean().optional(),
  withWarranty: z.boolean().optional(),
  
  // Dealership filters
  dealershipId: z.string().uuid().optional(),
  dealershipType: z.string().optional(),
  officialBrand: z.string().optional(),
  
  // Search query
  searchQuery: z.string().max(200).optional(),
  
  // Pagination
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  
  // Sorting
  sortBy: z.enum([
    'relevance',
    'price_asc',
    'price_desc', 
    'year_desc',
    'year_asc',
    'mileage_asc',
    'mileage_desc',
    'date_desc',
    'date_asc',
    'opportunity_score_desc'
  ]).default('relevance'),
});

/**
 * Vehicle Filters Schema with refinements
 * Used for marketplace search and filtering
 */
export const VehicleFiltersSchema = VehicleFiltersBaseSchema.refine((data) => {
  // Ensure price range is valid
  if (data.priceMin && data.priceMax) {
    return data.priceMin <= data.priceMax;
  }
  return true;
}, {
  message: "El precio mínimo debe ser menor o igual al precio máximo",
  path: ["priceMax"]
}).refine((data) => {
  // Ensure year range is valid
  if (data.yearMin && data.yearMax) {
    return data.yearMin <= data.yearMax;
  }
  return true;
}, {
  message: "El año mínimo debe ser menor o igual al año máximo",
  path: ["yearMax"]
});

/**
 * Contact Dealer Schema
 * Used for vehicle inquiry forms
 */
export const ContactDealerSchema = z.object({
  // Required fields
  vehicleId: z.string().uuid({ message: "ID de vehículo inválido" }),
  dealershipId: z.string().uuid({ message: "ID de concesionaria inválido" }),
  customerName: z.string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "El nombre no puede exceder 100 caracteres" }),
  customerPhone: z.string()
    .min(10, { message: "El teléfono debe tener al menos 10 dígitos" })
    .max(20, { message: "El teléfono no puede exceder 20 caracteres" })
    .regex(/^[0-9+\-\s()]+$/, { message: "Formato de teléfono inválido" }),
  
  // Optional fields
  customerEmail: z.string()
    .email({ message: "Email inválido" })
    .optional()
    .or(z.literal("")),
  
  message: z.string()
    .max(500, { message: "El mensaje no puede exceder 500 caracteres" })
    .optional(),
    
  inquiryType: z.enum([
    'general',
    'pricing', 
    'financing',
    'test_drive',
    'inspection',
    'reservation'
  ]).default('general'),
  
  preferredContact: z.enum(['phone', 'whatsapp', 'email']).default('whatsapp'),
  
  // Consent and legal
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "Debe aceptar los términos y condiciones"
  }),
  acceptPrivacy: z.boolean().refine((val) => val === true, {
    message: "Debe aceptar la política de privacidad"
  }),
  allowMarketing: z.boolean().optional().default(false)
});

/**
 * Dealership Filters Schema
 * Used for dealership directory filtering
 */
export const DealershipFiltersSchema = z.object({
  // Location filters
  provinceId: z.string().optional(),
  cityId: z.string().optional(),
  
  // Business type filters
  dealershipType: z.enum(['official', 'multimarca']).optional(),
  officialBrand: z.string().optional(),
  
  // Status filters
  isVerified: z.boolean().optional(),
  hasVehicles: z.boolean().optional(),
  
  // Search
  searchQuery: z.string().max(200).optional(),
  
  // Pagination and sorting
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
  sortBy: z.enum(['name', 'rating', 'vehicleCount', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

/**
 * Dealership Contact Schema
 * Used for contacting dealerships directly
 */
export const ContactDealershipSchema = z.object({
  dealershipId: z.string().uuid({ message: "ID de concesionaria inválido" }),
  
  customerName: z.string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "El nombre no puede exceder 100 caracteres" }),
    
  customerPhone: z.string()
    .min(10, { message: "El teléfono debe tener al menos 10 dígitos" })
    .max(20, { message: "El teléfono no puede exceder 20 caracteres" })
    .regex(/^[0-9+\-\s()]+$/, { message: "Formato de teléfono inválido" }),
  
  customerEmail: z.string()
    .email({ message: "Email inválido" })
    .optional()
    .or(z.literal("")),
  
  inquiryType: z.enum([
    'general_inquiry',
    'vehicle_availability',
    'financing_options',
    'trade_in',
    'service_appointment',
    'parts_inquiry'
  ]).default('general_inquiry'),
  
  message: z.string()
    .min(10, { message: "El mensaje debe tener al menos 10 caracteres" })
    .max(1000, { message: "El mensaje no puede exceder 1000 caracteres" }),
    
  preferredContact: z.enum(['phone', 'whatsapp', 'email']).default('whatsapp'),
  
  acceptPrivacy: z.boolean().refine((val) => val === true, {
    message: "Debe aceptar la política de privacidad"
  })
});

/**
 * Dealership Inventory Filters Schema
 * Used for filtering vehicles within a specific dealership
 */
export const DealershipInventoryFiltersSchema = z.object({
  // Basic filters
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  yearMin: z.number().min(1950).max(new Date().getFullYear()).optional(),
  yearMax: z.number().min(1950).max(new Date().getFullYear()).optional(),
  mileageMax: z.number().min(0).max(1000000).optional(),
  
  // Vehicle characteristics
  brandId: z.string().optional(),
  condition: z.string().optional(),
  fuelType: z.string().optional(),
  transmissionType: z.string().optional(),
  
  // Search
  searchQuery: z.string().max(200).optional(),
  
  // Pagination and sorting
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
  sortBy: z.enum(['price', 'year', 'mileage', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

/**
 * Vehicle Search Schema (for quick search)
 */
export const VehicleSearchSchema = z.object({
  query: z.string()
    .min(2, { message: "La búsqueda debe tener al menos 2 caracteres" })
    .max(100, { message: "La búsqueda no puede exceder 100 caracteres" }),
  
  filters: VehicleFiltersBaseSchema.partial().optional()
});

/**
 * Newsletter Subscription Schema
 */
export const NewsletterSchema = z.object({
  email: z.string()
    .email({ message: "Email inválido" }),
  
  name: z.string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "El nombre no puede exceder 100 caracteres" })
    .optional(),
  
  interests: z.array(z.string()).optional(),
  
  acceptPrivacy: z.boolean().refine((val) => val === true, {
    message: "Debe aceptar la política de privacidad"
  })
});

/**
 * Contact Form Schema (general contact)
 */
export const ContactFormSchema = z.object({
  name: z.string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "El nombre no puede exceder 100 caracteres" }),
  
  email: z.string()
    .email({ message: "Email inválido" }),
  
  phone: z.string()
    .min(10, { message: "El teléfono debe tener al menos 10 dígitos" })
    .max(20, { message: "El teléfono no puede exceder 20 caracteres" })
    .regex(/^[0-9+\-\s()]+$/, { message: "Formato de teléfono inválido" })
    .optional(),
  
  subject: z.string()
    .min(5, { message: "El asunto debe tener al menos 5 caracteres" })
    .max(200, { message: "El asunto no puede exceder 200 caracteres" }),
  
  message: z.string()
    .min(10, { message: "El mensaje debe tener al menos 10 caracteres" })
    .max(1000, { message: "El mensaje no puede exceder 1000 caracteres" }),
  
  acceptPrivacy: z.boolean().refine((val) => val === true, {
    message: "Debe aceptar la política de privacidad"
  })
});

/**
 * Vehicle Comparison Schema
 */
export const VehicleComparisonSchema = z.object({
  vehicleIds: z.array(z.string().uuid())
    .min(2, { message: "Debe seleccionar al menos 2 vehículos para comparar" })
    .max(4, { message: "No puede comparar más de 4 vehículos a la vez" })
});

/**
 * Review/Rating Schema (for future implementation)
 */
export const ReviewSchema = z.object({
  dealershipId: z.string().uuid(),
  
  rating: z.number()
    .min(1, { message: "La calificación mínima es 1" })
    .max(5, { message: "La calificación máxima es 5" }),
  
  title: z.string()
    .min(5, { message: "El título debe tener al menos 5 caracteres" })
    .max(100, { message: "El título no puede exceder 100 caracteres" }),
  
  comment: z.string()
    .min(10, { message: "El comentario debe tener al menos 10 caracteres" })
    .max(500, { message: "El comentario no puede exceder 500 caracteres" }),
  
  customerName: z.string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "El nombre no puede exceder 100 caracteres" }),
  
  customerEmail: z.string()
    .email({ message: "Email inválido" }),
  
  purchaseDate: z.string().datetime().optional(),
  vehicleId: z.string().uuid().optional(),
  
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "Debe aceptar los términos y condiciones"
  })
});

/**
 * URL Search Params Schema
 * For parsing and validating URL parameters
 */
export const SearchParamsSchema = z.object({
  q: z.string().optional(), // search query
  marca: z.string().optional(), // brand
  modelo: z.string().optional(), // model
  provincia: z.string().optional(), // province
  ciudad: z.string().optional(), // city
  precio_min: z.string().transform((val) => val ? parseInt(val) : undefined).optional(),
  precio_max: z.string().transform((val) => val ? parseInt(val) : undefined).optional(),
  ano_min: z.string().transform((val) => val ? parseInt(val) : undefined).optional(),
  ano_max: z.string().transform((val) => val ? parseInt(val) : undefined).optional(),
  km_max: z.string().transform((val) => val ? parseInt(val) : undefined).optional(),
  combustible: z.string().optional(),
  transmision: z.string().optional(),
  oportunidades: z.string().transform((val) => val === 'true').optional(),
  destacados: z.string().transform((val) => val === 'true').optional(),
  pagina: z.string().transform((val) => val ? parseInt(val) : 1).optional(),
  orden: z.string().optional()
});

/**
 * Type exports for use in components
 */
export type VehicleFilters = z.infer<typeof VehicleFiltersSchema>;
export type ContactDealerForm = z.infer<typeof ContactDealerSchema>;
export type DealershipFilters = z.infer<typeof DealershipFiltersSchema>;
export type ContactDealershipForm = z.infer<typeof ContactDealershipSchema>;
export type DealershipInventoryFilters = z.infer<typeof DealershipInventoryFiltersSchema>;
export type VehicleSearch = z.infer<typeof VehicleSearchSchema>;
export type NewsletterSubscription = z.infer<typeof NewsletterSchema>;
export type ContactForm = z.infer<typeof ContactFormSchema>;
export type VehicleComparison = z.infer<typeof VehicleComparisonSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type SearchParams = z.infer<typeof SearchParamsSchema>;

/**
 * Helper function to validate and parse search params
 */
export function parseSearchParams(searchParams: Record<string, string | string[] | undefined>): SearchParams {
  // Convert array values to single strings
  const normalizedParams: Record<string, string | undefined> = {};
  
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      normalizedParams[key] = value[0];
    } else {
      normalizedParams[key] = value;
    }
  });
  
  return SearchParamsSchema.parse(normalizedParams);
}

/**
 * Helper function to convert SearchParams back to VehicleFilters
 */
export function searchParamsToFilters(searchParams: SearchParams): Partial<VehicleFilters> {
  return {
    searchQuery: searchParams.q,
    brandId: searchParams.marca,
    modelId: searchParams.modelo,
    provinceId: searchParams.provincia,
    cityId: searchParams.ciudad,
    priceMin: searchParams.precio_min,
    priceMax: searchParams.precio_max,
    yearMin: searchParams.ano_min,
    yearMax: searchParams.ano_max,
    mileageMax: searchParams.km_max,
    fuelType: searchParams.combustible,
    transmissionType: searchParams.transmision,
    onlyOpportunities: searchParams.oportunidades,
    onlyFeatured: searchParams.destacados,
    page: searchParams.pagina || 1,
    sortBy: (searchParams.orden as VehicleFilters['sortBy']) || 'relevance'
  };
}

/**
 * Helper function to convert VehicleFilters to URL-friendly search params
 */
export function filtersToSearchParams(filters: Partial<VehicleFilters>): Record<string, string> {
  const params: Record<string, string> = {};
  
  if (filters.searchQuery) params.q = filters.searchQuery;
  if (filters.brandId) params.marca = filters.brandId;
  if (filters.modelId) params.modelo = filters.modelId;
  if (filters.provinceId) params.provincia = filters.provinceId;
  if (filters.cityId) params.ciudad = filters.cityId;
  if (filters.priceMin) params.precio_min = filters.priceMin.toString();
  if (filters.priceMax) params.precio_max = filters.priceMax.toString();
  if (filters.yearMin) params.ano_min = filters.yearMin.toString();
  if (filters.yearMax) params.ano_max = filters.yearMax.toString();
  if (filters.mileageMax) params.km_max = filters.mileageMax.toString();
  if (filters.fuelType) params.combustible = filters.fuelType;
  if (filters.transmissionType) params.transmision = filters.transmissionType;
  if (filters.onlyOpportunities) params.oportunidades = 'true';
  if (filters.onlyFeatured) params.destacados = 'true';
  if (filters.page && filters.page > 1) params.pagina = filters.page.toString();
  if (filters.sortBy && filters.sortBy !== 'relevance') params.orden = filters.sortBy;
  
  return params;
}

/**
 * Default filter values
 */
export const DEFAULT_FILTERS: VehicleFilters = {
  page: 1,
  limit: 20,
  offset: 0,
  sortBy: 'relevance'
};

/**
 * Common validation patterns
 */
export const VALIDATION_PATTERNS = {
  phone: /^[0-9+\-\s()]+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  postalCode: /^[0-9]{4}$/,
  argentinePhone: /^(\+54|54)?[\s\-]?9?[\s\-]?(11|[2-8][0-9]{2})[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}$/
};

/**
 * Error messages in Spanish
 */
export const VALIDATION_MESSAGES = {
  required: 'Este campo es obligatorio',
  invalidEmail: 'Email inválido',
  invalidPhone: 'Teléfono inválido',
  minLength: (min: number) => `Mínimo ${min} caracteres`,
  maxLength: (max: number) => `Máximo ${max} caracteres`,
  invalidPrice: 'Precio inválido',
  invalidYear: 'Año inválido',
  invalidMileage: 'Kilometraje inválido',
  invalidRange: 'Rango inválido',
  acceptTerms: 'Debe aceptar los términos y condiciones',
  acceptPrivacy: 'Debe aceptar la política de privacidad'
};

const validationSchemas = {
  VehicleFiltersSchema,
  ContactDealerSchema,
  DealershipFiltersSchema,
  ContactDealershipSchema,
  DealershipInventoryFiltersSchema,
  VehicleSearchSchema,
  NewsletterSchema,
  ContactFormSchema,
  VehicleComparisonSchema,
  ReviewSchema,
  SearchParamsSchema,
  parseSearchParams,
  searchParamsToFilters,
  filtersToSearchParams,
  DEFAULT_FILTERS,
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES
};

export default validationSchemas;