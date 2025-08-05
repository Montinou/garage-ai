/**
 * AI Analyzer API Route - Vercel Serverless Function
 * Analyzes web pages to understand structure and plan data extraction
 * Uses Google Cloud Run agents with direct HTTP calls
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

// Load environment variables for local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' });
}

interface AnalysisRequest {
  url: string;
  htmlContent: string;
  userAgent?: string;
  additionalContext?: string;
}

interface AnalysisResult {
  pageStructure: {
    dataFields: { [key: string]: string };
    selectors: { [key: string]: string };
    extractionMethod: 'dom' | 'api' | 'ocr';
  };
  challenges: string[];
  confidence: number;
  estimatedTime: number;
  recommendations?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const { url, htmlContent, userAgent, additionalContext } = body;
    
    if (!url || !htmlContent) {
      return NextResponse.json(
        { error: 'Missing required fields: url and htmlContent' },
        { status: 400 }
      );
    }
    
    console.log(`🔍 Analyzing page: ${url}`);
    const startTime = Date.now();
    
    // Get the Cloud Run agent URL
    const analyzerUrl = process.env.VEHICLE_ANALYZER_URL;
    if (!analyzerUrl) {
      return NextResponse.json(
        { error: 'VEHICLE_ANALYZER_URL not configured' },
        { status: 500 }
      );
    }

    // Prepare the request for the genai-app Cloud Run service
    // These services expect conversation-style inputs
    const agentQuery = `Analiza esta página web para extracción de datos de vehículos:

URL: ${url}
Contenido HTML: ${htmlContent.substring(0, 8000)}
User Agent: ${userAgent || 'desconocido'}
Contexto adicional: ${additionalContext || 'ninguno'}

Por favor, analiza la estructura de la página y proporciona un análisis estructurado con selectores CSS, campos de datos detectados, método de extracción recomendado, desafíos identificados, nivel de confianza y tiempo estimado de procesamiento.`;

    const agentRequest = {
      query: agentQuery,
      context: {
        url,
        userAgent,
        additionalContext
      }
    };

    console.log(`📡 Calling genai-app analyzer: ${analyzerUrl}`);

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

    // Call the genai-app Cloud Run service
    const response = await fetch(analyzerUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(agentRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ genai-app error: ${response.status} - ${errorText}`);
      throw new Error(`genai-app error: ${response.status}`);
    }

    const agentResponse = await response.json();
    console.log('🔍 genai-app raw response:', JSON.stringify(agentResponse, null, 2));
    
    // Parse the genai-app response
    let analysis: AnalysisResult;
    
    // The response structure from genai-app Cloud Run service
    const agentOutput = agentResponse.response || agentResponse.output || agentResponse.answer || agentResponse;
    
    try {
      // Try to parse structured output from the agent
      if (typeof agentOutput === 'string') {
        // If the agent returns JSON as a string, parse it
        try {
          const parsedOutput = JSON.parse(agentOutput);
          if (parsedOutput.pageStructure) {
            analysis = parsedOutput;
          } else {
            throw new Error('No structured analysis in string response');
          }
        } catch {
          // If not JSON, treat as text response and create structure
          throw new Error('String response is not JSON');
        }
      } else if (agentOutput && agentOutput.pageStructure) {
        analysis = agentOutput;
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (parseError) {
      console.warn('⚠️ Could not parse structured response, using fallback analysis with agent output');
      
      // Create analysis from agent text response
      const responseText = typeof agentOutput === 'string' ? agentOutput : JSON.stringify(agentOutput);
      
      analysis = {
        pageStructure: {
          dataFields: { 
            "marca": "detectado por IA", 
            "modelo": "detectado por IA", 
            "precio": "detectado por IA",
            "año": "detectado por IA",
            "kilometraje": "detectado por IA",
            "condicion": "detectado por IA",
            "ubicacion": "detectado por IA"
          },
          selectors: { 
            "marca": "h1, .title, .brand, [class*='marca']", 
            "modelo": "h2, .model, .subtitle, [class*='modelo']", 
            "precio": ".price, .cost, [class*='price'], [class*='precio']",
            "año": ".year, [class*='year'], [class*='año']",
            "kilometraje": ".mileage, .km, [class*='mile'], [class*='kilometr']",
            "condicion": ".condition, [class*='condition'], [class*='estado']",
            "ubicacion": ".location, [class*='location'], [class*='ubicacion']"
          },
          extractionMethod: 'dom' as const
        },
        challenges: ['Respuesta de genai-app no estructurada', 'Usando estructura inferida'],
        confidence: 0.7,
        estimatedTime: 25,
        recommendations: [
          'Validar selectores CSS generados',
          'Probar extracción con datos reales',
          'Ajustar prompts del agente para respuestas estructuradas'
        ],
        agentResponse: responseText.substring(0, 500) // Include first 500 chars of agent response
      };
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Analysis completed in ${processingTime}ms - Confidence: ${analysis.confidence}`);
    
    return NextResponse.json({
      success: true,
      analysis,
      processingTime,
      agentUrl: analyzerUrl,
      rawResponse: agentResponse,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'AI Analyzer (genai-app Cloud Run)',
    status: 'healthy',
    agentUrl: process.env.VEHICLE_ANALYZER_URL || 'Not configured',
    authenticated: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    timestamp: new Date().toISOString()
  });
}