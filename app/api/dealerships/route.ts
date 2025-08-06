import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { 
  getDealerships, 
  getDealershipDirectoryStats,
  getProvincesWithDealershipCounts,
  getDealershipBrands
} from '@/lib/dealership-queries';
import { DealershipFiltersSchema } from '@/lib/validation-schemas';
import { withSecurity, createSecureResponse, createErrorResponse } from '@/lib/api-security';
import { z } from 'zod';

/**
 * GET /api/dealerships
 * Get dealerships with advanced filtering for the public directory
 */
const handleGET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate search parameters
    const rawFilters = {
      searchQuery: searchParams.get('searchQuery') || undefined,
      provinceId: searchParams.get('provinceId') || undefined,
      cityId: searchParams.get('cityId') || undefined,
      dealershipType: searchParams.get('dealershipType') || undefined,
      officialBrand: searchParams.get('officialBrand') || undefined,
      isVerified: searchParams.get('isVerified') ? searchParams.get('isVerified') === 'true' : undefined,
      hasVehicles: searchParams.get('hasVehicles') ? searchParams.get('hasVehicles') === 'true' : undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Math.min(Number(searchParams.get('limit')) || 20, 50), // Max 50 results per page
      sortBy: (searchParams.get('sortBy') as string) || 'name',
      sortOrder: (searchParams.get('sortOrder') as string) || 'asc'
    };

    // Remove undefined values
    Object.keys(rawFilters).forEach(key => {
      if (rawFilters[key as keyof typeof rawFilters] === undefined) {
        delete rawFilters[key as keyof typeof rawFilters];
      }
    });

    // Validate filters using Zod schema
    const validatedFilters = DealershipFiltersSchema.parse(rawFilters);
    
    // Execute search
    const results = await getDealerships(validatedFilters);
    
    // Get additional metadata if requesting first page
    let stats = null;
    let provinces = null;
    let brands = null;
    
    if (validatedFilters.page === 1) {
      // Only fetch metadata on first page to improve performance
      const [statsResult, provincesResult, brandsResult] = await Promise.all([
        getDealershipDirectoryStats(),
        getProvincesWithDealershipCounts(),
        getDealershipBrands()
      ]);
      
      stats = statsResult;
      provinces = provincesResult;
      brands = brandsResult;
    }
    
    // Return results with metadata
    return createSecureResponse({
      success: true,
      data: {
        dealerships: results.dealerships,
        total: results.total,
        hasMore: results.hasMore,
        pagination: {
          page: validatedFilters.page,
          limit: validatedFilters.limit,
          total: results.total,
          totalPages: Math.ceil(results.total / validatedFilters.limit),
          hasNext: results.hasMore,
          hasPrev: validatedFilters.page > 1
        },
        appliedFilters: validatedFilters,
        ...(stats && { stats }),
        ...(provinces && { provinces }),
        ...(brands && { brands })
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Dealership directory search failed', error instanceof Error ? error : new Error(String(error)), undefined, 'dealerships-api');
    
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
      'Error al buscar concesionarias',
      500,
      'SEARCH_ERROR'
    );
  }
};

// Apply security wrapper with rate limiting
export const GET = withSecurity(handleGET, {
  rateLimit: { requests: 100, windowMs: 60000 } // 100 requests per minute for directory search
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