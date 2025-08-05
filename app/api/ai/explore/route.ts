/**
 * AI Explorer API Route - Updated to use Local Agent Service
 * Explores websites to discover vehicle pages and opportunities
 * Uses local Vertex AI agents instead of external Cloud Run services
 */

import { NextRequest, NextResponse } from 'next/server';
import { exploreWebsite } from '@/lib/ai-agents';

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

export async function POST(request: NextRequest) {
  try {
    const body: ExplorationRequest = await request.json();
    const { baseUrl, dealershipInfo, explorationConfig } = body;
    
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: baseUrl' },
        { status: 400 }
      );
    }
    
    console.log(`🔍 Exploring website: ${baseUrl}`);
    
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
      console.warn('Failed to fetch content from URL');
    }
    
    // Use direct AI agent
    const startTime = Date.now();
    const exploration = await exploreWebsite(baseUrl, htmlContent);
    const processingTime = Date.now() - startTime;

    console.log(`✅ Exploration completed in ${processingTime}ms`);

    return NextResponse.json({
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
    
  } catch (error) {
    console.error('❌ Exploration failed:', error);
    return NextResponse.json(
      {
        error: 'Exploration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'AI Explorer (Local Vertex AI Agent)',
    status: 'healthy',
    type: 'local-agent',
    vertexProject: 'analog-medium-451706-m7',
    timestamp: new Date().toISOString()
  });
}