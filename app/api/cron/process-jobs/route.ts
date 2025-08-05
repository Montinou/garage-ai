/**
 * Cron Job: Process Agent Jobs
 * Runs every 2 minutes to process pending agent jobs
 */

import { NextResponse } from 'next/server';
import { getPendingJobs, updateJobStatus, recordAgentMetric } from '@/lib/queries';

export async function GET() {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Processing agent jobs - Cron started');
    
    // Get pending jobs from database
    const pendingJobs = await getPendingJobs();
    
    if (pendingJobs.length === 0) {
      console.log('✅ No pending jobs to process');
      return NextResponse.json({ 
        success: true, 
        processed: 0,
        message: 'No pending jobs',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`📋 Found ${pendingJobs.length} pending jobs`);
    
    let processed = 0;
    let failed = 0;

    // Process each job
    for (const job of pendingJobs.slice(0, 10)) { // Limit to 10 jobs per run
      try {
        console.log(`🚀 Processing job ${job.id} (${job.agentType})`);
        
        const result = await processJobByType(job);
        
        if (result.success) {
          await updateJobStatus(job.id, 'completed', result.data);
          await recordAgentMetric(
            job.agentId, 
            job.agentType, 
            'job_success', 
            1, 
            'count'
          );
          processed++;
          console.log(`✅ Job ${job.id} completed successfully`);
        } else {
          await updateJobStatus(job.id, 'failed', { error: result.error });
          await recordAgentMetric(
            job.agentId, 
            job.agentType, 
            'job_failure', 
            1, 
            'count'
          );
          failed++;
          console.error(`❌ Job ${job.id} failed: ${result.error}`);
        }
        
      } catch (error) {
        await updateJobStatus(job.id, 'failed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        await recordAgentMetric(
          job.agentId, 
          job.agentType, 
          'job_error', 
          1, 
          'count'
        );
        failed++;
        console.error(`💥 Job ${job.id} crashed:`, error);
      }
    }

    const processingTime = Date.now() - startTime;
    
    // Record overall metrics
    await recordAgentMetric('system', 'cron', 'jobs_processed', processed, 'count');
    await recordAgentMetric('system', 'cron', 'jobs_failed', failed, 'count');
    await recordAgentMetric('system', 'cron', 'processing_time', processingTime, 'ms');

    console.log(`🎉 Cron completed: ${processed} processed, ${failed} failed in ${processingTime}ms`);
    
    return NextResponse.json({
      success: true,
      processed,
      failed,
      processingTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('💥 Cron job failed:', error);
    
    // Record cron failure
    try {
      await recordAgentMetric('system', 'cron', 'cron_failure', 1, 'count');
    } catch (metricError) {
      console.error('Failed to record metric:', metricError);
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function processJobByType(job: any) {
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  
  try {
    switch (job.agentType) {
      case 'analyzer':
        return await processAnalyzerJob(job, baseUrl);
      case 'extractor':
        return await processExtractorJob(job, baseUrl);
      case 'validator':
        return await processValidatorJob(job, baseUrl);
      default:
        throw new Error(`Unknown agent type: ${job.agentType}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed'
    };
  }
}

async function processAnalyzerJob(job: any, baseUrl: string) {
  const { url, htmlContent, additionalContext } = job.payload;
  
  const response = await fetch(`${baseUrl}/api/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      htmlContent: htmlContent || `Analyze this URL: ${url}`,
      additionalContext
    })
  });

  if (!response.ok) {
    throw new Error(`Analyzer API error: ${response.status}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Analysis failed');
  }

  return {
    success: true,
    data: result
  };
}

async function processExtractorJob(job: any, baseUrl: string) {
  const { url, content, extractionStrategy } = job.payload;
  
  const response = await fetch(`${baseUrl}/api/ai/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      content: content || `Extract vehicle data from: ${url}`,
      extractionStrategy
    })
  });

  if (!response.ok) {
    throw new Error(`Extractor API error: ${response.status}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Extraction failed');
  }

  return {
    success: true,
    data: result
  };
}

async function processValidatorJob(job: any, baseUrl: string) {
  const { vehicleData, context } = job.payload;
  
  const response = await fetch(`${baseUrl}/api/ai/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vehicleData,
      context
    })
  });

  if (!response.ok) {
    throw new Error(`Validator API error: ${response.status}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Validation failed');
  }

  return {
    success: true,
    data: result
  };
}