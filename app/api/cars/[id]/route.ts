/**
 * Single Vehicle API Route
 * Provides detailed information for a specific vehicle
 * Includes vehicle data, images, specs, and dealership info
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVehicleDetails } from '@/lib/car-queries';
import { withSecurity, createSecureResponse, createErrorResponse, validators } from '@/lib/api-security';
import { logger } from '@/lib/logger';

interface VehicleParams {
  params: Promise<{ id: string }>;
}

async function getVehicleHandler(
  request: NextRequest,
  { params }: VehicleParams
) {
  try {
    const { id } = await params;

    // Validate vehicle ID
    if (!validators.uuid(id) && !validators.alphanumeric(id)) {
      return createErrorResponse('Invalid vehicle ID format', 400, 'INVALID_ID');
    }

    logger.info('Fetching vehicle details', { vehicleId: id }, 'vehicle-api');

    // Get vehicle details
    const vehicle = await getVehicleDetails(id);

    if (!vehicle) {
      logger.warn('Vehicle not found', { vehicleId: id }, 'vehicle-api');
      return createErrorResponse('Vehículo no encontrado', 404, 'VEHICLE_NOT_FOUND');
    }

    logger.info('Vehicle details retrieved successfully', { 
      vehicleId: id, 
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year 
    }, 'vehicle-api');

    return createSecureResponse({
      success: true,
      vehicle,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching vehicle details', error as Error, { 
      vehicleId: (await params).id 
    }, 'vehicle-api');
    
    return createErrorResponse(
      'Error interno del servidor', 
      500, 
      'INTERNAL_ERROR'
    );
  }
}

// Apply security middleware and export
export const GET = withSecurity(getVehicleHandler);