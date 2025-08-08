/**
 * Agent Object API Route - Structured output generation
 * Uses Vercel AI SDK with Gemini 2.5 Flash for structured data extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { getModel, defaultGenConfig } from '@/lib/ai/google';

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
  try {
    const { agentId } = params;
    const body: ObjectRequest = await request.json();
    const { prompt, schema = 'default', customSchema, temperature, maxOutputTokens } = body;

    // Validate required fields
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'prompt requerido' },
        { status: 400 }
      );
    }

    // Select the appropriate schema
    let selectedSchema = DefaultSchema;
    
    switch (schema) {
      case 'vehicle':
        selectedSchema = VehicleSchema;
        break;
      case 'custom':
        if (customSchema) {
          try {
            selectedSchema = z.object(customSchema);
          } catch (error) {
            return NextResponse.json(
              { error: 'Invalid custom schema provided' },
              { status: 400 }
            );
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

    return NextResponse.json({
      object,
      warnings,
      usage,
      schema: schema,
      model: process.env.MODEL_NAME ?? 'gemini-2.5-flash',
      agentId,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Object generation error:', error);
    return NextResponse.json(
      { 
        error: 'LLM_OBJECT_ERROR', 
        detail: error?.message || 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params;
  return NextResponse.json({
    service: 'Agent Object (Vercel AI SDK)',
    agentId,
    model: process.env.MODEL_NAME ?? 'gemini-2.5-flash',
    structuredOutput: true,
    availableSchemas: ['default', 'vehicle', 'custom'],
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}