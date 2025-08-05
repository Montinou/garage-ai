/**
 * AI Validator API Route - Vercel Serverless Function
 * Validates and scores the quality of extracted vehicle data using Cloud Run agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

interface VehicleData {
  marca: string;
  modelo: string;
  año: number;
  precio: number;
  kilometraje: number;
  vin?: string;
  caracteristicas: string[];
  condicion: string;
  vendedor: string;
  imagenes: string[];
  descripcion: string;
  ubicacion: string;
  fechaPublicacion: string;
}

interface ValidationRequest {
  vehicleData: VehicleData;
  context?: {
    sourceUrl?: string;
    extractionMethod?: string;
    extractionConfidence?: number;
  };
}

interface ValidationResult {
  esValido: boolean;
  completitud: number;
  precision: number;
  consistencia: number;
  problemas: string[];
  puntuacionCalidad: number;
  esDuplicado: boolean;
  recomendaciones?: string[];
  insightsMercado?: {
    rangoPrecios?: string;
    kilometrajeEsperado?: string;
    caracteristicasComunes?: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidationRequest = await request.json();
    const { vehicleData, context } = body;
    
    if (!vehicleData) {
      return NextResponse.json(
        { error: 'Missing required field: vehicleData' },
        { status: 400 }
      );
    }
    
    console.log(`🔍 Validating vehicle: ${vehicleData.marca} ${vehicleData.modelo}`);
    const startTime = Date.now();
    
    // Get the Cloud Run agent URL
    const validatorUrl = process.env.VEHICLE_VALIDATOR_URL;
    if (!validatorUrl) {
      return NextResponse.json(
        { error: 'VEHICLE_VALIDATOR_URL not configured' },
        { status: 500 }
      );
    }

    // Prepare the request for the Cloud Run agent
    const agentRequest = {
      vehicleData,
      context
    };

    console.log(`📡 Calling validator agent: ${validatorUrl}`);

    // Initialize Google Auth with service account
    let authHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'garage-ai-vercel/1.0'
    };

    // Add authentication if service account key is available
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      try {
        const auth = new GoogleAuth({
          credentials: JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()),
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        
        if (accessToken.token) {
          authHeaders['Authorization'] = `Bearer ${accessToken.token}`;
        }
      } catch (authError) {
        console.warn('⚠️ Auth failed, proceeding without authentication:', authError.message);
      }
    }

    // Call the Cloud Run agent
    const response = await fetch(validatorUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(agentRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Validator agent error: ${response.status} - ${errorText}`);
      throw new Error(`Cloud Run agent error: ${response.status}`);
    }

    const agentResponse = await response.json();
    
    // The Cloud Run agent should return the validation result
    let validation: ValidationResult;
    
    if (agentResponse.validation) {
      validation = agentResponse.validation;
    } else if (agentResponse.esValido !== undefined) {
      // If the agent returns the validation directly
      validation = agentResponse;
    } else {
      // Fallback validation with basic checks
      validation = {
        esValido: !!(vehicleData.marca && vehicleData.modelo && vehicleData.año && vehicleData.precio),
        completitud: Object.values(vehicleData).filter(v => v != null && v !== '').length / Object.keys(vehicleData).length,
        precision: 0.7, // Default estimate
        consistencia: 0.7,
        problemas: ['Error al procesar respuesta del agente de validación'],
        puntuacionCalidad: 70, // Default score
        esDuplicado: false,
        recomendaciones: ['Revisar manualmente los datos del vehículo']
      };
      
      // Add basic issue detection
      if (!vehicleData.marca) validation.problemas.push('Falta marca del vehículo');
      if (!vehicleData.modelo) validation.problemas.push('Falta modelo del vehículo');
      if (!vehicleData.año || vehicleData.año < 1900 || vehicleData.año > 2025) {
        validation.problemas.push('Año inválido o faltante');
      }
      if (!vehicleData.precio || vehicleData.precio <= 0) {
        validation.problemas.push('Precio inválido o faltante');
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Validation completed in ${processingTime}ms - Score: ${validation.puntuacionCalidad}`);
    
    return NextResponse.json({
      success: true,
      validation,
      processingTime,
      agentUrl: validatorUrl,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return NextResponse.json(
      {
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Quick validation endpoint (basic checks only)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vehicleDataParam = searchParams.get('vehicleData');
  
  if (!vehicleDataParam) {
    return NextResponse.json({
      service: 'AI Validator',
      status: 'healthy',
      agentUrl: process.env.VEHICLE_VALIDATOR_URL || 'Not configured',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const vehicleData: VehicleData = JSON.parse(vehicleDataParam);
    
    // Perform basic validation without AI
    const basicValidation: ValidationResult = {
      esValido: !!(vehicleData.marca && vehicleData.modelo && vehicleData.año && vehicleData.precio),
      completitud: Object.values(vehicleData).filter(v => v != null && v !== '').length / Object.keys(vehicleData).length,
      precision: 0.8, // Default estimate
      consistencia: 0.8,
      problemas: [],
      puntuacionCalidad: 75, // Default score
      esDuplicado: false
    };
    
    // Add basic issue detection
    if (!vehicleData.marca) basicValidation.problemas.push('Falta marca del vehículo');
    if (!vehicleData.modelo) basicValidation.problemas.push('Falta modelo del vehículo');
    if (!vehicleData.año || vehicleData.año < 1900 || vehicleData.año > 2025) {
      basicValidation.problemas.push('Año inválido o faltante');
    }
    if (!vehicleData.precio || vehicleData.precio <= 0) {
      basicValidation.problemas.push('Precio inválido o faltante');
    }
    
    return NextResponse.json({
      success: true,
      validation: basicValidation,
      note: 'Validación rápida - solo verificaciones básicas',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Parámetro vehicleData inválido' },
      { status: 400 }
    );
  }
}