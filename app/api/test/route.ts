/**
 * Test API Route - Vercel Serverless Function
 * Tests the complete AI pipeline with Cloud Run agents
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Starting complete system test...');
    const startTime = Date.now();
    
    // Test data - Spanish vehicle listing content
    const testUrl = 'https://example.mercadolibre.com.ar/vehiculo-test';
    const testHtmlContent = `
      <div class="listing">
        <h1>Toyota Corolla 2015</h1>
        <div class="price">$850.000</div>
        <div class="mileage">120.000 km</div>
        <div class="location">Buenos Aires, CABA</div>
        <div class="seller">Concesionaria Premium</div>
        <div class="description">
          Excelente estado, mantenimiento al día. 
          Aire acondicionado, dirección asistida, ABS.
          Papeles al día, transferencia inmediata.
        </div>
        <div class="features">
          <span>Aire Acondicionado</span>
          <span>Dirección Asistida</span>
          <span>ABS</span>
          <span>Airbags</span>
        </div>
        <div class="condition">Usado</div>
        <img src="/toyota-corolla-1.jpg" alt="Toyota Corolla frontal">
        <img src="/toyota-corolla-2.jpg" alt="Toyota Corolla interior">
      </div>
    `;

    // Step 1: Test Analyzer
    console.log('📊 Testing analyzer...');
    const analyzeResponse = await fetch(`${request.nextUrl.origin}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: testUrl,
        htmlContent: testHtmlContent,
        userAgent: 'garage-ai-test/1.0',
        additionalContext: 'Test de extracción de datos de vehículo en español'
      })
    });

    if (!analyzeResponse.ok) {
      throw new Error(`Analyzer failed: ${analyzeResponse.status}`);
    }

    const analysisResult = await analyzeResponse.json();
    console.log('✅ Analyzer completed:', analysisResult.analysis?.confidence);

    // Step 2: Test Extractor
    console.log('🔍 Testing extractor...');
    const extractResponse = await fetch(`${request.nextUrl.origin}/api/ai/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: testUrl,
        content: testHtmlContent,
        extractionStrategy: analysisResult.analysis?.pageStructure || {
          method: 'dom',
          selectors: {}
        }
      })
    });

    if (!extractResponse.ok) {
      throw new Error(`Extractor failed: ${extractResponse.status}`);
    }

    const extractionResult = await extractResponse.json();
    console.log('✅ Extractor completed:', extractionResult.vehicleData?.marca, extractionResult.vehicleData?.modelo);

    // Step 3: Test Validator
    console.log('🔎 Testing validator...');
    const validateResponse = await fetch(`${request.nextUrl.origin}/api/ai/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleData: extractionResult.vehicleData,
        context: {
          sourceUrl: testUrl,
          extractionMethod: 'ai-agent',
          extractionConfidence: analysisResult.analysis?.confidence || 0.5
        }
      })
    });

    if (!validateResponse.ok) {
      throw new Error(`Validator failed: ${validateResponse.status}`);
    }

    const validationResult = await validateResponse.json();
    console.log('✅ Validator completed:', validationResult.validation?.puntuacionCalidad);

    const totalTime = Date.now() - startTime;

    // Return comprehensive test results
    return NextResponse.json({
      success: true,
      testResults: {
        totalProcessingTime: totalTime,
        steps: {
          analysis: {
            success: true,
            confidence: analysisResult.analysis?.confidence,
            processingTime: analysisResult.processingTime,
            agentUrl: analysisResult.agentUrl,
            challenges: analysisResult.analysis?.challenges?.length || 0
          },
          extraction: {
            success: true,
            vehicleFound: !!(extractionResult.vehicleData?.marca && extractionResult.vehicleData?.modelo),
            processingTime: extractionResult.processingTime,
            agentUrl: extractionResult.agentUrl,
            extractedFields: Object.keys(extractionResult.vehicleData || {}).length
          },
          validation: {
            success: true,
            isValid: validationResult.validation?.esValido,
            qualityScore: validationResult.validation?.puntuacionCalidad,
            processingTime: validationResult.processingTime,
            agentUrl: validationResult.agentUrl,
            issues: validationResult.validation?.problemas?.length || 0
          }
        },
        extractedData: {
          marca: extractionResult.vehicleData?.marca,
          modelo: extractionResult.vehicleData?.modelo,
          año: extractionResult.vehicleData?.año,
          precio: extractionResult.vehicleData?.precio,
          kilometraje: extractionResult.vehicleData?.kilometraje
        },
        validation: {
          esValido: validationResult.validation?.esValido,
          puntuacionCalidad: validationResult.validation?.puntuacionCalidad,
          problemas: validationResult.validation?.problemas
        }
      },
      timestamp: new Date().toISOString(),
      environment: {
        analyzerConfigured: !!process.env.VEHICLE_ANALYZER_URL,
        extractorConfigured: !!process.env.VEHICLE_EXTRACTOR_URL,
        validatorConfigured: !!process.env.VEHICLE_VALIDATOR_URL
      }
    });
    
  } catch (error) {
    console.error('❌ System test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'System test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'System Test',
    status: 'ready',
    description: 'Tests complete AI pipeline: analyze → extract → validate',
    environment: {
      analyzerConfigured: !!process.env.VEHICLE_ANALYZER_URL,
      extractorConfigured: !!process.env.VEHICLE_EXTRACTOR_URL,
      validatorConfigured: !!process.env.VEHICLE_VALIDATOR_URL
    },
    timestamp: new Date().toISOString()
  });
}