/**
 * Base interface and types for vehicle scrapers
 */

export interface VehicleData {
  title: string;
  description: string;
  price: number;
  currency: string;
  year?: number;
  mileage?: number;
  engineSize?: number;
  horsepower?: number;
  brand?: string;
  model?: string;
  color?: string;
  condition?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  vin?: string;
  licensePlate?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  imageUrls: string[];
  sourceUrl: string;
  sourcePortal: string;
}

export interface ScraperConfig {
  maxPages?: number;
  delay?: number;
  timeout?: number;
  retries?: number;
}

export interface ScraperResult {
  success: boolean;
  data: VehicleData[];
  errors: string[];
  totalScraped: number;
  timeElapsed: number;
}

export abstract class BaseScraper {
  protected config: ScraperConfig;
  protected portalName: string;

  constructor(portalName: string, config: ScraperConfig = {}) {
    this.portalName = portalName;
    this.config = {
      maxPages: 5,
      delay: 1000,
      timeout: 30000,
      retries: 3,
      ...config
    };
  }

  /**
   * Main scraping method to be implemented by each scraper
   */
  abstract scrape(searchParams?: Record<string, any>): Promise<ScraperResult>;

  /**
   * Extract vehicle data from a single listing
   */
  protected abstract extractVehicleData(listingElement: any, sourceUrl: string): VehicleData | null;

  /**
   * Get search URLs for scraping
   */
  protected abstract getSearchUrls(searchParams?: Record<string, any>): string[];

  /**
   * Utility method to add delay between requests
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility method to normalize price strings
   */
  protected normalizePrice(priceStr: string): { price: number; currency: string } {
    if (!priceStr) return { price: 0, currency: 'USD' };
    
    // Remove common price prefixes and suffixes
    const cleanPrice = priceStr.replace(/[^\d.,\$€£]/g, '');
    
    // Extract currency
    let currency = 'USD';
    if (priceStr.includes('€') || priceStr.toLowerCase().includes('eur')) currency = 'EUR';
    if (priceStr.includes('£') || priceStr.toLowerCase().includes('gbp')) currency = 'GBP';
    if (priceStr.includes('$') || priceStr.toLowerCase().includes('usd')) currency = 'USD';
    
    // Extract numeric value
    const numericPrice = parseFloat(cleanPrice.replace(/[^\d.]/g, ''));
    
    return {
      price: isNaN(numericPrice) ? 0 : numericPrice,
      currency
    };
  }

  /**
   * Utility method to extract year from text
   */
  protected extractYear(text: string): number | undefined {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? parseInt(yearMatch[0]) : undefined;
  }

  /**
   * Utility method to extract mileage from text
   */
  protected extractMileage(text: string): number | undefined {
    const mileageMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kilometers|kilómetros|miles)/i);
    return mileageMatch ? parseInt(mileageMatch[1].replace(/[.,]/g, '')) : undefined;
  }

  /**
   * Utility method to clean and normalize text
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]/g, ' ')
      .trim();
  }
}

export default BaseScraper;