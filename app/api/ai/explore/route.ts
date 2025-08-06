/**
 * AI Explorer API Route - Updated to use Local Agent Service
 * Explores websites to discover vehicle pages and opportunities
 * Uses local Vertex AI agents instead of external Cloud Run services
 */

import { NextRequest, NextResponse } from 'next/server';
import { exploreWebsite } from '@/lib/ai-agents';
import { logger } from '@/lib/logger';
import { withSecurity, validateRequestBody, validators, createSecureResponse, createErrorResponse } from '@/lib/api-security';

// Load environment variables for local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' });
}

interface ExplorationRequest {
  baseUrl: string;
  dealershipInfo?: {
    name: string;
    brand?: string;
    type?: string;
    city?: string;
    province?: string;
  };
  explorationConfig?: {
    maxPages?: number;
    maxDepth?: number;
    includeImages?: boolean;
    focusOnOpportunities?: boolean;
  };
}

interface ExplorationResult {
  vehicleUrls: Array<{
    url: string;
    title?: string;
    price?: string;
    opportunityLevel: 'high' | 'medium' | 'low';
    estimatedValue?: string;
  }>;
  paginationUrls: string[];
  filterUrls: string[];
  challengesDetected: string[];
  explorationStats: {
    pagesAnalyzed: number;
    vehiclesFound: number;
    opportunitiesFound: number;
    processingTime: number;
  };
}

async function exploreHandler(request: NextRequest) {
  const body = await request.json();
  
  // Validate input
  const validation = validateRequestBody<ExplorationRequest>(body, {
    baseUrl: validators.url,
    dealershipInfo: (value) => value === undefined || (typeof value === 'object' && value !== null),
    explorationConfig: (value) => value === undefined || (typeof value === 'object' && value !== null)
  });
  
  if (!validation.valid) {
    return createErrorResponse('Validation failed: ' + validation.errors.join(', '), 400, 'VALIDATION_ERROR');
  }
  
  const { baseUrl, dealershipInfo, explorationConfig } = validation.data;
    
    logger.info('Starting website exploration', { baseUrl }, 'ai-explorer');
    
    // Fetch HTML content
    let htmlContent = '';
    try {
      const response = await fetch(baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      htmlContent = await response.text();
    } catch (fetchError) {
      logger.warn('Failed to fetch content from URL', { baseUrl }, 'ai-explorer');
    }
    
    // Use direct AI agent
    const startTime = Date.now();
    const exploration = await exploreWebsite(baseUrl, htmlContent);
    const processingTime = Date.now() - startTime;

    logger.info('Exploration completed successfully', { processingTime, baseUrl, vehiclesFound: exploration.vehicleUrls?.length || 0 }, 'ai-explorer');

    return createSecureResponse({
      success: true,  
      vehicleUrls: exploration.vehicleUrls || [],
      paginationUrls: exploration.paginationUrls || [],
      explorationStats: exploration.explorationStats || {
        pagesAnalyzed: 1,
        vehiclesFound: exploration.vehicleUrls?.length || 0,
        opportunitiesFound: 0
      },
      exploration,
      processingTime,
      service: 'Direct Vertex AI Agent',
      timestamp: new Date().toISOString()
    });
    
}

export const POST = withSecurity(exploreHandler, {
  rateLimit: { requests: 6, windowMs: 60000 } // 6 requests per minute for exploration
});

export async function GET() {
  return createSecureResponse({
    service: 'AI Explorer (Local Vertex AI Agent)',
    status: 'healthy',
    type: 'local-agent',
    timestamp: new Date().toISOString()
  });
}