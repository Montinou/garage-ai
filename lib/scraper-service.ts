/**
 * Vehicle Scraper Service - Implementation of task-plan.xml specifications
 * Implements agent-based scraping with politeness rules, concurrency limits, and validation
 */

import { z } from 'zod';

// Environment configuration from task-plan.xml
export const ScraperConfig = {
  CONCURRENCY: parseInt(process.env.SCRAPER_CONCURRENCY || '3'),
  USER_AGENT: process.env.SCRAPER_USER_AGENT || 'GarageAIBot/1.0 (+https://ai-garage.vercel.app)',
  PROXY_URL: process.env.PROXY_URL || '',
  MAX_PAGES_PER_RUN: parseInt(process.env.MAX_PAGES_PER_RUN || '10'),
  MAX_NEW_ITEMS_PER_RUN: parseInt(process.env.MAX_NEW_ITEMS_PER_RUN || '200'),
  REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS || '20000'),
};

// Listing schema for normalization (from task-plan.xml)
const ListingSchema = z.object({
  price: z.number().positive(),
  currency: z.string().default('USD'),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  make: z.string().min(1),
  model: z.string().min(1),
  trim: z.string().optional(),
  mileage: z.number().nonnegative().optional(),
  location: z.string().optional(),
  photos: z.array(z.string().url()).default([]),
  postedAt: z.string().datetime().optional(),
  scrapedAt: z.string().datetime().default(() => new Date().toISOString()),
  canonicalUrl: z.string().url(),
  vin: z.string().optional(),
  externalId: z.string().optional(),
  rawSnapshot: z.record(z.unknown()).optional(),
});

export type Listing = z.infer<typeof ListingSchema>;

// Opportunity schema
const OpportunitySchema = z.object({
  listing: ListingSchema,
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  estimatedMarketValue: z.number().positive().optional(),
  priceAnalysis: z.object({
    belowMarket: z.boolean(),
    percentageDiff: z.number(),
  }).optional(),
});

export type Opportunity = z.infer<typeof OpportunitySchema>;

// Source configuration interface
export interface SourceConfig {
  id: string;
  seedUrls: string[];
  explorePatterns: {
    allow: string[];
    deny: string[];
  };
  listingUrlPattern: string;
  dedupeKey: string; // 'canonicalUrl|vin|externalId'
}

// Scraper statistics
export interface ScraperStats {
  pages: number;
  found: number;
  upserts: number;
  duplicates: number;
  errors: number;
  validationFailures: number;
}

// Rate limiting helper
class RateLimiter {
  private lastRequest = 0;
  private readonly minDelay: number;
  private readonly maxDelay: number;

  constructor(minDelayMs = 750, maxDelayMs = 2500) {
    this.minDelay = minDelayMs;
    this.maxDelay = maxDelayMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    
    // Random delay with jitter for politeness
    const delay = this.minDelay + Math.random() * (this.maxDelay - this.minDelay);
    
    if (elapsed < delay) {
      const waitTime = delay - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequest = Date.now();
  }
}

// URL pattern matching helper
class URLMatcher {
  static matches(url: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      const regex = new RegExp(pattern);
      return regex.test(url);
    });
  }

  static isAllowed(url: string, allowPatterns: string[], denyPatterns: string[]): boolean {
    // First check deny patterns
    if (this.matches(url, denyPatterns)) {
      return false;
    }
    // Then check allow patterns
    return this.matches(url, allowPatterns);
  }
}

// Main scraper service
export class VehicleScraperService {
  private rateLimiter = new RateLimiter();
  private stats: ScraperStats = {
    pages: 0,
    found: 0,
    upserts: 0,
    duplicates: 0,
    errors: 0,
    validationFailures: 0,
  };

  async scrapeSource(source: SourceConfig, options: { seedUrls?: string[] } = {}): Promise<{
    stats: ScraperStats;
    durationMs: number;
  }> {
    const startTime = Date.now();
    const seedUrls = options.seedUrls || source.seedUrls;
    
    console.log(`[scraper] Starting source ${source.id} with ${seedUrls.length} seed URLs`);
    
    // Reset stats for this run
    this.stats = {
      pages: 0,
      found: 0,
      upserts: 0,
      duplicates: 0,
      errors: 0,
      validationFailures: 0,
    };

    // Process seed URLs with concurrency control
    const semaphore = new Semaphore(ScraperConfig.CONCURRENCY);
    const promises = seedUrls.map(async (seedUrl) => {
      return semaphore.acquire(async () => {
        try {
          await this.processSeedUrl(seedUrl, source);
        } catch (error) {
          console.error(`[scraper] Error processing seed URL ${seedUrl}:`, error);
          this.stats.errors++;
        }
      });
    });

    await Promise.allSettled(promises);

    const durationMs = Date.now() - startTime;
    console.log(`[scraper] Completed source ${source.id} in ${durationMs}ms`, this.stats);

    return {
      stats: { ...this.stats },
      durationMs,
    };
  }

  private async processSeedUrl(seedUrl: string, source: SourceConfig): Promise<void> {
    let currentPage = 1;
    let foundNewItems = 0;
    let currentUrl = seedUrl;

    while (currentPage <= ScraperConfig.MAX_PAGES_PER_RUN && foundNewItems < ScraperConfig.MAX_NEW_ITEMS_PER_RUN) {
      try {
        await this.rateLimiter.waitIfNeeded();
        
        console.log(`[scraper] Processing page ${currentPage} of ${seedUrl}`);
        
        const pageContent = await this.fetchPage(currentUrl);
        if (!pageContent) {
          break;
        }

        this.stats.pages++;

        // Extract listing URLs from page
        const listingUrls = this.extractListingUrls(pageContent, source);
        
        // Process each listing URL
        for (const listingUrl of listingUrls) {
          if (foundNewItems >= ScraperConfig.MAX_NEW_ITEMS_PER_RUN) {
            break;
          }

          try {
            await this.rateLimiter.waitIfNeeded();
            const listing = await this.extractListing(listingUrl, source);
            
            if (listing) {
              // Validate listing
              const validationResult = ListingSchema.safeParse(listing);
              if (validationResult.success) {
                // Check for duplicates and save
                const isDuplicate = await this.checkDuplicate(validationResult.data, source);
                if (!isDuplicate) {
                  await this.saveListing(validationResult.data, source);
                  this.stats.upserts++;
                  foundNewItems++;
                } else {
                  this.stats.duplicates++;
                }
                this.stats.found++;
              } else {
                console.warn(`[scraper] Validation failed for ${listingUrl}:`, validationResult.error);
                this.stats.validationFailures++;
              }
            }
          } catch (error) {
            console.error(`[scraper] Error processing listing ${listingUrl}:`, error);
            this.stats.errors++;
          }
        }

        // Find next page URL
        const nextPageUrl = this.findNextPageUrl(pageContent, currentUrl, currentPage);
        if (!nextPageUrl) {
          break;
        }

        currentUrl = nextPageUrl;
        currentPage++;

      } catch (error) {
        console.error(`[scraper] Error processing page ${currentPage} of ${seedUrl}:`, error);
        this.stats.errors++;
        break;
      }
    }
  }

  private async fetchPage(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ScraperConfig.REQUEST_TIMEOUT_MS);

      const response = await fetch(url, {
        headers: {
          'User-Agent': ScraperConfig.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error(`[scraper] Failed to fetch ${url}:`, error);
      return null;
    }
  }

  private extractListingUrls(pageContent: string, source: SourceConfig): string[] {
    // Simple regex-based URL extraction
    // In a real implementation, this would use proper HTML parsing
    const urlRegex = new RegExp(source.listingUrlPattern, 'g');
    const matches = pageContent.match(urlRegex) || [];
    
    return matches.filter(url => 
      URLMatcher.isAllowed(url, source.explorePatterns.allow, source.explorePatterns.deny)
    );
  }

  private async extractListing(url: string, source: SourceConfig): Promise<Partial<Listing> | null> {
    const pageContent = await this.fetchPage(url);
    if (!pageContent) {
      return null;
    }

    // This is a simplified extraction - in reality, you'd use specialized extractors
    // or AI-based extraction for each marketplace
    try {
      // Basic extraction patterns - would be marketplace-specific
      const priceMatch = pageContent.match(/\$([0-9,]+)/);
      const yearMatch = pageContent.match(/\b(19|20)\d{2}\b/);
      const makeMatch = pageContent.match(/\b(Toyota|Ford|Honda|BMW|Mercedes|Audi|Volkswagen|Nissan|Hyundai|Kia)\b/i);
      
      if (!priceMatch || !yearMatch || !makeMatch) {
        return null;
      }

      return {
        price: parseInt(priceMatch[1].replace(/,/g, '')),
        currency: 'USD',
        year: parseInt(yearMatch[0]),
        make: makeMatch[0],
        model: 'Unknown', // Would extract from page
        canonicalUrl: url,
        scrapedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[scraper] Failed to extract listing from ${url}:`, error);
      return null;
    }
  }

  private findNextPageUrl(pageContent: string, currentUrl: string, currentPage: number): string | null {
    // Simple pagination detection - would be marketplace-specific
    const nextPagePattern = /href="([^"]*(?:page|p)=(\d+)[^"]*)"/gi;
    const matches = [...pageContent.matchAll(nextPagePattern)];
    
    for (const match of matches) {
      const pageNum = parseInt(match[2]);
      if (pageNum === currentPage + 1) {
        const url = new URL(match[1], currentUrl);
        return url.toString();
      }
    }
    
    return null;
  }

  private async checkDuplicate(listing: Listing, source: SourceConfig): Promise<boolean> {
    // In a real implementation, this would check the database
    // For now, we'll assume no duplicates
    return false;
  }

  private async saveListing(listing: Listing, source: SourceConfig): Promise<void> {
    // In a real implementation, this would save to the database
    console.log(`[scraper] Would save listing: ${listing.make} ${listing.model} ${listing.year} - $${listing.price}`);
  }
}

// Semaphore for concurrency control
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForPermit();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private async waitForPermit(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

// Default source configurations (from task-plan.xml)
export const DefaultSources: Record<string, SourceConfig> = {
  marketplaceA: {
    id: 'marketplaceA',
    seedUrls: [
      'https://exampleA.com/search?make=toyota&model=corolla',
      'https://exampleA.com/search?make=ford&model=mustang',
    ],
    explorePatterns: {
      allow: [
        '^https://exampleA\\.com/search',
        '^https://exampleA\\.com/listing/',
      ],
      deny: [
        '\\?(utm_|fbclid|gclid)',
        '\\.(png|jpe?g|gif|svg|ico)$',
        '^mailto:|^tel:',
      ],
    },
    listingUrlPattern: '^https://exampleA\\.com/listing/[^/?#]+',
    dedupeKey: 'canonicalUrl|vin|externalId',
  },
  marketplaceB: {
    id: 'marketplaceB',
    seedUrls: [
      'https://exampleB.com/cars?sort=newest',
    ],
    explorePatterns: {
      allow: [
        '^https://exampleB\\.com/cars',
        '^https://exampleB\\.com/vehicles/',
      ],
      deny: [
        '\\?(utm_|fbclid|gclid)',
        '\\.(png|jpe?g|gif|svg|ico)$',
        '^mailto:|^tel:',
      ],
    },
    listingUrlPattern: '^https://exampleB\\.com/vehicles/[^/?#]+',
    dedupeKey: 'canonicalUrl|vin|externalId',
  },
};