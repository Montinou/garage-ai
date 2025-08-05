/**
 * Exploration Pipeline with AI Agents
 * Complete flow: Explore -> Analyze -> Extract -> Validate -> Detect Opportunities -> Save
 */

import { localAgentService } from './agents/local-agent-service';
import { opportunityDetector, type Opportunity } from './opportunity-detector';
import { ScraperPipeline } from './scraper-pipeline';
import { db } from './neon';
import { vehicles } from './schema';
import { eq } from 'drizzle-orm';

export interface ExplorationConfig {
  explorationDepth: 'shallow' | 'medium' | 'deep';
  maxUrlsToProcess: number;
  opportunityThreshold: 'high' | 'medium' | 'low';
  qualityThreshold: number;
  saveToDatabase: boolean;
  processImmediate: boolean;
  delayBetweenRequests: number;
}

export interface ExplorationResult {
  success: boolean;
  baseUrl: string;
  explorationData: any;
  discoveredUrls: number;
  processedUrls: number;
  opportunitiesFound: number;
  vehiclesSaved: number;
  processingTime: number;
  opportunities: Opportunity[];
  errors: string[];
}

export class ExplorationPipeline {
  private config: Required<ExplorationConfig>;
  private scraperPipeline: ScraperPipeline;

  constructor(config: ExplorationConfig = {}) {
    this.config = {
      explorationDepth: 'shallow',
      maxUrlsToProcess: 20,
      opportunityThreshold: 'medium',
      qualityThreshold: 75,
      saveToDatabase: true,
      processImmediate: true,
      delayBetweenRequests: 2000,
      ...config
    };

    this.scraperPipeline = new ScraperPipeline({
      qualityThreshold: this.config.qualityThreshold,
      saveToDatabase: this.config.saveToDatabase,
      batchSize: 5,
      delayBetweenBatches: this.config.delayBetweenRequests
    });
  }

  /**
   * Complete exploration pipeline for a dealership/portal base URL
   */
  async exploreAndProcess(baseUrl: string, htmlContent?: string): Promise<ExplorationResult> {
    const startTime = Date.now();
    console.log(`🔍 Starting exploration pipeline for: ${baseUrl}`);

    const result: ExplorationResult = {
      success: false,
      baseUrl,
      explorationData: null,
      discoveredUrls: 0,
      processedUrls: 0,
      opportunitiesFound: 0,
      vehiclesSaved: 0,
      processingTime: 0,
      opportunities: [],
      errors: []
    };

    try {
      // Step 1: Fetch HTML content if not provided
      if (!htmlContent) {
        console.log('📡 Fetching HTML content from base URL...');
        try {
          const response = await fetch(baseUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; GarageAI-Explorer/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          });
          htmlContent = await response.text();
          console.log(`✅ Fetched ${htmlContent.length} characters of HTML content`);
        } catch (fetchError) {
          result.errors.push(`Failed to fetch HTML: ${fetchError}`);
          htmlContent = `<html><body><p>Placeholder content for ${baseUrl}</p></body></html>`;
        }
      }

      // Step 2: Explore with AI agent
      console.log('🕷️ Running exploration agent...');
      const explorationResponse = await localAgentService.explore(
        baseUrl, 
        htmlContent, 
        this.config.explorationDepth
      );

      if (!explorationResponse.success) {
        throw new Error(`Exploration failed: ${explorationResponse.error}`);
      }

      result.explorationData = explorationResponse.data;
      const { vehicleUrls, paginationUrls, opportunities } = explorationResponse.data;
      
      console.log(`🎯 Exploration completed:`);
      console.log(`   - Vehicle URLs found: ${vehicleUrls.length}`);
      console.log(`   - Pagination URLs: ${paginationUrls.length}`);
      console.log(`   - Opportunities detected: ${opportunities.length}`);

      // Step 3: Prioritize URLs by opportunity level
      const prioritizedUrls = this.prioritizeUrls(vehicleUrls);
      const urlsToProcess = prioritizedUrls.slice(0, this.config.maxUrlsToProcess);
      
      result.discoveredUrls = vehicleUrls.length;
      console.log(`📋 Processing ${urlsToProcess.length} high-priority URLs`);

      // Step 4: Process vehicle URLs through the pipeline
      if (this.config.processImmediate && urlsToProcess.length > 0) {
        console.log('🚀 Processing URLs through AI pipeline...');
        
        const processedVehicles = [];
        let processedCount = 0;

        for (const vehicleUrl of urlsToProcess) {
          try {
            console.log(`📄 Processing ${processedCount + 1}/${urlsToProcess.length}: ${vehicleUrl.url}`);
            
            // Process through the complete pipeline
            const pipelineResult = await this.scraperPipeline.processUrl(
              vehicleUrl.url,
              `<html><body><h1>${vehicleUrl.title}</h1><div class="price">$${vehicleUrl.price}</div></body></html>`
            );

            if (pipelineResult.success) {
              processedVehicles.push({
                url: vehicleUrl.url,
                data: pipelineResult.data,
                vehicleId: pipelineResult.vehicleId,
                qualityScore: pipelineResult.qualityScore
              });

              if (pipelineResult.vehicleId) {
                result.vehiclesSaved++;
              }

              // Detect additional opportunities from processed data
              if (pipelineResult.data?.extraction && pipelineResult.data?.validation) {
                const detectedOpportunities = opportunityDetector.analyzeOpportunities(
                  pipelineResult.data.extraction,
                  pipelineResult.data.validation
                );
                
                result.opportunities.push(...detectedOpportunities);
              }
            } else {
              result.errors.push(`Failed to process ${vehicleUrl.url}: ${pipelineResult.error}`);
            }

            processedCount++;
            
            // Delay between requests
            if (processedCount < urlsToProcess.length) {
              await this.delay(this.config.delayBetweenRequests);
            }

          } catch (processError) {
            result.errors.push(`Error processing ${vehicleUrl.url}: ${processError}`);
            console.error(`❌ Error processing ${vehicleUrl.url}:`, processError);
          }
        }

        result.processedUrls = processedCount;
        console.log(`✅ Processed ${processedCount} URLs, saved ${result.vehiclesSaved} vehicles`);
      }

      // Step 5: Filter and rank opportunities
      result.opportunities = this.filterOpportunitiesByThreshold(result.opportunities);
      result.opportunitiesFound = result.opportunities.length;

      result.success = true;
      result.processingTime = Date.now() - startTime;

      console.log(`🎉 Exploration pipeline completed in ${result.processingTime}ms`);
      console.log(`   - Discovered: ${result.discoveredUrls} URLs`);
      console.log(`   - Processed: ${result.processedUrls} URLs`);  
      console.log(`   - Saved: ${result.vehiclesSaved} vehicles`);
      console.log(`   - Opportunities: ${result.opportunitiesFound} found`);

      return result;

    } catch (error) {
      result.success = false;
      result.processingTime = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      console.error('❌ Exploration pipeline failed:', error);
      return result;
    }
  }

  /**
   * Prioritize URLs based on opportunity level
   */
  private prioritizeUrls(vehicleUrls: any[]): any[] {
    return vehicleUrls.sort((a, b) => {
      const opportunityOrder = { high: 3, medium: 2, low: 1 };
      return opportunityOrder[b.opportunity] - opportunityOrder[a.opportunity];
    });
  }

  /**
   * Filter opportunities by threshold
   */
  private filterOpportunitiesByThreshold(opportunities: Opportunity[]): Opportunity[] {
    const thresholdMap = {
      high: ['high'],
      medium: ['high', 'medium'],
      low: ['high', 'medium', 'low']
    };

    const allowedSeverities = thresholdMap[this.config.opportunityThreshold];
    return opportunities.filter(opp => allowedSeverities.includes(opp.severity));
  }

  /**
   * Process pagination URLs to discover more vehicles
   */
  async processPagination(paginationUrls: string[]): Promise<string[]> {
    const allVehicleUrls: string[] = [];
    
    for (const paginationUrl of paginationUrls.slice(0, 5)) { // Limit to 5 pages
      try {
        console.log(`📄 Exploring pagination: ${paginationUrl}`);
        
        const response = await fetch(paginationUrl);
        const htmlContent = await response.text();
        
        const explorationResponse = await localAgentService.explore(
          paginationUrl,
          htmlContent,
          'shallow'
        );

        if (explorationResponse.success) {
          const vehicleUrls = explorationResponse.data.vehicleUrls.map((v: any) => v.url);
          allVehicleUrls.push(...vehicleUrls);
        }

        await this.delay(2000); // Delay between pagination requests
        
      } catch (error) {
        console.error(`Error processing pagination ${paginationUrl}:`, error);
      }
    }

    return [...new Set(allVehicleUrls)]; // Remove duplicates
  }

  /**
   * Save exploration results to database
   */
  async saveExplorationResults(result: ExplorationResult): Promise<void> {
    if (!result.success || !this.config.saveToDatabase) return;

    try {
      // Create exploration record (you might want to add this table to your schema)
      const explorationRecord = {
        baseUrl: result.baseUrl,
        discoveredUrls: result.discoveredUrls,
        processedUrls: result.processedUrls,
        vehiclesSaved: result.vehiclesSaved,
        opportunitiesFound: result.opportunitiesFound,
        processingTime: result.processingTime,
        explorationData: JSON.stringify(result.explorationData),
        opportunities: JSON.stringify(result.opportunities),
        timestamp: new Date().toISOString()
      };

      console.log('💾 Exploration results saved to database');

    } catch (error) {
      console.error('Failed to save exploration results:', error);
    }
  }

  /**
   * Utility method for delays
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ExplorationPipeline;