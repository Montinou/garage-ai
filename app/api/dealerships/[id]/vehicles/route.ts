import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getDealershipVehicles, getDealershipByIdOrSlug } from '@/lib/dealership-queries';
import { DealershipInventoryFiltersSchema } from '@/lib/validation-schemas';
import { withSecurity, createSecureResponse, createErrorResponse } from '@/lib/api-security';
import { z } from 'zod';

/**
 * GET /api/dealerships/[id]/vehicles
 * Get vehicles/inventory for a specific dealership
 */
const handleGET = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    if (!id) {
      return createErrorResponse(
        'ID de concesionaria requerido',
        400,
        'MISSING_PARAMETER'
      );
    }

    // First verify that the dealership exists
    const dealership = await getDealershipByIdOrSlug(id);
    
    if (!dealership) {
      return createErrorResponse(
        'Concesionaria no encontrada',
        404,
        'DEALERSHIP_NOT_FOUND'
      );
    }
    
    // Parse and validate search parameters
    const rawFilters = {
      priceMin: searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined,
      priceMax: searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined,
      yearMin: searchParams.get('yearMin') ? Number(searchParams.get('yearMin')) : undefined,
      yearMax: searchParams.get('yearMax') ? Number(searchParams.get('yearMax')) : undefined,
      mileageMax: searchParams.get('mileageMax') ? Number(searchParams.get('mileageMax')) : undefined,
      brandId: searchParams.get('brandId') || undefined,
      condition: searchParams.get('condition') || undefined,
      fuelType: searchParams.get('fuelType') || undefined,
      transmissionType: searchParams.get('transmissionType') || undefined,
      searchQuery: searchParams.get('searchQuery') || undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Math.min(Number(searchParams.get('limit')) || 20, 50), // Max 50 results per page
      sortBy: (searchParams.get('sortBy') as any) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc'
    };

    // Remove undefined values
    Object.keys(rawFilters).forEach(key => {
      if (rawFilters[key as keyof typeof rawFilters] === undefined) {
        delete rawFilters[key as keyof typeof rawFilters];
      }
    });

    // Validate filters using Zod schema
    const validatedFilters = DealershipInventoryFiltersSchema.parse(rawFilters);
    
    // Get dealership vehicles with the parsed options
    const options = {
      page: validatedFilters.page,
      limit: validatedFilters.limit,
      sortBy: validatedFilters.sortBy,
      sortOrder: validatedFilters.sortOrder
    };
    
    const results = await getDealershipVehicles(dealership.id, options);
    
    // TODO: Apply additional filters (price, year, etc.) - for now we get all and let the query handle basic sorting
    // This could be enhanced to pass the filters to the query function
    
    // Return results with metadata
    return createSecureResponse({
      success: true,
      data: {
        dealership: {
          id: dealership.id,
          name: dealership.name,
          slug: dealership.slug
        },
        vehicles: results.vehicles,
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
        appliedFilters: validatedFilters
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Dealership inventory search failed', error instanceof Error ? error : new Error(String(error)), { dealershipId: (await params).id }, 'dealerships-api');
    
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
      'Error al buscar vehículos de la concesionaria',
      500,
      'SEARCH_ERROR'
    );
  }
};

// Apply security wrapper with rate limiting
export const GET = withSecurity(handleGET, {
  rateLimit: { requests: 150, windowMs: 60000 } // 150 requests per minute for inventory search
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