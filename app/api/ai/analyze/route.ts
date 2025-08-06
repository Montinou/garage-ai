/**
 * AI Analyzer API Route - Updated to use Local Agent Service
 * Analyzes web pages to understand structure and plan data extraction
 * Uses local Vertex AI agents instead of external Cloud Run services
 */

import { NextRequest, NextResponse } from 'next/server';
import { localAgentService } from '@/lib/agents/local-agent-service';
import { logger } from '@/lib/logger';
import { withSecurity, validateRequestBody, validators, sanitizeHtml, createSecureResponse, createErrorResponse } from '@/lib/api-security';

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

async function analyzeHandler(request: NextRequest) {
  const body = await request.json();
  
  // Validate input
  const validation = validateRequestBody<AnalysisRequest>(body, {
    url: validators.url,
    htmlContent: validators.nonEmptyString,
    userAgent: (value): value is string | undefined => value === undefined || validators.safeString(value),
    additionalContext: (value): value is string | undefined => value === undefined || validators.safeString(value)
  });
  
  if (!validation.valid) {
    return createErrorResponse('Validation failed: ' + validation.errors.join(', '), 400, 'VALIDATION_ERROR');
  }
  
  const { url, htmlContent, userAgent, additionalContext } = validation.data;
  
  // Sanitize HTML content
  const sanitizedHtml = sanitizeHtml(htmlContent);
    
    logger.info('Starting page analysis', { url, contentLength: htmlContent.length }, 'ai-analyzer');

    // Use local agent service instead of external Cloud Run
    const result = await localAgentService.analyzeContent({
      url,
      htmlContent: sanitizedHtml,
      additionalContext
    });

    if (!result.success) {
      logger.error('Local analysis failed', new Error(result.error), { url }, 'ai-analyzer');
      return createErrorResponse('Analysis failed', 500, 'ANALYSIS_FAILED');
    }

    logger.info('Analysis completed successfully', { url }, 'ai-analyzer');

    return createSecureResponse({
      success: true,
      analysis: result.data,
      service: 'Local Vertex AI Agent',
      timestamp: new Date().toISOString()
    });
    
}

export const POST = withSecurity(analyzeHandler, {
  rateLimit: { requests: 5, windowMs: 60000 } // 5 requests per minute for analysis
});

export async function GET() {
  return createSecureResponse({
    service: 'AI Analyzer (Local Vertex AI Agent)',
    status: 'healthy',
    type: 'local-agent',
    timestamp: new Date().toISOString()
  });
}