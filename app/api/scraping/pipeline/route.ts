/**
 * Automated Scraping Pipeline API Route
 * Processes URLs through analyze->extract->validate->save pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { ScraperPipeline } from '@/lib/scraper-pipeline';
import { createAgentJob, recordAgentMetric } from '@/lib/queries';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { 
      urls, 
      config = {},
      scheduleForLater = false 
    } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'URLs array is required' },
        { status: 400 }
      );
    }

    console.log(`🚀 Starting pipeline for ${urls.length} URLs`);

    // If scheduling for later, create agent jobs instead of processing immediately
    if (scheduleForLater) {
      const jobs = [];
      
      for (const url of urls) {
        const job = await createAgentJob({
          agentId: 'scraper-pipeline',
          agentType: 'orchestrator',
          jobType: 'pipeline_process',
          payload: {
            url,
            config,
            pipeline: true
          },
          priority: 'normal'
        });
        
        jobs.push(job);
      }

      await recordAgentMetric(
        'scraper-pipeline', 
        'orchestrator', 
        'jobs_scheduled', 
        jobs.length, 
        'count'
      );

      return NextResponse.json({
        success: true,
        scheduled: true,
        jobsCreated: jobs.length,
        jobs: jobs.map(j => ({ id: j.id, url: j.payload.url })),
        timestamp: new Date().toISOString()
      });
    }

    // Process immediately
    const pipeline = new ScraperPipeline(config);
    const result = await pipeline.processBatch(urls);

    const processingTime = Date.now() - startTime;

    // Record metrics
    await recordAgentMetric('scraper-pipeline', 'orchestrator', 'batch_processed', 1, 'count');
    await recordAgentMetric('scraper-pipeline', 'orchestrator', 'urls_processed', result.totalProcessed, 'count');
    await recordAgentMetric('scraper-pipeline', 'orchestrator', 'vehicles_saved', result.totalSaved, 'count');
    await recordAgentMetric('scraper-pipeline', 'orchestrator', 'processing_time', processingTime, 'ms');

    console.log(`🎉 Pipeline completed in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      ...result,
      totalProcessingTime: processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Pipeline failed:', error);

    try {
      await recordAgentMetric('scraper-pipeline', 'orchestrator', 'pipeline_error', 1, 'count');
    } catch (metricError) {
      console.error('Failed to record error metric:', metricError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Pipeline failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Automated Scraping Pipeline',
    status: 'healthy',
    features: [
      'AI-powered analysis',
      'Data extraction',
      'Quality validation',
      'Database integration',
      'Batch processing',
      'Job scheduling'
    ],
    timestamp: new Date().toISOString()
  });
}