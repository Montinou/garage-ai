/**
 * AutoCosmos vehicle scraper
 */

import { BaseScraper, VehicleData, ScraperResult, ScraperConfig } from './base-scraper';

interface AutoCosmosSearchParams {
  brand?: string;
  model?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  condition?: 'new' | 'used';
}

export class AutoCosmosScraper extends BaseScraper {
  private baseUrl: string = 'https://www.autocosmos.com.ar';

  constructor(config: ScraperConfig = {}) {
    super('AutoCosmos', config);
  }

  async scrape(searchParams: AutoCosmosSearchParams = {}): Promise<ScraperResult> {
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
          console.log(`Scraping AutoCosmos URL: ${url}`);
          
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

      console.log(`AutoCosmos scraping completed: ${result.totalScraped} vehicles found`);
      
    } catch (error) {
      const errorMsg = `AutoCosmos scraper failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    return result;
  }

  protected getSearchUrls(searchParams: AutoCosmosSearchParams = {}): string[] {
    const urls: string[] = [];
    
    // Base search URL for vehicles
    const baseSearchUrl = `${this.baseUrl}/autos/usados`;
    
    // Build query parameters
    const params = new URLSearchParams();
    
    if (searchParams.brand) {
      params.append('marca', searchParams.brand);
    }
    
    if (searchParams.model) {
      params.append('modelo', searchParams.model);
    }
    
    if (searchParams.location) {
      params.append('zona', searchParams.location);
    }
    
    if (searchParams.priceMin || searchParams.priceMax) {
      params.append('precio', `${searchParams.priceMin || 0}-${searchParams.priceMax || 999999999}`);
    }
    
    if (searchParams.yearMin || searchParams.yearMax) {
      params.append('anio', `${searchParams.yearMin || 1990}-${searchParams.yearMax || new Date().getFullYear()}`);
    }
    
    if (searchParams.condition) {
      params.append('estado', searchParams.condition === 'new' ? 'nuevo' : 'usado');
    }

    // Generate multiple page URLs
    for (let page = 1; page <= (this.config.maxPages || 5); page++) {
      const pageParams = new URLSearchParams(params);
      pageParams.append('pagina', page.toString());
      
      const url = `${baseSearchUrl}${pageParams.toString() ? '?' + pageParams.toString() : ''}`;
      urls.push(url);
    }

    return urls;
  }

  private async parseListingPage(html: string, sourceUrl: string): Promise<VehicleData[]> {
    const vehicles: VehicleData[] = [];
    
    try {
      // Extract vehicle listing data using regex patterns
      // AutoCosmos has a different structure than MercadoLibre
      
      // Pattern to match vehicle listings
      const listingPattern = /<div[^>]*class="[^"]*vehiculo-item[^"]*"[^>]*>(.*?)<\/div>/gs;
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
      console.error(`Error parsing AutoCosmos page: ${error instanceof Error ? error.message : String(error)}`);
    }

    return vehicles;
  }

  protected extractVehicleData(listingHtml: string, sourceUrl: string): VehicleData | null {
    try {
      // Extract title
      const titleMatch = listingHtml.match(/<h3[^>]*class="[^"]*titulo[^"]*"[^>]*>(.*?)<\/h3>/s) ||
                         listingHtml.match(/<a[^>]*class="[^"]*link-vehiculo[^"]*"[^>]*>(.*?)<\/a>/s);
      const title = titleMatch ? this.cleanText(titleMatch[1].replace(/<[^>]*>/g, '')) : '';

      if (!title) return null;

      // Extract price
      const priceMatch = listingHtml.match(/<span[^>]*class="[^"]*precio[^"]*"[^>]*>(.*?)<\/span>/s) ||
                        listingHtml.match(/\$[\s]*([0-9,.]+)/g);
      const priceText = priceMatch ? this.cleanText(Array.isArray(priceMatch) ? priceMatch[0] : priceMatch[1]) : '';
      const { price, currency } = this.normalizePrice(priceText);

      // Extract link for full details
      const linkMatch = listingHtml.match(/href="([^"]*)"/);
      const detailUrl = linkMatch ? (linkMatch[1].startsWith('http') ? linkMatch[1] : `${this.baseUrl}${linkMatch[1]}`) : sourceUrl;

      // Extract image
      const imageMatch = listingHtml.match(/<img[^>]*src="([^"]*)"[^>]*>/);
      const imageUrls = imageMatch ? [imageMatch[1].startsWith('http') ? imageMatch[1] : `${this.baseUrl}${imageMatch[1]}`] : [];

      // Extract location from listing
      const locationMatch = listingHtml.match(/<span[^>]*class="[^"]*ubicacion[^"]*"[^>]*>(.*?)<\/span>/s) ||
                           listingHtml.match(/<div[^>]*class="[^"]*zona[^"]*"[^>]*>(.*?)<\/div>/s);
      const locationText = locationMatch ? this.cleanText(locationMatch[1].replace(/<[^>]*>/g, '')) : '';

      // Extract year from title or specific field
      const year = this.extractYear(title) || this.extractYear(listingHtml);

      // Extract mileage from title or specific field
      const mileage = this.extractMileage(title) || this.extractMileage(listingHtml);

      // Extract brand and model from title
      const { brand, model } = this.extractBrandAndModel(title);

      // Extract additional details that might be available
      const { engineSize, condition } = this.extractAdditionalDetails(listingHtml);

      const vehicleData: VehicleData = {
        title: this.cleanText(title),
        description: this.extractDescription(listingHtml) || this.cleanText(title),
        price,
        currency,
        year,
        mileage,
        engineSize,
        brand,
        model,
        condition,
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
      'Fiat', 'Jeep', 'Dodge', 'Chrysler', 'Volvo', 'Land Rover', 'Jaguar',
      'Citroen', 'Alfa Romeo', 'Mini', 'Smart', 'Porsche', 'Ferrari', 'Lamborghini'
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
    
    // Location formats can vary: "City, Province", "City - Province", or just "City"
    const parts = locationText.split(/[,-]/);
    return parts[0]?.trim();
  }

  private extractState(locationText: string): string | undefined {
    if (!locationText) return undefined;
    
    // Location formats can vary: "City, Province", "City - Province"
    const parts = locationText.split(/[,-]/);
    return parts[1]?.trim();
  }

  private extractDescription(listingHtml: string): string | undefined {
    const descMatch = listingHtml.match(/<div[^>]*class="[^"]*descripcion[^"]*"[^>]*>(.*?)<\/div>/s) ||
                     listingHtml.match(/<p[^>]*class="[^"]*detalle[^"]*"[^>]*>(.*?)<\/p>/s);
    
    return descMatch ? this.cleanText(descMatch[1].replace(/<[^>]*>/g, '')) : undefined;
  }

  private extractAdditionalDetails(listingHtml: string): { engineSize?: number; condition?: string } {
    let engineSize: number | undefined;
    let condition: string | undefined;

    // Extract engine size
    const engineMatch = listingHtml.match(/(\d+\.?\d*)\s*l/i) || 
                       listingHtml.match(/(\d+\.?\d*)\s*litros/i);
    if (engineMatch) {
      engineSize = parseFloat(engineMatch[1]);
    }

    // Extract condition
    if (listingHtml.toLowerCase().includes('nuevo') || listingHtml.toLowerCase().includes('0 km')) {
      condition = 'New';
    } else if (listingHtml.toLowerCase().includes('usado')) {
      condition = 'Used';
    }

    return { engineSize, condition };
  }
}

export default AutoCosmosScraper;