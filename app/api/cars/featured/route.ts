import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { getFeaturedVehicles } from '@/lib/car-queries';
import { withSecurity, createSecureResponse, createErrorResponse } from '@/lib/api-security';
import { z } from 'zod';

// Schema for query parameters
const FeaturedQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(6),
  type: z.enum(['featured', 'opportunities', 'all']).default('all')
});

/**
 * GET /api/cars/featured
 * Get featured and opportunity vehicles
 */
const handleGET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const query = FeaturedQuerySchema.parse({
      limit: searchParams.get('limit'),
      type: searchParams.get('type')
    });
    
    // Get featured vehicles
    const vehicles = await getFeaturedVehicles(query.limit);
    
    // Filter by type if specified
    let filteredVehicles = vehicles;
    
    switch (query.type) {
      case 'featured':
        // Only explicitly featured vehicles (would need featured flag in schema)
        filteredVehicles = vehicles.filter(v => 
          // Since we don't have a featured flag in the current schema,
          // we'll use opportunity status as proxy for now
          v.isOpportunity
        );
        break;
      case 'opportunities':
        filteredVehicles = vehicles.filter(v => v.isOpportunity);
        break;
      case 'all':
      default:
        // Return all featured/opportunity vehicles
        break;
    }
    
    // Ensure we don't exceed the limit after filtering
    filteredVehicles = filteredVehicles.slice(0, query.limit);
    
    return createSecureResponse({
      success: true,
      data: {
        vehicles: filteredVehicles,
        count: filteredVehicles.length,
        total: vehicles.length,
        type: query.type,
        limit: query.limit
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch featured vehicles', error instanceof Error ? error : new Error(String(error)), undefined, 'cars-api');
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        'Parámetros inválidos',
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
      'Error al obtener vehículos destacados',
      500,
      'FEATURED_FETCH_ERROR'
    );
  }
}

// Apply security wrapper with rate limiting
export const GET = withSecurity(handleGET, {
  rateLimit: { requests: 50, windowMs: 60000 } // 50 requests per minute for featured cars
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