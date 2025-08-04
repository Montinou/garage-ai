/**
 * MercadoLibre vehicle scraper
 */

import { BaseScraper, VehicleData, ScraperResult, ScraperConfig } from './base-scraper';

interface MercadoLibreSearchParams {
  category?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  mileageMax?: number;
}

export class MercadoLibreScraper extends BaseScraper {
  private baseUrl: string = 'https://autos.mercadolibre.com.ar';

  constructor(config: ScraperConfig = {}) {
    super('MercadoLibre', config);
  }

  async scrape(searchParams: MercadoLibreSearchParams = {}): Promise<ScraperResult> {
    const startTime = Date.now();
    const result: ScraperResult = {
      success: false,
      data: [],
      errors: [],
      totalScraped: 0,
      timeElapsed: 0
    };

    try {
      const searchUrls = this.getSearchUrls(searchParams);
      
      for (const url of searchUrls) {
        try {
          console.log(`Scraping MercadoLibre URL: ${url}`);
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            },
            signal: AbortSignal.timeout(this.config.timeout!)
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const html = await response.text();
          const vehicles = await this.parseListingPage(html, url);
          
          result.data.push(...vehicles);
          
          // Add delay between requests
          await this.delay(this.config.delay!);
          
        } catch (error) {
          const errorMsg = `Error scraping ${url}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      result.success = result.errors.length < searchUrls.length;
      result.totalScraped = result.data.length;
      result.timeElapsed = Date.now() - startTime;

      console.log(`MercadoLibre scraping completed: ${result.totalScraped} vehicles found`);
      
    } catch (error) {
      const errorMsg = `MercadoLibre scraper failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    return result;
  }

  protected getSearchUrls(searchParams: MercadoLibreSearchParams = {}): string[] {
    const urls: string[] = [];
    
    // Base search URL for vehicles
    const baseSearchUrl = `${this.baseUrl}/vehiculos`;
    
    // Build query parameters
    const params = new URLSearchParams();
    
    if (searchParams.category) {
      params.append('category', searchParams.category);
    }
    
    if (searchParams.location) {
      params.append('location', searchParams.location);
    }
    
    if (searchParams.priceMin) {
      params.append('price', `${searchParams.priceMin}-${searchParams.priceMax || '*'}`);
    }
    
    if (searchParams.yearMin) {
      params.append('year', `${searchParams.yearMin}-${searchParams.yearMax || new Date().getFullYear()}`);
    }
    
    if (searchParams.mileageMax) {
      params.append('mileage', `*-${searchParams.mileageMax}`);
    }

    // Generate multiple page URLs
    for (let page = 1; page <= (this.config.maxPages || 5); page++) {
      const pageParams = new URLSearchParams(params);
      pageParams.append('_from', ((page - 1) * 48 + 1).toString());
      
      const url = `${baseSearchUrl}${pageParams.toString() ? '?' + pageParams.toString() : ''}`;
      urls.push(url);
    }

    return urls;
  }

  private async parseListingPage(html: string, sourceUrl: string): Promise<VehicleData[]> {
    const vehicles: VehicleData[] = [];
    
    try {
      // Extract vehicle listing data using regex patterns
      // This is a simplified approach - in production, you'd use a proper HTML parser
      
      // Pattern to match vehicle listings
      const listingPattern = /<div[^>]*class="[^"]*ui-search-result__wrapper[^"]*"[^>]*>(.*?)<\/div>/gs;
      const listings = html.match(listingPattern) || [];

      for (const listing of listings) {
        try {
          const vehicleData = this.extractVehicleData(listing, sourceUrl);
          if (vehicleData) {
            vehicles.push(vehicleData);
          }
        } catch (error) {
          console.warn(`Error parsing individual listing: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
    } catch (error) {
      console.error(`Error parsing MercadoLibre page: ${error instanceof Error ? error.message : String(error)}`);
    }

    return vehicles;
  }

  protected extractVehicleData(listingHtml: string, sourceUrl: string): VehicleData | null {
    try {
      // Extract title
      const titleMatch = listingHtml.match(/<h2[^>]*class="[^"]*ui-search-item__title[^"]*"[^>]*>(.*?)<\/h2>/s);
      const title = titleMatch ? this.cleanText(titleMatch[1].replace(/<[^>]*>/g, '')) : '';

      if (!title) return null;

      // Extract price
      const priceMatch = listingHtml.match(/<span[^>]*class="[^"]*price-tag-fraction[^"]*"[^>]*>(.*?)<\/span>/s);
      const priceText = priceMatch ? this.cleanText(priceMatch[1].replace(/<[^>]*>/g, '')) : '';
      const { price, currency } = this.normalizePrice(priceText);

      // Extract link for full details
      const linkMatch = listingHtml.match(/href="([^"]*)"/);
      const detailUrl = linkMatch ? linkMatch[1] : sourceUrl;

      // Extract image
      const imageMatch = listingHtml.match(/<img[^>]*src="([^"]*)"[^>]*>/);
      const imageUrls = imageMatch ? [imageMatch[1]] : [];

      // Extract location from listing
      const locationMatch = listingHtml.match(/<span[^>]*class="[^"]*ui-search-item__location[^"]*"[^>]*>(.*?)<\/span>/s);
      const locationText = locationMatch ? this.cleanText(locationMatch[1].replace(/<[^>]*>/g, '')) : '';

      // Extract year from title
      const year = this.extractYear(title);

      // Extract mileage from title or description
      const mileage = this.extractMileage(title);

      // Extract brand and model from title
      const { brand, model } = this.extractBrandAndModel(title);

      const vehicleData: VehicleData = {
        title: this.cleanText(title),
        description: this.cleanText(title), // MercadoLibre listings often use title as description
        price,
        currency,
        year,
        mileage,
        brand,
        model,
        locationCity: this.extractCity(locationText),
        locationState: this.extractState(locationText),
        locationCountry: 'Argentina',
        imageUrls,
        sourceUrl: detailUrl,
        sourcePortal: this.portalName
      };

      return vehicleData;

    } catch (error) {
      console.warn(`Error extracting vehicle data: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private extractBrandAndModel(title: string): { brand?: string; model?: string } {
    // Common car brands in Argentina
    const brands = [
      'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'Hyundai', 'Kia', 
      'Volkswagen', 'BMW', 'Mercedes-Benz', 'Audi', 'Mazda', 'Subaru', 
      'Mitsubishi', 'Lexus', 'Acura', 'Infiniti', 'Peugeot', 'Renault',
      'Fiat', 'Jeep', 'Dodge', 'Chrysler', 'Volvo', 'Land Rover', 'Jaguar'
    ];

    const titleUpper = title.toUpperCase();
    
    for (const brand of brands) {
      if (titleUpper.includes(brand.toUpperCase())) {
        // Extract model after brand name
        const brandIndex = titleUpper.indexOf(brand.toUpperCase());
        const afterBrand = title.substring(brandIndex + brand.length).trim();
        const modelMatch = afterBrand.match(/^(\w+(?:\s+\w+)?)/);
        const model = modelMatch ? modelMatch[1].trim() : undefined;
        
        return { brand, model };
      }
    }

    return {};
  }

  private extractCity(locationText: string): string | undefined {
    if (!locationText) return undefined;
    
    // Location is usually in format "City, Province" or just "City"
    const parts = locationText.split(',');
    return parts[0]?.trim();
  }

  private extractState(locationText: string): string | undefined {
    if (!locationText) return undefined;
    
    // Location is usually in format "City, Province" 
    const parts = locationText.split(',');
    return parts[1]?.trim();
  }
}

export default MercadoLibreScraper;