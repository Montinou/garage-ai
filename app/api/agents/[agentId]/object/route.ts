/**
 * Agent Object API Route - Structured output generation
 * Uses Vercel AI SDK with Gemini 2.5 Flash for structured data extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { getModel, defaultGenConfig } from '@/lib/ai/google';
import { 
  logger, 
  handleCORS, 
  createSecureResponse, 
  createErrorResponse, 
  validatePrompt,
  checkRateLimit,
  getClientId 
} from '@/lib/api-middleware';

// Default schema for general intent extraction
const DefaultSchema = z.object({
  intent: z.string().describe('The main intent or purpose of the input'),
  entities: z.array(z.object({ 
    name: z.string().describe('Entity name'), 
    value: z.string().describe('Entity value') 
  })).default([]).describe('Named entities found in the input'),
  confidence: z.number().min(0).max(1).describe('Confidence score for the analysis'),
  category: z.string().optional().describe('Category classification if applicable'),
});

// Vehicle data schema for automotive use cases
const VehicleSchema = z.object({
  marca: z.string().describe('Vehicle make/brand'),
  modelo: z.string().describe('Vehicle model'),
  año: z.number().min(1900).max(2030).describe('Vehicle year'),
  precio: z.number().min(0).describe('Price in local currency'),
  kilometraje: z.number().min(0).optional().describe('Mileage in kilometers'),
  condicion: z.enum(['Nuevo', 'Usado', 'Seminuevo']).describe('Vehicle condition'),
  caracteristicas: z.array(z.string()).default([]).describe('Vehicle features'),
  ubicacion: z.string().optional().describe('Location where vehicle is sold'),
});

interface ObjectRequest {
  prompt: string;
  schema?: 'default' | 'vehicle' | 'custom';
  customSchema?: any;
  temperature?: number;
  maxOutputTokens?: number;
}

export async function POST(request: NextRequest, { params }: { params: { agentId: string } }) {
  const startTime = Date.now();
  const { agentId } = params;
  const clientId = getClientId(request);
  
  try {
    // Rate limiting
    if (!checkRateLimit(clientId, 8, 60000)) { // 8 requests per minute for object generation
      logger.warn('Rate limit exceeded for object generation', { clientId, agentId }, 'agent-object');
      return createErrorResponse('Rate limit exceeded. Try again later.', 429, 'RATE_LIMIT_EXCEEDED');
    }
    
    const body: ObjectRequest = await request.json();
    const { prompt, schema = 'default', customSchema, temperature, maxOutputTokens } = body;

    // Validate required fields
    const promptError = validatePrompt(prompt);
    if (promptError) {
      return createErrorResponse(promptError, 400, 'VALIDATION_ERROR');
    }

    logger.info('Starting object generation request', { 
      agentId, 
      promptLength: prompt.length,
      schema,
      hasCustomSchema: !!customSchema,
      clientId 
    }, 'agent-object');

    // Select the appropriate schema
    let selectedSchema: z.ZodSchema<any> = DefaultSchema;
    
    switch (schema) {
      case 'vehicle':
        selectedSchema = VehicleSchema;
        break;
      case 'custom':
        if (customSchema) {
          try {
            selectedSchema = z.object(customSchema);
          } catch (error) {
            logger.error('Invalid custom schema', error as Error, { agentId, clientId }, 'agent-object');
            return createErrorResponse('Invalid custom schema provided', 400, 'INVALID_SCHEMA');
          }
        }
        break;
      default:
        selectedSchema = DefaultSchema;
    }

    // Generate structured object using Vercel AI SDK
    const { object, warnings, usage } = await generateObject({
      model: getModel(),
      schema: selectedSchema,
      prompt,
      temperature: temperature ?? defaultGenConfig.temperature,
      maxOutputTokens: maxOutputTokens ?? defaultGenConfig.maxOutputTokens,
    });

    const processingTime = Date.now() - startTime;
    
    logger.info('Object generation completed', { 
      agentId, 
      processingTime,
      schema,
      warningsCount: warnings?.length || 0
    }, 'agent-object');

    return createSecureResponse({
      object,
      warnings,
      usage,
      schema: schema,
      model: process.env.MODEL_NAME ?? 'gemini-2.5-flash',
      agentId,
      processingTime,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    logger.error('Object generation failed', error, { agentId, clientId, processingTime }, 'agent-object');
    return createErrorResponse('LLM_OBJECT_ERROR: ' + (error?.message || 'Unknown error occurred'), 500, 'LLM_OBJECT_ERROR');
  }
}

export async function OPTIONS() {
  return handleCORS();
}

export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params;
  return createSecureResponse({
    service: 'Agent Object (Vercel AI SDK)',
    agentId,
    model: process.env.MODEL_NAME ?? 'gemini-2.5-flash',
    structuredOutput: true,
    availableSchemas: ['default', 'vehicle', 'custom'],
    schemas: {
      default: 'General intent and entity extraction',
      vehicle: 'Vehicle information extraction',
      custom: 'User-defined Zod schema'
    },
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}