/**
 * Vehicle Save API - Saves extracted vehicle data to Neon database
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/neon';
import { vehicles, brands, models } from '@/lib/schema';
import { eq } from 'drizzle-orm';

interface SaveVehicleRequest {
  vehicleData: {
    marca: string;
    modelo: string;
    año: number;
    precio: number;
    kilometraje: number;
    vin?: string;
    condicion: string;
    caracteristicas: string[];
    vendedor: string;
    imagenes: string[];
    descripcion: string;
    ubicacion: string;
    fechaPublicacion?: string;
  };
  dealershipId: string;
  sourceUrl: string;
  sourcePortal: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveVehicleRequest = await request.json();
    const { vehicleData, dealershipId, sourceUrl, sourcePortal } = body;

    console.log(`💾 Saving vehicle: ${vehicleData.marca} ${vehicleData.modelo} ${vehicleData.año}`);

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
      color: null, // TODO: Extract from caracteristicas
      condition: vehicleData.condicion,
      vin: vehicleData.vin,
      locationCity: vehicleData.ubicacion,
      locationCountry: 'Argentina',
      sellerName: vehicleData.vendedor,
      sellerType: 'dealership',
      sourceUrl,
      sourcePortal,
      status: 'available',
      // TODO: Process images and save to vehicleImages table
    }).returning();

    console.log(`✅ Vehicle saved with ID: ${savedVehicle.id}`);

    return NextResponse.json({
      success: true,
      vehicleId: savedVehicle.id,
      message: 'Vehicle saved successfully'
    });

  } catch (error) {
    console.error('❌ Error saving vehicle:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save vehicle'
    }, { status: 500 });
  }
}