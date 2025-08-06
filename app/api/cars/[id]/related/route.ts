/**
 * Related Vehicles API Route
 * Returns vehicles similar to the specified vehicle
 * Based on brand/model similarity and price range
 */

import { NextRequest } from 'next/server';
import { getRelatedVehicles } from '@/lib/car-queries';
import { withSecurity, createSecureResponse, createErrorResponse, validators } from '@/lib/api-security';
import { logger } from '@/lib/logger';

interface RelatedVehiclesParams {
  params: Promise<{ id: string }>;
}

async function getRelatedVehiclesHandler(
  request: NextRequest,
  { params }: RelatedVehiclesParams
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    // Validate vehicle ID
    if (!validators.nonEmptyString(id)) {
      return createErrorResponse('Invalid vehicle ID format', 400, 'INVALID_ID');
    }

    // Get limit parameter (default: 4, max: 12)
    const limitParam = searchParams.get('limit');
    let limit = 4;
    
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 12) {
        return createErrorResponse('Limit must be between 1 and 12', 400, 'INVALID_LIMIT');
      }
      limit = parsedLimit;
    }

    logger.info('Fetching related vehicles', { vehicleId: id, limit }, 'related-vehicles-api');

    // Get related vehicles
    const relatedVehicles = await getRelatedVehicles(id, limit);

    logger.info('Related vehicles retrieved successfully', { 
      vehicleId: id, 
      count: relatedVehicles.length 
    }, 'related-vehicles-api');

    return createSecureResponse({
      success: true,
      vehicles: relatedVehicles,
      count: relatedVehicles.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching related vehicles', error as Error, { 
      vehicleId: (await params).id 
    }, 'related-vehicles-api');
    
    return createErrorResponse(
      'Error interno del servidor', 
      500, 
      'INTERNAL_ERROR'
    );
  }
}

// Apply security middleware and export
export const GET = withSecurity(getRelatedVehiclesHandler);