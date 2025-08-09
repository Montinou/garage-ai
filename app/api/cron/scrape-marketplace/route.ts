/**
 * Marketplace-specific scraper API route (as defined in task-plan.xml schedules)
 * GET /api/cron/scrape-marketplace?source=marketplaceA&seed=url1&seed=url2
 */

import { NextRequest, NextResponse } from 'next/server';
import { VehicleScraperService, DefaultSources } from '@/lib/scraper-service';

export const runtime = 'nodejs';

function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source');
  
  if (!source) {
    return NextResponse.json({ error: 'Missing ?source parameter' }, { status: 400 });
  }

  // Optional protection: simple token in Authorization: Bearer <CRON_SECRET>
  const requiredToken = process.env.CRON_SECRET;
  if (requiredToken) {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (token !== requiredToken) {
      return unauthorized();
    }
  }

  try {
    const seedsParam = searchParams.getAll('seed'); // allows multiple seed URLs
    const result = await runScrape(source, { seedUrls: seedsParam });
    return NextResponse.json({ 
      ok: true, 
      source, 
      ...result 
    }, { status: 200 });
  } catch (err: any) {
    console.error(`[cron:scrape-marketplace] ${source}`, err);
    return NextResponse.json({ 
      ok: false, 
      source, 
      error: String(err?.message || err) 
    }, { status: 500 });
  }
}

type RunOptions = {
  seedUrls?: string[]
}

async function runScrape(source: string, opts: RunOptions = {}) {
  const startedAt = Date.now();
  
  // Get source configuration
  const sourceConfig = DefaultSources[source];
  if (!sourceConfig) {
    throw new Error(`Source configuration not found for: ${source}`);
  }

  // Initialize scraper service
  const scraperService = new VehicleScraperService();
  
  // Run scraping with optional seed URL override
  const result = await scraperService.scrapeSource(sourceConfig, opts);
  
  const finishedAt = Date.now();
  return { 
    durationMs: finishedAt - startedAt, 
    stats: result.stats,
    source: sourceConfig.id 
  };
}