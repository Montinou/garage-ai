/**
 * Automated Scraping Pipeline with Local AI Agents
 * Integrates scrapers with analyze->extract->validate pipeline
 */

import { localAgentService } from './agents/local-agent-service';
import { db } from './neon';
import { vehicles, brands, models, images } from './schema';
import { eq, and } from 'drizzle-orm';
import type { VehicleData } from '../scrapers/base-scraper';

export interface PipelineConfig {
  batchSize?: number;
  delayBetweenBatches?: number;
  retryAttempts?: number;
  qualityThreshold?: number;
  saveToDatabase?: boolean;
  validateBeforeSaving?: boolean;
}

export interface PipelineResult {
  success: boolean;
  totalProcessed: number;
  totalSaved: number;
  totalSkipped: number;
  totalErrors: number;
  processingTime: number;
  results: Array<{
    url: string;
    success: boolean;
    vehicleId?: string;
    qualityScore?: number;
    error?: string;
  }>;
}

class ScraperPipeline {
  private config: Required<PipelineConfig>;

  constructor(config: PipelineConfig = {}) {
    this.config = {
      batchSize: 10,
      delayBetweenBatches: 2000,
      retryAttempts: 3,
      qualityThreshold: 70,
      saveToDatabase: true,
      validateBeforeSaving: true,
      ...config
    };
  }

  /**
   * Process a single URL through the complete pipeline
   */
  async processUrl(url: string, htmlContent?: string): Promise<{
    success: boolean;
    vehicleId?: string;
    qualityScore?: number;
    data?: any;
    error?: string;
  }> {
    try {
      console.log(`🔄 Processing URL: ${url}`);

      // If no HTML content provided, fetch it (simplified for demo)
      if (!htmlContent) {
        htmlContent = `<html><body><p>Placeholder content for ${url}</p></body></html>`;
      }

      // Run the complete AI pipeline
      const pipelineResult = await localAgentService.runPipeline(url, htmlContent);
      
      if (!pipelineResult.success) {
        throw new Error(pipelineResult.error || 'Pipeline failed');
      }

      const { analysis, extraction, validation } = pipelineResult.data!;
      
      console.log(`✅ AI Pipeline completed for ${url}`);
      console.log(`   - Analysis confidence: ${analysis.confidence}`);
      console.log(`   - Quality score: ${validation.puntuacionCalidad}`);
      console.log(`   - Valid: ${validation.esValido}`);

      // Check quality threshold
      if (this.config.validateBeforeSaving && validation.puntuacionCalidad < this.config.qualityThreshold) {
        console.log(`⚠️  Quality score ${validation.puntuacionCalidad} below threshold ${this.config.qualityThreshold}, skipping save`);
        return {
          success: true,
          qualityScore: validation.puntuacionCalidad,
          data: { analysis, extraction, validation },
          error: 'Quality score below threshold'
        };
      }

      let vehicleId: string | undefined;

      // Save to database if enabled
      if (this.config.saveToDatabase && validation.esValido) {
        vehicleId = await this.saveVehicleToDatabase(extraction, url, {
          analysis,
          validation,
          aiProcessingTime: pipelineResult.processingTime
        });
        
        console.log(`💾 Saved vehicle to database with ID: ${vehicleId}`);
      }

      return {
        success: true,
        vehicleId,
        qualityScore: validation.puntuacionCalidad,
        data: { analysis, extraction, validation }
      };

    } catch (error) {
      console.error(`❌ Error processing ${url}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process multiple URLs in batches
   */
  async processBatch(urls: string[]): Promise<PipelineResult> {
    const startTime = Date.now();
    const results: PipelineResult['results'] = [];
    let totalSaved = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    console.log(`🚀 Starting batch processing of ${urls.length} URLs`);

    // Process URLs in batches
    for (let i = 0; i < urls.length; i += this.config.batchSize) {
      const batch = urls.slice(i, i + this.config.batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i / this.config.batchSize) + 1} (${batch.length} URLs)`);

      // Process batch concurrently
      const batchPromises = batch.map(async (url) => {
        let attempts = 0;
        let lastError: string = '';

        while (attempts < this.config.retryAttempts) {
          attempts++;
          try {
            const result = await this.processUrl(url);
            
            if (result.success) {
              if (result.vehicleId) {
                totalSaved++;
              } else if (result.error?.includes('threshold')) {
                totalSkipped++;
              }
            } else {
              totalErrors++;
            }

            return {
              url,
              success: result.success,
              vehicleId: result.vehicleId,
              qualityScore: result.qualityScore,
              error: result.error
            };

          } catch (error) {
            lastError = error instanceof Error ? error.message : 'Unknown error';
            if (attempts < this.config.retryAttempts) {
              console.log(`⚠️  Attempt ${attempts} failed for ${url}, retrying...`);
              await this.delay(1000 * attempts); // Exponential backoff
            }
          }
        }

        totalErrors++;
        return {
          url,
          success: false,
          error: `Failed after ${this.config.retryAttempts} attempts: ${lastError}`
        };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Delay between batches
      if (i + this.config.batchSize < urls.length) {
        console.log(`😴 Waiting ${this.config.delayBetweenBatches}ms before next batch`);
        await this.delay(this.config.delayBetweenBatches);
      }
    }

    const processingTime = Date.now() - startTime;

    console.log(`🎉 Batch processing completed in ${processingTime}ms`);
    console.log(`   - Total processed: ${urls.length}`);
    console.log(`   - Total saved: ${totalSaved}`);
    console.log(`   - Total skipped: ${totalSkipped}`);
    console.log(`   - Total errors: ${totalErrors}`);

    return {
      success: true,
      totalProcessed: urls.length,
      totalSaved,
      totalSkipped,
      totalErrors,
      processingTime,
      results
    };
  }

  /**
   * Save extracted vehicle data to database
   */
  private async saveVehicleToDatabase(
    extraction: any,
    sourceUrl: string,
    metadata: any
  ): Promise<string> {
    try {
      // Find or create brand
      let brandId: number | undefined;
      if (extraction.marca) {
        const existingBrand = await db
          .select()
          .from(brands)
          .where(eq(brands.name, extraction.marca))
          .limit(1);

        if (existingBrand.length > 0) {
          brandId = existingBrand[0].id;
        } else {
          const [newBrand] = await db
            .insert(brands)
            .values({ name: extraction.marca })
            .returning({ id: brands.id });
          brandId = newBrand.id;
        }
      }

      // Find or create model
      let modelId: number | undefined;
      if (extraction.modelo && brandId) {
        const existingModel = await db
          .select()
          .from(models)
          .where(and(
            eq(models.name, extraction.modelo),
            eq(models.brandId, brandId)
          ))
          .limit(1);

        if (existingModel.length > 0) {
          modelId = existingModel[0].id;
        } else {
          const [newModel] = await db
            .insert(models)
            .values({ 
              name: extraction.modelo,
              brandId: brandId
            })
            .returning({ id: models.id });
          modelId = newModel.id;
        }
      }

      // Create vehicle record
      const vehicleData = {
        title: `${extraction.marca || ''} ${extraction.modelo || ''} ${extraction.año || ''}`.trim(),
        description: extraction.descripcion || '',
        price: extraction.precio?.toString() || '0',
        currency: 'MXN', // Default to Mexican Pesos
        year: extraction.año || null,
        mileage: extraction.kilometraje || null,
        brandId: brandId || null,
        modelId: modelId || null,
        condition: extraction.condicion || null,
        locationCity: extraction.ubicacion?.split(',')[0]?.trim() || null,
        locationState: extraction.ubicacion?.split(',')[1]?.trim() || null,
        locationCountry: 'Mexico', // Default
        vin: extraction.vin || null,
        sellerName: extraction.vendedor || null,
        sourceUrl: sourceUrl,
        sourcePortal: new URL(sourceUrl).hostname,
        aiAnalysisSummary: JSON.stringify({
          qualityScore: metadata.validation.puntuacionCalidad,
          confidence: metadata.analysis.confidence,
          processingTime: metadata.aiProcessingTime,
          challenges: metadata.analysis.challenges,
          recommendations: metadata.validation.recomendaciones
        })
      };

      const [vehicle] = await db
        .insert(vehicles)
        .values(vehicleData)
        .returning({ id: vehicles.id });

      // Save images if any
      if (extraction.imagenes && extraction.imagenes.length > 0) {
        const imageRecords = extraction.imagenes.map((imageUrl: string, index: number) => ({
          vehicleId: vehicle.id,
          imageUrl: imageUrl,
          imageOrder: index,
          isPrimary: index === 0
        }));

        await db.insert(images).values(imageRecords);
      }

      return vehicle.id;

    } catch (error) {
      console.error('Database save error:', error);
      throw new Error(`Failed to save to database: ${error}`);
    }
  }

  /**
   * Utility method for delays
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { ScraperPipeline };
export default ScraperPipeline;