/**
 * Updated Agent Orchestration using new Vercel AI SDK endpoints
 * Example implementation showing how to migrate from legacy endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAgentJob, updateJobStatus } from '@/lib/queries';

interface OrchestrationRequest {
  target: string;
  extractionType: 'vehicle_listings' | 'single_vehicle' | 'batch_vehicles';
  maxPages?: number;
  options?: {
    includeImages?: boolean;
    validateData?: boolean;
    userAgent?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: OrchestrationRequest = await request.json();
    const { target, extractionType, maxPages = 10, options = {} } = body;

    if (!target) {
      return NextResponse.json(
        { error: 'Target URL is required' },
        { status: 400 }
      );
    }

    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Step 1: Create and execute Analyzer Job using new complete endpoint
    const analyzerJob = await createAgentJob({
      agentId: `analyzer_${workflowId}`,
      agentType: 'analyzer',
      jobType: 'page_analysis',
      status: 'pending',
      priority: 'normal',
      payload: {
        url: target,
        extractionType,
        maxPages,
        options,
        workflowId
      }
    });

    const analyzerResult = await executeAnalyzerJobWithNewAPI(analyzerJob.id, {
      url: target,
      extractionType,
      maxPages,
      options
    });

    if (!analyzerResult.success) {
      await updateJobStatus(analyzerJob.id, 'failed', { error: analyzerResult.error });
      return NextResponse.json({
        success: false,
        error: 'Analysis failed',
        details: analyzerResult.error,
        workflowId
      }, { status: 500 });
    }

    // Step 2: Create and execute Extractor Job using new object endpoint
    const extractorJob = await createAgentJob({
      agentId: `extractor_${workflowId}`,
      agentType: 'extractor',
      jobType: 'data_extraction',
      status: 'pending',
      priority: 'normal',
      payload: {
        analysisResult: analyzerResult.analysis,
        url: target,
        extractionStrategy: analyzerResult.analysis.pageStructure,
        workflowId
      }
    });

    const extractorResult = await executeExtractorJobWithNewAPI(extractorJob.id, {
      url: target,
      analysisResult: analyzerResult.analysis,
      options
    });

    if (!extractorResult.success) {
      await updateJobStatus(extractorJob.id, 'failed', { error: extractorResult.error });
      return NextResponse.json({
        success: false,
        error: 'Extraction failed',
        details: extractorResult.error,
        workflowId,
        analysisResult: analyzerResult.analysis
      }, { status: 500 });
    }

    // Step 3: Optional validation using chat endpoint for interactive validation
    let validatorResult = null;
    if (options.validateData !== false) {
      const validatorJob = await createAgentJob({
        agentId: `validator_${workflowId}`,
        agentType: 'validator',
        jobType: 'data_validation',
        status: 'pending',
        priority: 'normal',
        payload: {
          vehicleData: extractorResult.vehicleData,
          context: {
            sourceUrl: target,
            extractionMethod: analyzerResult.analysis.pageStructure.extractionMethod,
            extractionConfidence: analyzerResult.analysis.confidence
          },
          workflowId
        }
      });

      validatorResult = await executeValidatorJobWithNewAPI(validatorJob.id, {
        vehicleData: extractorResult.vehicleData,
        context: {
          sourceUrl: target,
          extractionMethod: analyzerResult.analysis.pageStructure.extractionMethod,
          extractionConfidence: analyzerResult.analysis.confidence
        }
      });

      if (!validatorResult.success) {
        await updateJobStatus(validatorJob.id, 'failed', { error: validatorResult.error });
      }
    }

    // Compile final results
    const finalResult = {
      success: true,
      workflowId,
      target,
      extractionType,
      results: {
        analysis: analyzerResult.analysis,
        extraction: extractorResult.vehicleData,
        validation: validatorResult?.validation || null
      },
      metrics: {
        totalProcessingTime: Date.now() - parseInt(workflowId.split('_')[1]),
        analysisTime: analyzerResult.processingTime,
        extractionTime: extractorResult.processingTime,
        validationTime: validatorResult?.processingTime || 0,
        qualityScore: validatorResult?.validation?.qualityScore || 0
      },
      jobs: {
        analyzer: analyzerJob.id,
        extractor: extractorJob.id,
        validator: validatorResult ? `validator_${workflowId}` : null
      },
      timestamp: new Date().toISOString(),
      apiVersion: 'v2-vercel-ai-sdk'
    };

    return NextResponse.json(finalResult);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Orchestration failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Updated analyzer function using new complete endpoint
async function executeAnalyzerJobWithNewAPI(jobId: string, payload: Record<string, unknown>) {
  try {
    await updateJobStatus(jobId, 'running', null);
    
    // Use new complete endpoint with proper system message
    const analyzeResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/agents/analyzer/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Analiza esta página web para extracción de datos de vehículos:
        
URL: ${payload.url}
Tipo de extracción: ${payload.extractionType}
Páginas máximas: ${payload.maxPages}

Por favor, analiza la estructura de la página y proporciona un análisis estructurado en formato JSON.`,
        system: `Eres un analizador experto de contenido web, especializado en sitios de listados de vehículos.

FORMATO DE SALIDA DEL ANÁLISIS:
Siempre responde con un JSON válido en esta estructura exacta:
{
  "pageStructure": {
    "dataFields": {
      "make": "descripcion_ubicacion",
      "model": "descripcion_ubicacion", 
      "year": "descripcion_ubicacion",
      "price": "descripcion_ubicacion",
      "mileage": "descripcion_ubicacion",
      "features": "descripcion_ubicacion",
      "images": "descripcion_ubicacion",
      "description": "descripcion_ubicacion"
    },
    "selectors": {
      "make": "selector_css_o_xpath",
      "model": "selector_css_o_xpath",
      "year": "selector_css_o_xpath", 
      "price": "selector_css_o_xpath",
      "mileage": "selector_css_o_xpath",
      "features": "selector_css_o_xpath",
      "images": "selector_css_o_xpath",
      "description": "selector_css_o_xpath"
    },
    "extractionMethod": "dom"
  },
  "challenges": ["desafio1", "desafio2"],
  "confidence": 0.85,
  "estimatedTime": 30,
  "recommendations": ["recomendacion1", "recomendacion2"]
}`,
        temperature: 0.3,
        maxOutputTokens: 2048
      })
    });

    const result = await analyzeResponse.json();
    
    if (result.text) {
      // Parse JSON from the text response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        await updateJobStatus(jobId, 'completed', { analysis });
        return { 
          success: true, 
          analysis, 
          processingTime: result.processingTime,
          model: result.model 
        };
      } else {
        throw new Error('No valid JSON found in analyzer response');
      }
    } else {
      throw new Error(result.error || 'Analysis failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateJobStatus(jobId, 'failed', { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

// Updated extractor function using new object endpoint
async function executeExtractorJobWithNewAPI(jobId: string, payload: Record<string, unknown>) {
  try {
    await updateJobStatus(jobId, 'running', null);
    
    // Use new object endpoint with vehicle schema
    const extractResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/agents/extractor/object`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Extrae los datos del vehículo del siguiente contenido web:

URL: ${payload.url}
Contexto del análisis: ${JSON.stringify(payload.analysisResult)}

Por favor, extrae y estructura los datos del vehículo en formato JSON.`,
        schema: 'vehicle',
        temperature: 0.1,
        maxOutputTokens: 1024
      })
    });

    const result = await extractResponse.json();
    
    if (result.object) {
      await updateJobStatus(jobId, 'completed', { vehicleData: result.object });
      return { 
        success: true, 
        vehicleData: result.object, 
        processingTime: result.processingTime,
        model: result.model,
        warnings: result.warnings 
      };
    } else {
      throw new Error(result.error || 'Extraction failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateJobStatus(jobId, 'failed', { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

// Updated validator function using new complete endpoint
async function executeValidatorJobWithNewAPI(jobId: string, payload: Record<string, unknown>) {
  try {
    await updateJobStatus(jobId, 'running', null);
    
    // Use new complete endpoint for validation
    const validateResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/agents/validator/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Valida los siguientes datos de vehículo extraídos:

Datos del vehículo: ${JSON.stringify(payload.vehicleData)}
Contexto: ${JSON.stringify(payload.context)}

Proporciona una validación detallada con puntuación de calidad.`,
        system: `Eres un validador experto de datos de vehículos. Tu trabajo es revisar la calidad y precisión de los datos extraídos.

FORMATO DE SALIDA:
Responde con un JSON válido:
{
  "isValid": true/false,
  "qualityScore": 0.0-1.0,
  "errors": ["error1", "error2"],
  "warnings": ["warning1", "warning2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "completeness": 0.0-1.0,
  "confidence": 0.0-1.0
}`,
        temperature: 0.2,
        maxOutputTokens: 1024
      })
    });

    const result = await validateResponse.json();
    
    if (result.text) {
      // Parse JSON from the text response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const validation = JSON.parse(jsonMatch[0]);
        await updateJobStatus(jobId, 'completed', { validation });
        return { 
          success: true, 
          validation, 
          processingTime: result.processingTime,
          model: result.model 
        };
      } else {
        throw new Error('No valid JSON found in validator response');
      }
    } else {
      throw new Error(result.error || 'Validation failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateJobStatus(jobId, 'failed', { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get('workflowId');

  if (workflowId) {
    // Return status of a specific workflow
    try {
      // This would need to be implemented to work with the new API structure
      return NextResponse.json({
        workflowId,
        message: 'Workflow status tracking not yet implemented for new API',
        timestamp: new Date().toISOString()
      });
    } catch {
      return NextResponse.json({
        error: 'Failed to get workflow status'
      }, { status: 500 });
    }
  }

  return NextResponse.json({
    service: 'Agent Orchestrator (New Vercel AI SDK)',
    version: 'v2',
    availableAgents: ['analyzer', 'extractor', 'validator'],
    endpoints: {
      analyzer: '/api/agents/analyzer/complete',
      extractor: '/api/agents/extractor/object', 
      validator: '/api/agents/validator/complete'
    },
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}