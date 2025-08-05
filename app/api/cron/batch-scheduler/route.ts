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
  // Check authorization for cron jobs
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('❌ Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
        console.log(`🚀 Executing exploration and extraction for ${dealership.name}...`);
        
        // Step 1: Explore the website to find vehicle URLs
        const exploreResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/ai/explore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: explorationUrl })
        });
        
        if (!exploreResponse.ok) {
          throw new Error(`Exploration failed: ${exploreResponse.statusText}`);
        }
        
        const exploreResult = await exploreResponse.json();
        const vehicleUrls = exploreResult.vehicleUrls || [];
        
        console.log(`🔍 Found ${vehicleUrls.length} vehicle URLs for ${dealership.name}`);
        
        let extractedCount = 0;
        let savedCount = 0;
        
        // Step 2: Extract and save each vehicle
        for (const vehicleUrl of vehicleUrls.slice(0, 10)) { // Limit to 10 per batch
          try {
            // Fetch vehicle page content
            let vehicleContent = '';
            try {
              const contentResponse = await fetch(vehicleUrl.url, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });
              vehicleContent = await contentResponse.text();
            } catch (fetchError) {
              console.warn(`Failed to fetch content from ${vehicleUrl.url}`);
              continue;
            }

            const extractResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/ai/extract`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                url: vehicleUrl.url,
                content: vehicleContent 
              })
            });
            
            if (extractResponse.ok) {
              const extractResult = await extractResponse.json();
              extractedCount++;
              
              // Save to database via save API
              const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/vehicles/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  vehicleData: extractResult,
                  dealershipId: dealership.id,
                  sourceUrl: vehicleUrl.url,
                  sourcePortal: dealership.name
                })
              });
              
              if (saveResponse.ok) {
                savedCount++;
                console.log(`✅ Saved vehicle from ${vehicleUrl.url}`);
              } else {
                console.warn(`⚠️ Failed to save vehicle from ${vehicleUrl.url}`);
              }
            }
          } catch (vehicleError) {
            console.warn(`⚠️ Failed to process vehicle ${vehicleUrl.url}:`, vehicleError.message);
          }
        }
        
        // Create job record for tracking
        const job = await createAgentJob({
          agentId: 'batch-scheduler',
          agentType: 'orchestrator',
          jobType: 'exploration_process',
          payload: {
            dealershipId: dealership.id,
            baseUrl: explorationUrl,
            vehicleUrlsFound: vehicleUrls.length,
            vehiclesExtracted: extractedCount,
            vehiclesSaved: savedCount,
            source: `BATCH_${dealership.scraperOrder}_${dealership.name}`,
            batchInfo: {
              scraperOrder: dealership.scraperOrder,
              currentHour,
              batchSize: dealershipsToProcess.length
            }
          },
          result: {
            success: true,
            vehicleUrlsFound: vehicleUrls.length,
            vehiclesExtracted: extractedCount,
            vehiclesSaved: savedCount
          },
          status: 'completed',
          priority: 'normal'
        });

        console.log(`✅ Batch processing completed for ${dealership.name}: ${savedCount}/${vehicleUrls.length} vehicles saved`);
        totalJobsCreated++;

        // Update the last explored timestamp
        await updateDealershipLastExplored(dealership.id);

        // Record success metrics
        await recordAgentMetric('batch-scheduler', 'orchestrator', 'vehicles_discovered', vehicleUrls.length, 'count');
        await recordAgentMetric('batch-scheduler', 'orchestrator', 'vehicles_extracted', extractedCount, 'count');
        await recordAgentMetric('batch-scheduler', 'orchestrator', 'vehicles_saved', savedCount, 'count');

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
export async function POST(request: Request) {
  // Check authorization for cron jobs
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('❌ Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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