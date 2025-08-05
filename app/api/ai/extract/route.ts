/**
 * AI Extractor API Route - Updated to use Local Agent Service
 * Extracts vehicle data from web content using local Vertex AI agents
 * Uses local agents instead of external Cloud Run services
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractVehicleData } from '@/lib/ai-agents';

// Load environment variables for local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' });
}

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
        { success: false, error: 'Missing required fields: url and content' },
        { status: 400 }
      );
    }
    
    console.log(`🔍 Extracting data with local agent: ${url}`);
    
    // Use direct AI agent
    const startTime = Date.now();
    const vehicleData = await extractVehicleData(url, content);
    const processingTime = Date.now() - startTime;

    console.log(`✅ Extraction completed in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      vehicleData,
      processingTime,
      service: 'Direct Vertex AI Agent',
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
    service: 'AI Extractor (Local Vertex AI Agent)',
    status: 'healthy',
    type: 'local-agent',
    vertexProject: 'analog-medium-451706-m7',
    timestamp: new Date().toISOString()
  });
}