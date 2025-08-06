import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getDealershipByIdOrSlug } from '@/lib/dealership-queries';
import { withSecurity, createSecureResponse, createErrorResponse } from '@/lib/api-security';

/**
 * GET /api/dealerships/[id]
 * Get single dealership by ID or slug
 */
const handleGET = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    
    if (!id) {
      return createErrorResponse(
        'ID de concesionaria requerido',
        400,
        'MISSING_PARAMETER'
      );
    }

    // Get dealership by ID or slug
    const dealership = await getDealershipByIdOrSlug(id);
    
    if (!dealership) {
      return createErrorResponse(
        'Concesionaria no encontrada',
        404,
        'DEALERSHIP_NOT_FOUND'
      );
    }
    
    // Return dealership data
    return createSecureResponse({
      success: true,
      data: dealership,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const { id } = await params;
    logger.error('Failed to fetch dealership', error instanceof Error ? error : new Error(String(error)), { dealershipId: id }, 'dealerships-api');
    
    return createErrorResponse(
      'Error al obtener datos de la concesionaria',
      500,
      'FETCH_ERROR'
    );
  }
};

// Apply security wrapper with rate limiting
export const GET = withSecurity(handleGET, {
  rateLimit: { requests: 200, windowMs: 60000 } // 200 requests per minute for individual dealership
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