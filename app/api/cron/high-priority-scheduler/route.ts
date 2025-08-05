/**
 * High Priority Dealership Scheduler
 * Schedules exploration for dealerships that are overdue or have never been explored
 */

import { NextResponse } from 'next/server';
import { createAgentJob, recordAgentMetric } from '@/lib/queries';
import { 
  getHighPriorityDealerships,
  getBestExplorationUrl,
  updateDealershipLastExplored
} from '@/lib/dealership-queries';

export async function GET() {
  const startTime = Date.now();
  
  try {
    console.log('🚨 High Priority Scheduler - Processing overdue dealerships');

    let totalJobsCreated = 0;

    // Get high priority dealerships (never explored or >48h old)
    const highPriorityDealerships = await getHighPriorityDealerships();
    
    console.log(`🔥 Found ${highPriorityDealerships.length} high-priority dealerships`);

    for (const dealership of highPriorityDealerships) {
      const explorationUrl = getBestExplorationUrl(dealership);
      
      if (!explorationUrl) {
        console.log(`⚠️  No exploration URL available for ${dealership.name}`);
        continue;
      }

      console.log(`🚨 Processing HIGH PRIORITY: ${dealership.name}`);
      console.log(`   ⏰ Hours since last exploration: ${Math.round(dealership.hoursSinceLastExploration)}`);
      console.log(`   📍 Location: ${dealership.cityName}, ${dealership.provinceName}`);

      try {
        const job = await createAgentJob({
          agentId: 'high-priority-scheduler',
          agentType: 'orchestrator',
          jobType: 'exploration_process',
          payload: {
            dealershipId: dealership.id,
            baseUrl: explorationUrl,
            source: `HIGH_PRIORITY_${dealership.name}`,
            frequency: dealership.explorationFrequency,
            explorationConfig: {
              ...dealership.explorationConfig,
              // Boost config for high priority
              explorationDepth: 'deep',
              maxUrlsToProcess: Math.max(dealership.explorationConfig.maxUrlsToProcess || 15, 30),
              opportunityThreshold: 'high',
              qualityThreshold: Math.max(dealership.explorationConfig.qualityThreshold || 75, 80)
            },
            dealershipInfo: {
              name: dealership.name,
              brand: dealership.officialBrand,
              type: dealership.dealershipType,
              city: dealership.cityName,
              province: dealership.provinceName,
              region: dealership.provinceRegion
            },
            config: {
              saveToDatabase: true,
              validateBeforeSaving: true,
              retryAttempts: 3, // More retries for high priority
              timeout: 300000 // 5 minute timeout
            }
          },
          priority: 'critical' // Highest priority
        });

        console.log(`✅ Created HIGH PRIORITY job ${job.id} for ${dealership.name}`);
        totalJobsCreated++;

        // Update the last explored timestamp
        await updateDealershipLastExplored(dealership.id);

        // Record high priority metric
        await recordAgentMetric(
          'high-priority-scheduler',
          'orchestrator',
          'high_priority_job_created',
          1,
          'count'
        );

      } catch (jobError) {
        console.error(`❌ Failed to create HIGH PRIORITY job for ${dealership.name}:`, jobError);
        await recordAgentMetric(
          'high-priority-scheduler',
          'orchestrator',
          'high_priority_job_error',
          1,
          'count'
        );
      }
    }

    const processingTime = Date.now() - startTime;

    // Record success metrics
    await recordAgentMetric('high-priority-scheduler', 'orchestrator', 'total_jobs_created', totalJobsCreated, 'count');
    await recordAgentMetric('high-priority-scheduler', 'orchestrator', 'processing_time', processingTime, 'ms');

    console.log(`🎉 High Priority Scheduler completed: ${totalJobsCreated} jobs created in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      highPriorityJobsCreated: totalJobsCreated,
      processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 High Priority Scheduler failed:', error);

    try {
      await recordAgentMetric('high-priority-scheduler', 'orchestrator', 'scheduler_error', 1, 'count');
    } catch (metricError) {
      console.error('Failed to record error metric:', metricError);
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'High priority scheduler failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}