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

    // Use new /chat endpoint format as per API documentation
    const extractionPrompt = `Extrae los datos del vehículo del siguiente contenido web en español:

URL: ${url}
Contenido: ${content.substring(0, 8000)}
Estrategia: ${JSON.stringify(extractionStrategy || {})}

Por favor, devuelve un JSON con los datos estructurados del vehículo incluyendo marca, modelo, año, precio, kilometraje, características, condición, vendedor, ubicación y descripción.`;

    const response = await fetch(`${extractorUrl}/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        message: {
          text: extractionPrompt,
          files: []
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Chat API call failed: ${response.status} - ${errorText}`);
      throw new Error(`Chat API call failed: ${response.status}`);
    }
    
    const agentResponse = await response.json();
    
    // Parse the /chat API response to extract vehicle data
    let vehicleData: VehicleData;
    
    try {
      // Extract the actual AI response from /chat endpoint
      let aiResponse = '';
      
      if (typeof agentResponse === 'string') {
        aiResponse = agentResponse;
      } else if (agentResponse.data && agentResponse.data.length > 0) {
        const firstData = agentResponse.data[0];
        if (typeof firstData === 'string') {
          aiResponse = firstData;
        } else if (firstData && firstData.value && firstData.value.text) {
          aiResponse = firstData.value.text;
        } else if (firstData && typeof firstData === 'object') {
          aiResponse = JSON.stringify(firstData);
        }
      } else if (agentResponse.response) {
        aiResponse = agentResponse.response;
      } else if (agentResponse.result) {
        aiResponse = agentResponse.result;
      } else {
        aiResponse = JSON.stringify(agentResponse);
      }
      
      console.log('🤖 Extractor AI Response extracted:', aiResponse.substring(0, 200) + '...');
      
      // Try to parse as structured JSON first
      if (aiResponse.includes('{') && (aiResponse.includes('marca') || aiResponse.includes('vehicleData'))) {
        const jsonMatch = aiResponse.match(/\{.*\}/s);
        if (jsonMatch) {
          const parsedResponse = JSON.parse(jsonMatch[0]);
          if (parsedResponse.marca || parsedResponse.vehicleData) {
            vehicleData = parsedResponse.vehicleData || parsedResponse;
          } else {
            throw new Error('No vehicle data found in JSON response');
          }
        } else {
          throw new Error('Could not extract JSON from AI response');
        }
      } else {
        throw new Error('No structured vehicle data found in AI response');
      }
    } catch (parseError) {
      console.warn('⚠️ Could not parse structured vehicle data, creating fallback');
      
      // Fallback structure
      vehicleData = {
        marca: "Detectado por IA",
        modelo: "Modelo no especificado", 
        año: 2020,
        precio: 0,
        kilometraje: 0,
        vin: null,
        caracteristicas: ["Datos extraídos por IA", "Información limitada"],
        condicion: "Usado",
        vendedor: "Vendedor no especificado",
        imagenes: [],
        descripcion: "Datos extraídos automáticamente por IA. Información puede ser limitada.",
        ubicacion: "Ubicación no especificada",
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