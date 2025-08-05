/**
 * AI Extractor API Route - Vercel Serverless Function
 * Extracts vehicle data from web content using Google Cloud Run agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

interface ExtractionRequest {
  url: string;
  content: string;
  extractionStrategy?: {
    selectors?: { [key: string]: string };
    method: 'dom' | 'api' | 'text';
  };
}

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

export async function POST(request: NextRequest) {
  try {
    const body: ExtractionRequest = await request.json();
    const { url, content, extractionStrategy } = body;
    
    if (!url || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: url and content' },
        { status: 400 }
      );
    }
    
    console.log(`🔍 Extracting data from: ${url}`);
    const startTime = Date.now();
    
    // Get the Cloud Run agent URL
    const extractorUrl = process.env.VEHICLE_EXTRACTOR_URL;
    if (!extractorUrl) {
      return NextResponse.json(
        { error: 'VEHICLE_EXTRACTOR_URL not configured' },
        { status: 500 }
      );
    }

    // Prepare the request for the Cloud Run agent
    const agentRequest = {
      url,
      content: content.substring(0, 12000), // Limit to stay within token limits
      extractionStrategy
    };

    console.log(`📡 Calling extractor agent: ${extractorUrl}`);

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
    const response = await fetch(extractorUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(agentRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Extractor agent error: ${response.status} - ${errorText}`);
      throw new Error(`Cloud Run agent error: ${response.status}`);
    }

    const agentResponse = await response.json();
    
    // The Cloud Run agent should return the vehicle data
    let vehicleData: VehicleData;
    
    if (agentResponse.vehicleData) {
      vehicleData = agentResponse.vehicleData;
    } else if (agentResponse.marca) {
      // If the agent returns the data directly
      vehicleData = agentResponse;
    } else {
      // Fallback structure
      vehicleData = {
        marca: "Desconocido",
        modelo: "Desconocido", 
        año: 0,
        precio: 0,
        kilometraje: 0,
        vin: null,
        caracteristicas: [],
        condicion: "Desconocido",
        vendedor: "Desconocido",
        imagenes: [],
        descripcion: "Error al procesar respuesta del agente",
        ubicacion: "Desconocido",
        fechaPublicacion: new Date().toISOString().split('T')[0]
      };
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Extraction completed in ${processingTime}ms for ${url}`);
    
    return NextResponse.json({
      success: true,
      vehicleData,
      processingTime,
      agentUrl: extractorUrl,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    return NextResponse.json(
      {
        error: 'Extraction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'AI Extractor',
    status: 'healthy',
    agentUrl: process.env.VEHICLE_EXTRACTOR_URL || 'Not configured',
    timestamp: new Date().toISOString()
  });
}