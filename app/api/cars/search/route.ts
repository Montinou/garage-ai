import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { searchVehicles } from '@/lib/car-queries';
import { VehicleFiltersSchema } from '@/lib/validation-schemas';
import { withSecurity, createSecureResponse, createErrorResponse } from '@/lib/api-security';
import { z } from 'zod';

/**
 * GET /api/cars/search
 * Search vehicles with advanced filtering
 */
const handleGET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate search parameters
    const rawFilters = {
      // Search query
      searchQuery: searchParams.get('searchQuery') || undefined,
      
      // Price filters
      priceMin: searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined,
      priceMax: searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined,
      
      // Location filters
      provinceId: searchParams.get('provinceId') || undefined,
      cityId: searchParams.get('cityId') || undefined,
      
      // Brand and model filters
      brandId: searchParams.get('brandId') || undefined,
      modelId: searchParams.get('modelId') || undefined,
      
      // Year filters
      yearMin: searchParams.get('yearMin') ? Number(searchParams.get('yearMin')) : undefined,
      yearMax: searchParams.get('yearMax') ? Number(searchParams.get('yearMax')) : undefined,
      
      // Mileage filter
      mileageMax: searchParams.get('mileageMax') ? Number(searchParams.get('mileageMax')) : undefined,
      
      // Vehicle characteristics
      fuelType: searchParams.get('fuelType') || undefined,
      transmissionType: searchParams.get('transmissionType') || undefined,
      condition: searchParams.get('condition') || undefined,
      color: searchParams.get('color') || undefined,
      
      // Special filters
      onlyOpportunities: searchParams.get('onlyOpportunities') === 'true',
      onlyFeatured: searchParams.get('onlyFeatured') === 'true',
      withPhotos: searchParams.get('withPhotos') === 'true',
      withFinancing: searchParams.get('withFinancing') === 'true',
      withWarranty: searchParams.get('withWarranty') === 'true',
      
      // Dealership filters
      dealershipId: searchParams.get('dealershipId') || undefined,
      dealershipType: searchParams.get('dealershipType') || undefined,
      officialBrand: searchParams.get('officialBrand') || undefined,
      
      // Pagination
      page: Number(searchParams.get('page')) || 1,
      limit: Math.min(Number(searchParams.get('limit')) || 20, 100), // Max 100 results per page
      offset: Number(searchParams.get('offset')) || 0,
      
      // Sorting
      sortBy: (searchParams.get('sortBy') as string) || 'relevance'
    };

    // Remove undefined values
    Object.keys(rawFilters).forEach(key => {
      if (rawFilters[key as keyof typeof rawFilters] === undefined) {
        delete rawFilters[key as keyof typeof rawFilters];
      }
    });

    // Validate filters using Zod schema
    const validatedFilters = VehicleFiltersSchema.parse(rawFilters);
    
    // Execute search
    const results = await searchVehicles(validatedFilters);
    
    // Return results with metadata
    return createSecureResponse({
      success: true,
      data: results,
      vehicles: results.vehicles,
      total: results.total,
      hasMore: results.hasMore,
      pagination: {
        page: validatedFilters.page,
        limit: validatedFilters.limit,
        offset: validatedFilters.offset,
        total: results.total,
        totalPages: Math.ceil(results.total / validatedFilters.limit),
        hasNext: results.hasMore,
        hasPrev: validatedFilters.page > 1
      },
      appliedFilters: validatedFilters,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Vehicle search failed', error instanceof Error ? error : new Error(String(error)), undefined, 'cars-api');
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        'Parámetros de búsqueda inválidos',
        400,
        'VALIDATION_ERROR',
        error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      );
    }
    
    // Handle database/search errors
    return createErrorResponse(
      'Error al buscar vehículos',
      500,
      'SEARCH_ERROR'
    );
  }
}

// Apply security wrapper with rate limiting
export const GET = withSecurity(handleGET, {
  rateLimit: { requests: 100, windowMs: 60000 } // 100 requests per minute for search
});

/**
 * Handle unsupported HTTP methods
 */
export async function POST() {
  return createErrorResponse('Método no permitido', 405, 'METHOD_NOT_ALLOWED');
}

export async function PUT() {
  return createErrorResponse('Método no permitido', 405, 'METHOD_NOT_ALLOWED');
}

export async function DELETE() {
  return createErrorResponse('Método no permitido', 405, 'METHOD_NOT_ALLOWED');
}