/**
 * Batch Scheduler - Processes dealerships by scraper_order
 * Can be run multiple times per day with smaller batches
 * Each hour processes a different subset of dealerships
 */

import { NextResponse } from 'next/server';
import { createAgentJob, recordAgentMetric } from '@/lib/queries';
import { 
  getCurrentHourDealerships,
  getDealershipsByScraperOrder,
  getBestExplorationUrl,
  updateDealershipLastExplored,
  getDealershipStats
} from '@/lib/dealership-queries';

interface BatchSchedulerParams {
  scraperOrder?: number;
  limit?: number;
  batchSize?: number;
}

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  
  // Parse query parameters
  const params: BatchSchedulerParams = {
    scraperOrder: searchParams.get('order') ? parseInt(searchParams.get('order')!) : undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 5, // Default to 5 dealerships per batch
    batchSize: searchParams.get('batchSize') ? parseInt(searchParams.get('batchSize')!) : 5
  };
  
  try {
    console.log('⚡ Batch Scheduler - Starting batch processing');
    console.log(`🔧 Parameters: order=${params.scraperOrder || 'current-hour'}, limit=${params.limit}`);

    let totalJobsCreated = 0;
    const currentHour = new Date().getHours() + 1; // 1-24

    // Get dealership statistics for monitoring
    const stats = await getDealershipStats();
    console.log('📊 Dealership Statistics:', stats);

    // Determine which dealerships to process
    let dealershipsToProcess;
    
    if (params.scraperOrder) {
      // Process specific scraper order
      dealershipsToProcess = await getDealershipsByScraperOrder(params.scraperOrder, params.limit);
      console.log(`🔢 Processing scraper order ${params.scraperOrder}`);
    } else {
      // Process current hour's dealerships
      dealershipsToProcess = await getCurrentHourDealerships(params.limit);
      console.log(`🕐 Processing current hour batch (${currentHour})`);
    }
    
    console.log(`📍 Found ${dealershipsToProcess.length} dealerships to process in this batch`);

    if (dealershipsToProcess.length === 0) {
      console.log('ℹ️  No dealerships found for this batch');
      return NextResponse.json({
        success: true,
        message: 'No dealerships found for this batch',
        batchInfo: {
          scraperOrder: params.scraperOrder || currentHour,
          limit: params.limit,
          processed: 0
        },
        timestamp: new Date().toISOString()
      });
    }

    // Process each dealership in the batch
    for (const dealership of dealershipsToProcess) {
      const explorationUrl = getBestExplorationUrl(dealership);
      
      if (!explorationUrl) {
        console.log(`⚠️  No exploration URL available for ${dealership.name}`);
        continue;
      }

      console.log(`🏢 Batch processing: ${dealership.name} (Order: ${dealership.scraperOrder})`);
      console.log(`   📍 ${dealership.cityName}, ${dealership.provinceName}`);
      console.log(`   ⏰ Hours since last: ${Math.round(dealership.hoursSinceLastExploration)}`);

      try {
        const job = await createAgentJob({
          agentId: 'batch-scheduler',
          agentType: 'orchestrator',
          jobType: 'exploration_process',
          payload: {
            dealershipId: dealership.id,
            baseUrl: explorationUrl,
            source: `BATCH_${dealership.scraperOrder}_${dealership.name}`,
            frequency: dealership.explorationFrequency,
            explorationConfig: dealership.explorationConfig,
            dealershipInfo: {
              name: dealership.name,
              brand: dealership.officialBrand,
              type: dealership.dealershipType,
              city: dealership.cityName,
              province: dealership.provinceName,
              region: dealership.provinceRegion,
              scraperOrder: dealership.scraperOrder
            },
            batchInfo: {
              scraperOrder: dealership.scraperOrder,
              currentHour,
              batchSize: dealershipsToProcess.length
            },
            config: {
              saveToDatabase: true,
              validateBeforeSaving: true,
              retryAttempts: 2,
              timeout: 120000 // 2 minute timeout for batch processing
            }
          },
          priority: 'normal' // Normal priority for batch processing
        });

        console.log(`✅ Created batch job ${job.id} for ${dealership.name}`);
        totalJobsCreated++;

        // Update the last explored timestamp
        await updateDealershipLastExplored(dealership.id);

        // Record batch processing metric
        await recordAgentMetric(
          'batch-scheduler',
          'orchestrator',
          'batch_job_created',
          1,
          'count'
        );

      } catch (jobError) {
        console.error(`❌ Failed to create batch job for ${dealership.name}:`, jobError);
        await recordAgentMetric(
          'batch-scheduler',
          'orchestrator',
          'batch_job_error',
          1,
          'count'
        );
      }
    }

    const processingTime = Date.now() - startTime;

    // Record success metrics
    await recordAgentMetric('batch-scheduler', 'orchestrator', 'total_batch_jobs_created', totalJobsCreated, 'count');
    await recordAgentMetric('batch-scheduler', 'orchestrator', 'batch_processing_time', processingTime, 'ms');
    await recordAgentMetric('batch-scheduler', 'orchestrator', 'batch_size', dealershipsToProcess.length, 'count');

    console.log(`🎉 Batch Scheduler completed: ${totalJobsCreated} jobs created in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      batchJobsCreated: totalJobsCreated,
      batchInfo: {
        scraperOrder: params.scraperOrder || currentHour,
        limit: params.limit,
        processed: dealershipsToProcess.length,
        dealerships: dealershipsToProcess.map(d => ({
          name: d.name,
          scraperOrder: d.scraperOrder,
          city: d.cityName,
          province: d.provinceName,
          hoursSinceLastExploration: Math.round(d.hoursSinceLastExploration)
        }))
      },
      processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Batch Scheduler failed:', error);

    try {
      await recordAgentMetric('batch-scheduler', 'orchestrator', 'batch_scheduler_error', 1, 'count');
    } catch (metricError) {
      console.error('Failed to record error metric:', metricError);
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Batch scheduler failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST endpoint to assign scraper orders
export async function POST() {
  try {
    console.log('🔄 Assigning scraper orders to dealerships...');
    
    const { assignScraperOrders } = await import('@/lib/dealership-queries');
    await assignScraperOrders();

    return NextResponse.json({
      success: true,
      message: 'Scraper orders assigned successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Failed to assign scraper orders:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign scraper orders',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}