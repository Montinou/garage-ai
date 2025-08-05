/**
 * Scraping Scheduler Cron Job
 * Automatically schedules scraping jobs for configured sources
 */

import { NextResponse } from 'next/server';
import { ScraperPipeline } from '@/lib/scraper-pipeline';
import { ExplorationPipeline } from '@/lib/exploration-pipeline';
import { createAgentJob, recordAgentMetric } from '@/lib/queries';
import { 
  getDealershipsForExploration, 
  getDealershipsByFrequency,
  getHighPriorityDealerships,
  getBestExplorationUrl,
  updateDealershipLastExplored,
  getDealershipStats
} from '@/lib/dealership-queries';

// Configuration for automated scraping sources
const SCRAPING_SOURCES = [
  {
    name: 'MercadoLibre Argentina - Autos Usados',
    type: 'direct_urls', // Direct vehicle URLs
    urls: [
      'https://autos.mercadolibre.com.ar/toyota-corolla/usado',
      'https://autos.mercadolibre.com.ar/ford-ecosport/usado',
      'https://autos.mercadolibre.com.ar/chevrolet-onix/usado',
      'https://autos.mercadolibre.com.ar/volkswagen-polo/usado'
    ],
    frequency: 'hourly',
    enabled: true
  },
  {
    name: 'AutoCosmos Argentina - Usados',
    type: 'direct_urls',
    urls: [
      'https://autocosmos.com.ar/auto/usado/toyota/corolla',
      'https://autocosmos.com.ar/auto/usado/ford/ecosport',
      'https://autocosmos.com.ar/auto/usado/chevrolet/onix'
    ],
    frequency: 'daily',
    enabled: true
  }
];

// Configuration for real Argentine dealership URLs that need exploration
const DEALERSHIP_SOURCES = [
  {
    name: 'Toyota Line Up Usados Tucumán',
    type: 'exploration', // Requires AI exploration
    baseUrl: 'https://lineup.com.ar/usados',
    frequency: 'daily',
    explorationConfig: {
      explorationDepth: 'medium',
      maxUrlsToProcess: 20,
      opportunityThreshold: 'medium',
      qualityThreshold: 80
    },
    enabled: true
  },
  {
    name: 'LOX Autos NOA',
    type: 'exploration',
    baseUrl: 'https://loxautos.com.ar/',
    frequency: 'daily',
    explorationConfig: {
      explorationDepth: 'deep',
      maxUrlsToProcess: 30,
      opportunityThreshold: 'medium',
      qualityThreshold: 75
    },
    enabled: true
  },
  {
    name: 'Autosol Salta/Jujuy',
    type: 'exploration',
    baseUrl: 'https://www.autosol.com.ar/usados',
    frequency: 'daily',
    explorationConfig: {
      explorationDepth: 'medium',
      maxUrlsToProcess: 25,
      opportunityThreshold: 'medium',
      qualityThreshold: 75
    },
    enabled: true
  },
  {
    name: 'Kavak Argentina',
    type: 'exploration',
    baseUrl: 'https://www.kavak.com/ar/',
    frequency: 'daily',
    explorationConfig: {
      explorationDepth: 'deep',
      maxUrlsToProcess: 50,
      opportunityThreshold: 'high',
      qualityThreshold: 85
    },
    enabled: true
  },
  {
    name: 'Car Cash Argentina',
    type: 'exploration',
    baseUrl: 'https://www.carcash.com.ar/',
    frequency: 'daily',
    explorationConfig: {
      explorationDepth: 'medium',
      maxUrlsToProcess: 25,
      opportunityThreshold: 'high',
      qualityThreshold: 80
    },
    enabled: true
  },
  {
    name: 'Ford Pussetto Salta',
    type: 'exploration',
    baseUrl: 'https://www.fordpussetto.com.ar/vehiculos/usados',
    frequency: 'daily',
    explorationConfig: {
      explorationDepth: 'medium',
      maxUrlsToProcess: 20,
      opportunityThreshold: 'medium',
      qualityThreshold: 75
    },
    enabled: true
  },
  {
    name: 'Usados Cenoa',
    type: 'exploration',
    baseUrl: 'https://usados.cenoa.com.ar/',
    frequency: 'daily',
    explorationConfig: {
      explorationDepth: 'medium',
      maxUrlsToProcess: 20,
      opportunityThreshold: 'medium',
      qualityThreshold: 75
    },
    enabled: true
  }
];

export async function GET() {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Scraping Scheduler - Starting automatic scraping job creation');

    let totalJobsCreated = 0;
    let totalSourcesProcessed = 0;

    // Get dealership statistics for monitoring
    const stats = await getDealershipStats();
    console.log('📊 Dealership Statistics:', stats);

    // Process direct URL sources (keep existing sources for now)
    for (const source of SCRAPING_SOURCES) {
      if (!source.enabled) {
        console.log(`⏭️  Skipping disabled source: ${source.name}`);
        continue;
      }

      console.log(`📋 Processing source: ${source.name} (${source.urls.length} URLs)`);

      // Create pipeline jobs for each URL in the source
      for (const url of source.urls) {
        try {
          const job = await createAgentJob({
            agentId: 'scraping-scheduler',
            agentType: 'orchestrator',
            jobType: 'pipeline_process',
            payload: {
              url,
              source: source.name,
              frequency: source.frequency,
              config: {
                qualityThreshold: 75,
                saveToDatabase: true,
                validateBeforeSaving: true,
                retryAttempts: 2
              }
            },
            priority: source.frequency === 'hourly' ? 'high' : 'normal'
          });

          console.log(`✅ Created job ${job.id} for ${url}`);
          totalJobsCreated++;

        } catch (jobError) {
          console.error(`❌ Failed to create job for ${url}:`, jobError);
          await recordAgentMetric(
            'scraping-scheduler',
            'orchestrator',
            'job_creation_error',
            1,
            'count'
          );
        }
      }

      totalSourcesProcessed++;
    }

    // Process database-driven dealership exploration
    console.log('🗄️ Fetching dealerships from database...');
    const dealershipsToExplore = await getDealershipsForExploration();
    
    console.log(`📍 Found ${dealershipsToExplore.length} dealerships ready for exploration`);

    for (const dealership of dealershipsToExplore) {
      const explorationUrl = getBestExplorationUrl(dealership);
      
      if (!explorationUrl) {
        console.log(`⚠️  No exploration URL available for ${dealership.name}`);
        continue;
      }

      console.log(`🔍 Processing dealership: ${dealership.name} (${dealership.cityName}, ${dealership.provinceName})`);
      console.log(`   📊 Priority: ${dealership.priorityScore}, Hours since last: ${Math.round(dealership.hoursSinceLastExploration)}`);

      try {
        const job = await createAgentJob({
          agentId: 'scraping-scheduler',
          agentType: 'orchestrator',
          jobType: 'exploration_process',
          payload: {
            dealershipId: dealership.id,
            baseUrl: explorationUrl,
            source: dealership.name,
            frequency: dealership.explorationFrequency,
            explorationConfig: dealership.explorationConfig,
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
              retryAttempts: 2
            }
          },
          priority: dealership.priorityScore >= 4 ? 'high' : 
                   dealership.priorityScore >= 3 ? 'normal' : 'low'
        });

        console.log(`✅ Created exploration job ${job.id} for ${dealership.name}`);
        totalJobsCreated++;

        // Update the last explored timestamp to prevent duplicate scheduling
        await updateDealershipLastExplored(dealership.id);

      } catch (jobError) {
        console.error(`❌ Failed to create exploration job for ${dealership.name}:`, jobError);
        await recordAgentMetric(
          'scraping-scheduler',
          'orchestrator',
          'exploration_job_creation_error',
          1,
          'count'
        );
      }

      totalSourcesProcessed++;
    }

    const processingTime = Date.now() - startTime;

    // Record success metrics
    await recordAgentMetric('scraping-scheduler', 'orchestrator', 'sources_processed', totalSourcesProcessed, 'count');
    await recordAgentMetric('scraping-scheduler', 'orchestrator', 'jobs_created', totalJobsCreated, 'count');
    await recordAgentMetric('scraping-scheduler', 'orchestrator', 'scheduler_run_time', processingTime, 'ms');

    console.log(`🎉 Scraping Scheduler completed: ${totalJobsCreated} jobs created from ${totalSourcesProcessed} sources in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      jobsCreated: totalJobsCreated,
      sourcesProcessed: totalSourcesProcessed,
      processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Scraping Scheduler failed:', error);

    try {
      await recordAgentMetric('scraping-scheduler', 'orchestrator', 'scheduler_error', 1, 'count');
    } catch (metricError) {
      console.error('Failed to record error metric:', metricError);
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Scheduler failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}