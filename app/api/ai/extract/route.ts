/**
 * AI Extractor API Route - Updated to use Local Agent Service
 * Extracts vehicle data from web content using local Vertex AI agents
 * Uses local agents instead of external Cloud Run services
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractVehicleData } from '@/lib/ai-agents';
import { logger } from '@/lib/logger';
import { withSecurity, validateRequestBody, validators, sanitizeHtml, createSecureResponse, createErrorResponse } from '@/lib/api-security';

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

async function extractHandler(request: NextRequest) {
  const body = await request.json();
  
  // Validate input
  const validation = validateRequestBody<ExtractionRequest>(body, {
    url: validators.url,
    content: validators.nonEmptyString,
    extractionStrategy: (value) => value === undefined || (typeof value === 'object' && value !== null)
  });
  
  if (!validation.valid) {
    return createErrorResponse('Validation failed: ' + validation.errors.join(', '), 400, 'VALIDATION_ERROR');
  }
  
  const { url, content, extractionStrategy } = validation.data;
  
  // Sanitize content
  const sanitizedContent = sanitizeHtml(content);
    
    logger.info('Starting vehicle data extraction', { url, contentLength: content.length }, 'ai-extractor');
    
    // Use direct AI agent
    const startTime = Date.now();
    const vehicleData = await extractVehicleData(url, sanitizedContent);
    const processingTime = Date.now() - startTime;

    logger.info('Extraction completed successfully', { processingTime, url }, 'ai-extractor');

    return createSecureResponse({
      success: true,
      vehicleData,
      processingTime,
      service: 'Direct Vertex AI Agent',
      timestamp: new Date().toISOString()
    });
    
}

export const POST = withSecurity(extractHandler, {
  rateLimit: { requests: 8, windowMs: 60000 } // 8 requests per minute for extraction
});

export async function GET() {
  return createSecureResponse({
    service: 'AI Extractor (Local Vertex AI Agent)',
    status: 'healthy',
    type: 'local-agent',
    timestamp: new Date().toISOString()
  });
}