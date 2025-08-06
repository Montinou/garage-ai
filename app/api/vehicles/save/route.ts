/**
 * Vehicle Save API - Saves extracted vehicle data to Neon database
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/neon';
import { vehicles, brands, models } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { withSecurity, validateRequestBody, validators, createSecureResponse, createErrorResponse } from '@/lib/api-security';
import { z } from 'zod';

// Validation schema for vehicle save request
const SaveVehicleSchema = z.object({
  vehicleData: z.object({
    marca: z.string().min(1).max(50),
    modelo: z.string().min(1).max(100),
    año: z.number().int().min(1950).max(new Date().getFullYear() + 1),
    precio: z.number().positive().max(10000000),
    kilometraje: z.number().int().min(0).max(1000000),
    vin: z.string().max(17).optional(),
    condicion: z.string().max(20),
    caracteristicas: z.array(z.string().max(100)),
    vendedor: z.string().max(100),
    imagenes: z.array(z.string().url()),
    descripcion: z.string().max(5000),
    ubicacion: z.string().max(100),
    fechaPublicacion: z.string().optional(),
  }),
  dealershipId: z.string().uuid(),
  sourceUrl: z.string().url(),
  sourcePortal: z.string().max(100),
});

type SaveVehicleRequest = z.infer<typeof SaveVehicleSchema>;

const handlePOST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = SaveVehicleSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(
        'Datos de vehículo inválidos',
        400,
        'VALIDATION_ERROR',
        validation.error.errors
      );
    }
    
    const { vehicleData, dealershipId, sourceUrl, sourcePortal } = validation.data;


    // Find or create brand
    let brand = await db.select().from(brands).where(eq(brands.name, vehicleData.marca)).limit(1);
    if (brand.length === 0) {
      const [newBrand] = await db.insert(brands).values({ name: vehicleData.marca }).returning();
      brand = [newBrand];
    }

    // Find or create model
    let model = await db.select().from(models).where(eq(models.name, vehicleData.modelo)).limit(1);
    if (model.length === 0) {
      const [newModel] = await db.insert(models).values({ 
        name: vehicleData.modelo, 
        brandId: brand[0].id 
      }).returning();
      model = [newModel];
    }

    // Save vehicle
    const [savedVehicle] = await db.insert(vehicles).values({
      title: `${vehicleData.marca} ${vehicleData.modelo} ${vehicleData.año}`,
      description: vehicleData.descripcion,
      price: vehicleData.precio.toString(),
      currency: 'ARS',
      year: vehicleData.año,
      mileage: vehicleData.kilometraje,
      brandId: brand[0].id,
      modelId: model[0].id,
      dealershipId,
      color: null, // Color extraction from characteristics pending implementation
      condition: vehicleData.condicion,
      vin: vehicleData.vin,
      locationCity: vehicleData.ubicacion,
      locationCountry: 'Argentina',
      sellerName: vehicleData.vendedor,
      sellerType: 'dealership',
      sourceUrl,
      sourcePortal,
      status: 'available',
      // Image processing and vehicleImages table integration pending implementation
    }).returning();


    return createSecureResponse({
      success: true,
      vehicleId: savedVehicle.id,
      message: 'Vehicle saved successfully'
    });

  } catch (error) {
    return createErrorResponse(
      'Error al guardar vehículo',
      500,
      'VEHICLE_SAVE_ERROR'
    );
  }
}

// Apply security wrapper with rate limiting
export const POST = withSecurity(handlePOST, {
  rateLimit: { requests: 20, windowMs: 60000 } // 20 vehicle saves per minute
});