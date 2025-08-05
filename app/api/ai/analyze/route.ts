/**
 * AI Analyzer API Route - Updated to use Local Agent Service
 * Analyzes web pages to understand structure and plan data extraction
 * Uses local Vertex AI agents instead of external Cloud Run services
 */

import { NextRequest, NextResponse } from 'next/server';
import { localAgentService } from '@/lib/agents/local-agent-service';

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
        { success: false, error: 'Missing required fields: url and htmlContent' },
        { status: 400 }
      );
    }
    
    console.log(`🔍 Analyzing page with local agent: ${url}`);

    // Use local agent service instead of external Cloud Run
    const result = await localAgentService.analyze(url, htmlContent, additionalContext);

    if (!result.success) {
      console.error('Local analysis failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    console.log(`✅ Local analysis completed in ${result.processingTime}ms`);

    return NextResponse.json({
      success: true,
      analysis: result.data,
      processingTime: result.processingTime,
      service: 'Local Vertex AI Agent',
      timestamp: result.timestamp
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
    service: 'AI Analyzer (Local Vertex AI Agent)',
    status: 'healthy',
    type: 'local-agent',
    vertexProject: 'analog-medium-451706-m7',
    timestamp: new Date().toISOString()
  });
}