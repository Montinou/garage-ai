/**
 * ExtractorAgent - Data extraction execution specialist
 * 
 * Responsibilities:
 * - Execute data extraction using multiple strategies
 * - Real-time adaptation to page changes
 * - Post-processing with AI enrichment
 * - Handle various data formats and structures
 * - Implement extraction patterns and fallbacks
 * - Performance optimization and parallel processing
 */

import { BaseAgent } from './base/BaseAgent';
import { 
  AgentJob, 
  AgentResult, 
  AgentConfig 
} from './types/AgentTypes';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../lib/config';
import { VehicleData } from '../scrapers/base-scraper';

interface ExtractorConfig extends AgentConfig {
  parallelExtractions: number;
  extractionTimeout: number;
  enableAIEnrichment: boolean;
  enableFallbacks: boolean;
  retryOnFailure: boolean;
  cacheExtractions: boolean;
  adaptationEnabled: boolean;
  qualityThreshold: number;
}

interface ExtractionJob {
  strategy: ExtractionStrategy;
  url: string;
  pageData?: any;
  context?: Record<string, any>;
  expectedFields: string[];
  quality?: QualityRequirements;
}

interface ExtractionStrategy {
  approach: 'css_selectors' | 'xpath' | 'text_patterns' | 'ai_guided' | 'hybrid';
  selectors: Record<string, string>;
  fallbackSelectors: Record<string, string[]>;
  preprocessing: PreprocessingStep[];
  postprocessing: PostprocessingStep[];
  validation: ValidationRule[];
  estimatedSuccessRate: number;
}

interface PreprocessingStep {
  type: 'remove_elements' | 'wait_for_load' | 'scroll' | 'click' | 'hover' | 'wait_for_selector';
  selector?: string;
  value?: string | number;
  condition?: string;
  timeout?: number;
}

interface PostprocessingStep {
  type: 'clean_text' | 'normalize_price' | 'extract_numbers' | 'geocode' | 'validate' | 'enrich_ai';
  field: string;
  parameters: Record<string, any>;
}

interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'pattern';
  condition: string | RegExp | number[];
}

interface QualityRequirements {
  requiredFields: string[];
  minQualityScore: number;
  maxEmptyFields: number;
  validatePrices: boolean;
  validateImages: boolean;
}

interface ExtractionResult {
  data: VehicleData[];
  metadata: ExtractionMetadata;
  quality: QualityMetrics;
  adaptations: AdaptationLog[];
  performance: PerformanceMetrics;
}

interface ExtractionMetadata {
  url: string;
  strategy: string;
  extractionTime: number;
  itemsExtracted: number;
  successRate: number;
  fallbacksUsed: string[];
  aiEnrichmentApplied: boolean;
}

interface QualityMetrics {
  overallScore: number;
  fieldCompleteness: Record<string, number>;
  dataValidation: Record<string, boolean>;
  confidence: number;
  issues: QualityIssue[];
}

interface QualityIssue {
  type: 'missing_field' | 'invalid_format' | 'suspicious_value' | 'low_confidence';
  field: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface AdaptationLog {
  timestamp: Date;
  trigger: string;
  adaptation: string;
  success: boolean;
  impact: string;
}

interface PerformanceMetrics {
  totalTime: number;
  pageLoadTime: number;
  extractionTime: number;
  postProcessingTime: number;
  itemsPerSecond: number;
  memoryUsage: number;
}

export class ExtractorAgent extends BaseAgent {
  private readonly extractorConfig: ExtractorConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private genAI: GoogleGenerativeAI;
  private model: any;
  private extractionPatterns: Map<string, ExtractionStrategy>;
  private performanceMetrics: Map<string, PerformanceMetrics[]>;

  constructor(config: AgentConfig = {}) {
    super('extractor', config);
    
    this.extractorConfig = {
      parallelExtractions: 3,
      extractionTimeout: 120000, // 2 minutes
      enableAIEnrichment: true,
      enableFallbacks: true,
      retryOnFailure: true,
      cacheExtractions: true,
      adaptationEnabled: true,
      qualityThreshold: 0.7,
      ...config
    };

    this.extractionPatterns = new Map();
    this.performanceMetrics = new Map();

    // Initialize Google AI
    const googleAIConfig = config.getGoogleAIConfig();
    this.genAI = new GoogleGenerativeAI(googleAIConfig.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  protected async onInitialize(): Promise<void> {
    await this.initializeBrowser();
    await this.loadExtractionPatterns();
    this.log('ExtractorAgent initialized successfully');
  }

  /**
   * Initialize Playwright browser
   */
  private async initializeBrowser(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      this.log('Browser initialized for extraction');
    } catch (error) {
      this.logError('Failed to initialize browser', error);
      throw error;
    }
  }

  /**
   * Load extraction patterns from memory
   */
  private async loadExtractionPatterns(): Promise<void> {
    try {
      const patterns = await this.getMemory('extraction_patterns');
      if (patterns && Array.isArray(patterns)) {
        for (const pattern of patterns) {
          this.extractionPatterns.set(pattern.key, pattern.strategy);
        }
        this.log(`Loaded ${patterns.length} extraction patterns`);
      }
    } catch (error) {
      this.logError('Failed to load extraction patterns', error);
    }
  }

  /**
   * Main execution method for extraction jobs
   */
  async execute(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    
    try {
      this.log(`Executing extraction job ${job.id}`, { 
        type: job.type, 
        priority: job.priority 
      });

      switch (job.type) {
        case 'extract_data':
          return await this.extractData(job);
        case 'extract_listing':
          return await this.extractListing(job);
        case 'extract_details':
          return await this.extractDetails(job);
        case 'adaptive_extract':
          return await this.adaptiveExtract(job);
        case 'parallel_extract':
          return await this.parallelExtract(job);
        case 'enrich_data':
          return await this.enrichData(job);
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (error) {
      this.logError(`Extraction job ${job.id} failed`, error);
      
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        warnings: ['Job execution failed']
      };
    }
  }

  /**
   * Extract data using provided strategy
   */
  private async extractData(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const extractionJob = job.payload as ExtractionJob;
    
    try {
      const page = await this.createPage();
      const result = await this.performExtraction(page, extractionJob);
      await page.close();
      
      return {
        success: result.quality.overallScore >= this.extractorConfig.qualityThreshold,
        data: result,
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          itemsExtracted: result.data.length,
          qualityScore: result.quality.overallScore,
          strategy: result.metadata.strategy,
          adaptations: result.adaptations.length
        }
      };
    } catch (error) {
      this.logError('Data extraction failed', error);
      throw error;
    }
  }

  /**
   * Extract vehicle listing data
   */
  private async extractListing(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { url, strategy, maxItems = 50 } = job.payload;
    
    try {
      const page = await this.createPage();
      await page.goto(url, { waitUntil: 'networkidle' });

      // Execute preprocessing steps
      if (strategy.preprocessing) {
        for (const step of strategy.preprocessing) {
          await this.executePreprocessingStep(page, step);
        }
      }

      // Extract listing items
      const listingData: VehicleData[] = [];
      const itemSelectors = this.getItemSelectors(strategy);
      
      for (const itemSelector of itemSelectors) {
        const items = await page.locator(itemSelector).all();
        
        for (let i = 0; i < Math.min(items.length, maxItems); i++) {
          try {
            const itemData = await this.extractItemData(items[i], strategy, url);
            if (itemData) {
              listingData.push(itemData);
            }
          } catch (itemError) {
            this.logError(`Failed to extract item ${i}`, itemError);
            continue;
          }
        }
        
        if (listingData.length >= maxItems) break;
      }

      // Post-process the data
      const processedData = await this.postProcessData(listingData, strategy);
      
      // Calculate quality metrics
      const quality = this.calculateQualityMetrics(processedData);
      
      await page.close();
      
      const result: ExtractionResult = {
        data: processedData,
        metadata: {
          url,
          strategy: strategy.approach,
          extractionTime: Date.now() - startTime,
          itemsExtracted: processedData.length,
          successRate: processedData.length / Math.max(1, maxItems),
          fallbacksUsed: [],
          aiEnrichmentApplied: this.extractorConfig.enableAIEnrichment
        },
        quality,
        adaptations: [],
        performance: {
          totalTime: Date.now() - startTime,
          pageLoadTime: 2000, // Estimated
          extractionTime: Date.now() - startTime - 2000,
          postProcessingTime: 500, // Estimated
          itemsPerSecond: processedData.length / ((Date.now() - startTime) / 1000),
          memoryUsage: 0 // TODO: Implement memory tracking
        }
      };

      return {
        success: quality.overallScore >= this.extractorConfig.qualityThreshold,
        data: result,
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          itemsExtracted: processedData.length,
          qualityScore: quality.overallScore
        }
      };
    } catch (error) {
      this.logError('Listing extraction failed', error);
      throw error;
    }
  }

  /**
   * Extract detailed vehicle information
   */
  private async extractDetails(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { url, strategy } = job.payload;
    
    try {
      const page = await this.createPage();
      await page.goto(url, { waitUntil: 'networkidle' });

      // Execute preprocessing
      if (strategy.preprocessing) {
        for (const step of strategy.preprocessing) {
          await this.executePreprocessingStep(page, step);
        }
      }

      // Extract detailed data
      const detailData = await this.extractDetailedItem(page, strategy, url);
      
      // Post-process
      const processedData = await this.postProcessData([detailData], strategy);
      
      await page.close();
      
      return {
        success: true,
        data: processedData[0] || null,
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          url,
          hasData: !!processedData[0]
        }
      };
    } catch (error) {
      this.logError('Detail extraction failed', error);
      throw error;
    }
  }

  /**
   * Perform adaptive extraction with real-time adjustments
   */
  private async adaptiveExtract(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const extractionJob = job.payload as ExtractionJob;
    const adaptations: AdaptationLog[] = [];
    
    try {
      const page = await this.createPage();
      let strategy = extractionJob.strategy;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const result = await this.performExtraction(page, { ...extractionJob, strategy });
          
          // Check if adaptation is needed
          if (result.quality.overallScore < this.extractorConfig.qualityThreshold && this.extractorConfig.adaptationEnabled) {
            const adaptedStrategy = await this.adaptStrategy(strategy, result, page);
            if (adaptedStrategy) {
              adaptations.push({
                timestamp: new Date(),
                trigger: `Low quality score: ${result.quality.overallScore}`,
                adaptation: 'Strategy adapted based on extraction results',
                success: true,
                impact: 'Improved selector specificity'
              });
              strategy = adaptedStrategy;
              attempts++;
              continue;
            }
          }
          
          // Success
          result.adaptations = adaptations;
          await page.close();
          
          return {
            success: result.quality.overallScore >= this.extractorConfig.qualityThreshold,
            data: result,
            executionTime: Date.now() - startTime,
            agentId: this.agentId,
            metadata: {
              adaptations: adaptations.length,
              finalQuality: result.quality.overallScore
            }
          };
        } catch (extractionError) {
          this.logError(`Extraction attempt ${attempts + 1} failed`, extractionError);
          attempts++;
          
          if (attempts >= maxAttempts) {
            throw extractionError;
          }
          
          // Try fallback strategy
          if (this.extractorConfig.enableFallbacks && extractionJob.strategy.fallbackSelectors) {
            strategy = this.createFallbackStrategy(strategy);
            adaptations.push({
              timestamp: new Date(),
              trigger: 'Extraction failure',
              adaptation: 'Switched to fallback selectors',
              success: true,
              impact: 'Using alternative element selectors'
            });
          }
        }
      }
      
      await page.close();
      throw new Error('All extraction attempts failed');
    } catch (error) {
      this.logError('Adaptive extraction failed', error);
      throw error;
    }
  }

  /**
   * Perform parallel extraction on multiple URLs
   */
  private async parallelExtract(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { urls, strategy, maxConcurrent = this.extractorConfig.parallelExtractions } = job.payload;
    
    try {
      const results: VehicleData[] = [];
      const errors: string[] = [];
      
      // Process URLs in batches
      for (let i = 0; i < urls.length; i += maxConcurrent) {
        const batch = urls.slice(i, i + maxConcurrent);
        const promises = batch.map(async (url: string) => {
          try {
            const page = await this.createPage();
            const extractionJob: ExtractionJob = {
              strategy,
              url,
              expectedFields: ['title', 'price', 'year', 'mileage']
            };
            
            const result = await this.performExtraction(page, extractionJob);
            await page.close();
            
            return result.data;
          } catch (error) {
            errors.push(`${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return [];
          }
        });
        
        const batchResults = await Promise.allSettled(promises);
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(...result.value);
          }
        }
      }
      
      return {
        success: results.length > 0,
        data: {
          data: results,
          totalItems: results.length,
          processedUrls: urls.length,
          errors
        },
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          parallelBatches: Math.ceil(urls.length / maxConcurrent),
          successRate: results.length / urls.length,
          errorCount: errors.length
        }
      };
    } catch (error) {
      this.logError('Parallel extraction failed', error);
      throw error;
    }
  }

  /**
   * Enrich extracted data with AI
   */
  private async enrichData(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { data, enrichmentType = 'complete' } = job.payload;
    
    try {
      if (!this.extractorConfig.enableAIEnrichment) {
        return {
          success: false,
          data: null,
          error: 'AI enrichment disabled',
          executionTime: Date.now() - startTime,
          agentId: this.agentId
        };
      }

      const enrichedData: VehicleData[] = [];
      
      for (const item of data) {
        try {
          const enriched = await this.enrichSingleItem(item, enrichmentType);
          enrichedData.push(enriched);
        } catch (enrichError) {
          this.logError('Failed to enrich item', enrichError);
          enrichedData.push(item); // Keep original if enrichment fails
        }
      }
      
      return {
        success: true,
        data: enrichedData,
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          originalCount: data.length,
          enrichedCount: enrichedData.length,
          enrichmentType
        }
      };
    } catch (error) {
      this.logError('Data enrichment failed', error);
      throw error;
    }
  }

  /**
   * Perform the actual extraction
   */
  private async performExtraction(page: Page, job: ExtractionJob): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    // Navigate to page
    await page.goto(job.url, { 
      waitUntil: 'networkidle',
      timeout: this.extractorConfig.extractionTimeout 
    });

    // Execute preprocessing steps
    if (job.strategy.preprocessing) {
      for (const step of job.strategy.preprocessing) {
        await this.executePreprocessingStep(page, step);
      }
    }

    // Extract data based on strategy
    let extractedData: VehicleData[] = [];
    
    switch (job.strategy.approach) {
      case 'css_selectors':
        extractedData = await this.extractWithCSSSelectors(page, job);
        break;
      case 'xpath':
        extractedData = await this.extractWithXPath(page, job);
        break;
      case 'text_patterns':
        extractedData = await this.extractWithTextPatterns(page, job);
        break;
      case 'ai_guided':
        extractedData = await this.extractWithAI(page, job);
        break;
      case 'hybrid':
        extractedData = await this.extractWithHybridApproach(page, job);
        break;
    }

    // Post-process data
    const processedData = await this.postProcessData(extractedData, job.strategy);

    // Calculate quality metrics
    const quality = this.calculateQualityMetrics(processedData, job.quality);

    return {
      data: processedData,
      metadata: {
        url: job.url,
        strategy: job.strategy.approach,
        extractionTime: Date.now() - startTime,
        itemsExtracted: processedData.length,
        successRate: processedData.length > 0 ? 1 : 0,
        fallbacksUsed: [],
        aiEnrichmentApplied: this.extractorConfig.enableAIEnrichment
      },
      quality,
      adaptations: [],
      performance: {
        totalTime: Date.now() - startTime,
        pageLoadTime: 2000,
        extractionTime: Date.now() - startTime - 2000,
        postProcessingTime: 0,
        itemsPerSecond: processedData.length / ((Date.now() - startTime) / 1000),
        memoryUsage: 0
      }
    };
  }

  /**
   * Extract data using CSS selectors
   */
  private async extractWithCSSSelectors(page: Page, job: ExtractionJob): Promise<VehicleData[]> {
    const results: VehicleData[] = [];
    const selectors = job.strategy.selectors;
    
    // Check if this is a listing page or detail page
    const itemSelector = selectors.itemContainer || '.item, .listing, .product, .vehicle';
    const items = await page.locator(itemSelector).all();
    
    if (items.length > 1) {
      // Multiple items - listing page
      for (const item of items) {
        const data = await this.extractItemDataFromElement(item, selectors, job.url);
        if (data) results.push(data);
      }
    } else {
      // Single item - detail page
      const data = await this.extractItemDataFromPage(page, selectors, job.url);
      if (data) results.push(data);
    }
    
    return results;
  }

  /**
   * Extract data using XPath
   */
  private async extractWithXPath(page: Page, job: ExtractionJob): Promise<VehicleData[]> {
    // TODO: Implement XPath extraction
    this.log('XPath extraction not fully implemented, falling back to CSS selectors');
    return await this.extractWithCSSSelectors(page, job);
  }

  /**
   * Extract data using text patterns
   */
  private async extractWithTextPatterns(page: Page, job: ExtractionJob): Promise<VehicleData[]> {
    const pageText = await page.textContent('body') || '';
    const results: VehicleData[] = [];
    
    // Define patterns for vehicle data
    const patterns = {
      price: /\$[\d,]+|\$\d+,\d{3}|\$\d+\.\d{3}/g,
      year: /\b(19|20)\d{2}\b/g,
      mileage: /(\d+(?:[.,]\d+)?)\s*(?:km|kilometers|kilómetros|miles)/gi,
      title: /\b(19|20)\d{2}\s+[\w\s]+\s+[\w\s]+/g
    };
    
    const extracted: Partial<VehicleData> = {
      sourceUrl: job.url,
      sourcePortal: new URL(job.url).hostname,
      imageUrls: []
    };
    
    // Extract using patterns
    const priceMatches = pageText.match(patterns.price);
    if (priceMatches && priceMatches.length > 0) {
      const priceStr = priceMatches[0];
      const numericPrice = parseFloat(priceStr.replace(/[^\d.]/g, ''));
      extracted.price = numericPrice;
      extracted.currency = 'USD'; // Default
    }
    
    const yearMatches = pageText.match(patterns.year);
    if (yearMatches && yearMatches.length > 0) {
      extracted.year = parseInt(yearMatches[0]);
    }
    
    const mileageMatches = pageText.match(patterns.mileage);
    if (mileageMatches && mileageMatches.length > 0) {
      const mileageStr = mileageMatches[0];
      const numericMileage = parseInt(mileageStr.replace(/[^\d]/g, ''));
      extracted.mileage = numericMileage;
    }
    
    const titleMatches = pageText.match(patterns.title);
    if (titleMatches && titleMatches.length > 0) {
      extracted.title = titleMatches[0];
    }
    
    if (extracted.title || extracted.price) {
      results.push(extracted as VehicleData);
    }
    
    return results;
  }

  /**
   * Extract data using AI guidance
   */
  private async extractWithAI(page: Page, job: ExtractionJob): Promise<VehicleData[]> {
    try {
      const pageContent = await page.content();
      const truncatedContent = pageContent.substring(0, 8000); // Limit for AI processing
      
      const prompt = `
        Extract vehicle information from this HTML content:
        
        ${truncatedContent}
        
        Return a JSON array of vehicle objects with these fields:
        - title: Vehicle title/name
        - price: Numeric price
        - currency: Currency code
        - year: Vehicle year
        - mileage: Mileage in km or miles
        - description: Description text
        - brand: Vehicle brand
        - model: Vehicle model
        - imageUrls: Array of image URLs
        
        Only include valid vehicle listings. Return empty array if no vehicles found.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse AI response
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const vehicles = JSON.parse(jsonMatch[0]);
          return vehicles.map((vehicle: any) => ({
            ...vehicle,
            sourceUrl: job.url,
            sourcePortal: new URL(job.url).hostname,
            imageUrls: vehicle.imageUrls || []
          }));
        }
      } catch (parseError) {
        this.logError('Failed to parse AI extraction response', parseError);
      }
      
      return [];
    } catch (error) {
      this.logError('AI extraction failed', error);
      return [];
    }
  }

  /**
   * Extract data using hybrid approach
   */
  private async extractWithHybridApproach(page: Page, job: ExtractionJob): Promise<VehicleData[]> {
    // Try CSS selectors first
    let results = await this.extractWithCSSSelectors(page, job);
    
    // If no results, try text patterns
    if (results.length === 0) {
      results = await this.extractWithTextPatterns(page, job);
    }
    
    // If still no results and AI is enabled, try AI extraction
    if (results.length === 0 && this.extractorConfig.enableAIEnrichment) {
      results = await this.extractWithAI(page, job);
    }
    
    return results;
  }

  /**
   * Execute preprocessing step
   */
  private async executePreprocessingStep(page: Page, step: PreprocessingStep): Promise<void> {
    try {
      switch (step.type) {
        case 'wait_for_load':
          await page.waitForTimeout(typeof step.value === 'number' ? step.value : 2000);
          break;
          
        case 'wait_for_selector':
          if (step.selector) {
            await page.waitForSelector(step.selector, { 
              timeout: step.timeout || 10000 
            });
          }
          break;
          
        case 'scroll':
          if (step.value === 'bottom') {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          } else {
            await page.evaluate((value) => window.scrollBy(0, value), step.value || 500);
          }
          await page.waitForTimeout(1000);
          break;
          
        case 'click':
          if (step.selector) {
            const element = page.locator(step.selector).first();
            if (await element.isVisible()) {
              await element.click();
              await page.waitForTimeout(2000);
            }
          }
          break;
          
        case 'hover':
          if (step.selector) {
            const element = page.locator(step.selector).first();
            if (await element.isVisible()) {
              await element.hover();
              await page.waitForTimeout(1000);
            }
          }
          break;
          
        case 'remove_elements':
          if (step.selector) {
            await page.evaluate((selector) => {
              const elements = document.querySelectorAll(selector);
              elements.forEach(el => el.remove());
            }, step.selector);
          }
          break;
      }
    } catch (error) {
      this.logError(`Preprocessing step ${step.type} failed`, error);
    }
  }

  /**
   * Extract item data from a page element
   */
  private async extractItemDataFromElement(
    element: any, 
    selectors: Record<string, string>, 
    sourceUrl: string
  ): Promise<VehicleData | null> {
    try {
      const data: Partial<VehicleData> = {
        sourceUrl,
        sourcePortal: new URL(sourceUrl).hostname,
        imageUrls: []
      };

      // Extract each field using selectors
      for (const [field, selector] of Object.entries(selectors)) {
        if (field === 'itemContainer') continue;
        
        try {
          const fieldElement = element.locator(selector).first();
          if (await fieldElement.isVisible()) {
            let value = await fieldElement.textContent();
            
            if (field === 'imageUrls') {
              // Handle image URLs
              const src = await fieldElement.getAttribute('src');
              if (src) {
                data.imageUrls = [src];
              }
            } else if (field === 'price' && value) {
              // Parse price
              const priceInfo = this.parsePrice(value);
              data.price = priceInfo.price;
              data.currency = priceInfo.currency;
            } else if (field === 'year' && value) {
              // Parse year
              const yearMatch = value.match(/\b(19|20)\d{2}\b/);
              if (yearMatch) {
                data.year = parseInt(yearMatch[0]);
              }
            } else if (field === 'mileage' && value) {
              // Parse mileage
              const mileageMatch = value.match(/(\d+(?:[.,]\d+)?)/);
              if (mileageMatch) {
                data.mileage = parseInt(mileageMatch[1].replace(/[.,]/g, ''));
              }
            } else if (value) {
              // Store as-is for other fields
              (data as any)[field] = value.trim();
            }
          }
        } catch (fieldError) {
          this.logError(`Failed to extract field ${field}`, fieldError);
        }
      }

      // Validate minimum required fields
      if (data.title || data.price) {
        return data as VehicleData;
      }
      
      return null;
    } catch (error) {
      this.logError('Failed to extract item data from element', error);
      return null;
    }
  }

  /**
   * Extract item data from entire page
   */
  private async extractItemDataFromPage(
    page: Page, 
    selectors: Record<string, string>, 
    sourceUrl: string
  ): Promise<VehicleData | null> {
    try {
      const data: Partial<VehicleData> = {
        sourceUrl,
        sourcePortal: new URL(sourceUrl).hostname,
        imageUrls: []
      };

      // Extract each field using selectors
      for (const [field, selector] of Object.entries(selectors)) {
        if (field === 'itemContainer') continue;
        
        try {
          if (field === 'imageUrls') {
            // Handle multiple images
            const images = await page.locator(selector).all();
            const urls: string[] = [];
            for (const img of images) {
              const src = await img.getAttribute('src');
              if (src) urls.push(src);
            }
            data.imageUrls = urls;
          } else {
            const element = page.locator(selector).first();
            if (await element.isVisible()) {
              const value = await element.textContent();
              
              if (field === 'price' && value) {
                const priceInfo = this.parsePrice(value);
                data.price = priceInfo.price;
                data.currency = priceInfo.currency;
              } else if (field === 'year' && value) {
                const yearMatch = value.match(/\b(19|20)\d{2}\b/);
                if (yearMatch) {
                  data.year = parseInt(yearMatch[0]);
                }
              } else if (field === 'mileage' && value) {
                const mileageMatch = value.match(/(\d+(?:[.,]\d+)?)/);
                if (mileageMatch) {
                  data.mileage = parseInt(mileageMatch[1].replace(/[.,]/g, ''));
                }
              } else if (value) {
                (data as any)[field] = value.trim();
              }
            }
          }
        } catch (fieldError) {
          this.logError(`Failed to extract field ${field}`, fieldError);
        }
      }

      if (data.title || data.price) {
        return data as VehicleData;
      }
      
      return null;
    } catch (error) {
      this.logError('Failed to extract item data from page', error);
      return null;
    }
  }

  /**
   * Parse price from text
   */
  private parsePrice(priceText: string): { price: number; currency: string } {
    const cleanPrice = priceText.replace(/[^\d.,\$€£]/g, '');
    
    let currency = 'USD';
    if (priceText.includes('€') || priceText.toLowerCase().includes('eur')) currency = 'EUR';
    if (priceText.includes('£') || priceText.toLowerCase().includes('gbp')) currency = 'GBP';
    
    const numericPrice = parseFloat(cleanPrice.replace(/[^\d.]/g, ''));
    
    return {
      price: isNaN(numericPrice) ? 0 : numericPrice,
      currency
    };
  }

  /**
   * Post-process extracted data
   */
  private async postProcessData(data: VehicleData[], strategy: ExtractionStrategy): Promise<VehicleData[]> {
    if (!strategy.postprocessing || strategy.postprocessing.length === 0) {
      return data;
    }

    const processedData: VehicleData[] = [];
    
    for (const item of data) {
      let processedItem = { ...item };
      
      for (const step of strategy.postprocessing) {
        try {
          processedItem = await this.applyPostProcessingStep(processedItem, step);
        } catch (error) {
          this.logError(`Post-processing step ${step.type} failed`, error);
        }
      }
      
      processedData.push(processedItem);
    }
    
    return processedData;
  }

  /**
   * Apply single post-processing step
   */
  private async applyPostProcessingStep(
    item: VehicleData, 
    step: PostprocessingStep
  ): Promise<VehicleData> {
    const processed = { ...item };
    const fieldValue = (processed as any)[step.field];
    
    if (!fieldValue) return processed;
    
    switch (step.type) {
      case 'clean_text':
        (processed as any)[step.field] = this.cleanText(fieldValue);
        break;
        
      case 'normalize_price':
        if (step.field === 'price' && typeof fieldValue === 'string') {
          const priceInfo = this.parsePrice(fieldValue);
          processed.price = priceInfo.price;
          processed.currency = priceInfo.currency;
        }
        break;
        
      case 'extract_numbers':
        const numbers = fieldValue.match(/\d+/g);
        if (numbers) {
          (processed as any)[step.field] = parseInt(numbers[0]);
        }
        break;
        
      case 'enrich_ai':
        if (this.extractorConfig.enableAIEnrichment) {
          // TODO: Implement AI enrichment for specific fields
        }
        break;
    }
    
    return processed;
  }

  /**
   * Clean text content
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]/g, ' ')
      .trim();
  }

  /**
   * Calculate quality metrics
   */
  private calculateQualityMetrics(
    data: VehicleData[], 
    requirements?: QualityRequirements
  ): QualityMetrics {
    if (data.length === 0) {
      return {
        overallScore: 0,
        fieldCompleteness: {},
        dataValidation: {},
        confidence: 0,
        issues: [{ type: 'missing_field', field: 'all', description: 'No data extracted', severity: 'high' }]
      };
    }

    const issues: QualityIssue[] = [];
    const fieldCompleteness: Record<string, number> = {};
    const dataValidation: Record<string, boolean> = {};
    
    // Required fields for vehicle data
    const requiredFields = requirements?.requiredFields || ['title', 'price'];
    const allFields = ['title', 'description', 'price', 'currency', 'year', 'mileage', 'brand', 'model'];
    
    // Calculate field completeness
    for (const field of allFields) {
      const completeCount = data.filter(item => (item as any)[field] && (item as any)[field] !== '').length;
      fieldCompleteness[field] = completeCount / data.length;
      
      if (requiredFields.includes(field) && fieldCompleteness[field] < 0.5) {
        issues.push({
          type: 'missing_field',
          field,
          description: `${field} missing in more than 50% of items`,
          severity: 'high'
        });
      }
    }
    
    // Validate data formats
    let validPrices = 0;
    let validYears = 0;
    
    for (const item of data) {
      // Price validation
      if (item.price && item.price > 0 && item.price < 10000000) {
        validPrices++;
      }
      
      // Year validation
      if (item.year && item.year >= 1900 && item.year <= new Date().getFullYear() + 1) {
        validYears++;
      }
    }
    
    dataValidation.prices = validPrices / data.length > 0.8;
    dataValidation.years = validYears / data.length > 0.8;
    
    // Calculate overall score
    const completenessScore = Object.values(fieldCompleteness).reduce((sum, val) => sum + val, 0) / allFields.length;
    const validationScore = Object.values(dataValidation).filter(Boolean).length / Object.keys(dataValidation).length;
    const overallScore = (completenessScore * 0.7) + (validationScore * 0.3);
    
    return {
      overallScore,
      fieldCompleteness,
      dataValidation,
      confidence: overallScore,
      issues
    };
  }

  /**
   * Get item selectors from strategy
   */
  private getItemSelectors(strategy: ExtractionStrategy): string[] {
    const itemSelector = strategy.selectors.itemContainer;
    if (itemSelector) {
      return [itemSelector];
    }
    
    // Default item selectors
    return ['.item', '.listing', '.product', '.vehicle', '.car', '[data-item]'];
  }

  /**
   * Extract item data using selectors
   */
  private async extractItemData(element: any, strategy: ExtractionStrategy, sourceUrl: string): Promise<VehicleData | null> {
    return await this.extractItemDataFromElement(element, strategy.selectors, sourceUrl);
  }

  /**
   * Extract detailed item data
   */
  private async extractDetailedItem(page: Page, strategy: ExtractionStrategy, sourceUrl: string): Promise<VehicleData> {
    const data = await this.extractItemDataFromPage(page, strategy.selectors, sourceUrl);
    return data || {
      title: '',
      description: '',
      price: 0,
      currency: 'USD',
      imageUrls: [],
      sourceUrl,
      sourcePortal: new URL(sourceUrl).hostname
    };
  }

  /**
   * Adapt strategy based on extraction results
   */
  private async adaptStrategy(
    strategy: ExtractionStrategy, 
    result: ExtractionResult, 
    page: Page
  ): Promise<ExtractionStrategy | null> {
    // Simple adaptation: try fallback selectors for missing fields
    const adaptedStrategy = { ...strategy };
    let hasChanges = false;
    
    for (const [field, completeness] of Object.entries(result.quality.fieldCompleteness)) {
      if (completeness < 0.5 && strategy.fallbackSelectors[field]) {
        // Try first fallback selector
        const fallback = strategy.fallbackSelectors[field][0];
        if (fallback && fallback !== strategy.selectors[field]) {
          adaptedStrategy.selectors[field] = fallback;
          hasChanges = true;
        }
      }
    }
    
    return hasChanges ? adaptedStrategy : null;
  }

  /**
   * Create fallback strategy
   */
  private createFallbackStrategy(strategy: ExtractionStrategy): ExtractionStrategy {
    const fallbackStrategy = { ...strategy };
    
    // Use fallback selectors
    for (const [field, fallbacks] of Object.entries(strategy.fallbackSelectors)) {
      if (fallbacks.length > 0) {
        fallbackStrategy.selectors[field] = fallbacks[0];
      }
    }
    
    return fallbackStrategy;
  }

  /**
   * Enrich single item with AI
   */
  private async enrichSingleItem(item: VehicleData, enrichmentType: string): Promise<VehicleData> {
    try {
      const prompt = `
        Enrich this vehicle data:
        
        Title: ${item.title}
        Description: ${item.description}
        Price: ${item.price}
        Year: ${item.year}
        Mileage: ${item.mileage}
        
        Provide additional information like:
        - Brand and model if not specified
        - Engine details if mentioned in description
        - Color if mentioned
        - Condition assessment
        - Location details if available
        
        Return a JSON object with the enriched data.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse AI response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const enrichedData = JSON.parse(jsonMatch[0]);
          return { ...item, ...enrichedData };
        }
      } catch (parseError) {
        this.logError('Failed to parse AI enrichment response', parseError);
      }
      
      return item;
    } catch (error) {
      this.logError('AI enrichment failed', error);
      return item;
    }
  }

  /**
   * Create a new page for extraction
   */
  private async createPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    const page = await this.context.newPage();
    
    // Set up request interception for performance
    await page.route('**/*', (route) => {
      const request = route.request();
      const resourceType = request.resourceType();
      
      // Block unnecessary resources
      if (['image', 'media', 'font'].includes(resourceType)) {
        route.abort();
        return;
      }
      
      route.continue();
    });

    return page;
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      await super.cleanup();
      this.log('ExtractorAgent cleanup completed');
    } catch (error) {
      this.logError('ExtractorAgent cleanup failed', error);
    }
  }
}

export default ExtractorAgent;