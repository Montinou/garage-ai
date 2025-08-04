// scrapers-concesionarias.js
// Sistema de scrapers modulares por grupo de concesionarias

const { chromium } = require('playwright');

/**
 * Clase base para todos los scrapers
 */
class BaseScraper {
  constructor(config = {}) {
    this.config = {
      headless: true,
      timeout: 30000,
      waitUntil: 'networkidle',
      ...config
    };
    this.results = [];
  }

  async init() {
    this.browser = await chromium.launch({ 
      headless: this.config.headless 
    });
    this.page = await this.browser.newPage();
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async navigateTo(url) {
    await this.page.goto(url, { 
      waitUntil: this.config.waitUntil,
      timeout: this.config.timeout 
    });
  }

  // Método que debe ser implementado por cada grupo
  async extractVehicles() {
    throw new Error('extractVehicles must be implemented by subclass');
  }

  // Utilidades comunes
  async autoScroll() {
    await this.page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  cleanPrice(priceText) {
    if (!priceText) return null;
    // Eliminar todo excepto números
    const numbers = priceText.match(/[\d.,]+/);
    if (!numbers) return null;
    // Convertir a número
    return parseFloat(numbers[0].replace(/[.,]/g, ''));
  }

  extractYear(text) {
    if (!text) return null;
    const yearMatch = text.match(/(19|20)\d{2}/);
    return yearMatch ? parseInt(yearMatch[0]) : null;
  }

  extractKm(text) {
    if (!text) return null;
    const kmMatch = text.match(/([\d.,]+)\s*km/i);
    if (!kmMatch) return null;
    return parseInt(kmMatch[1].replace(/[.,]/g, ''));
  }
}

/**
 * GRUPO 1: WordPress + WooCommerce
 */
class WordPressScraper extends BaseScraper {
  constructor(config = {}) {
    super(config);
    this.selectors = {
      container: '.products, .elementor-loop-container, .et_pb_shop',
      item: '.product, .e-loop-item, .et_pb_shop_item',
      title: '.woocommerce-loop-product__title, h2, h3, .entry-title',
      price: '.price, .woocommerce-Price-amount, .et_pb_module_header',
      image: 'img.attachment-woocommerce_thumbnail, img.wp-post-image, img',
      link: 'a.woocommerce-LoopProduct-link, a[href*="producto"], a[href*="product"]',
      ...config.selectors
    };
  }

  async extractVehicles() {
    await this.page.waitForSelector(this.selectors.container, { 
      timeout: 10000 
    }).catch(() => console.log('Container not found, trying alternatives...'));

    const vehicles = await this.page.evaluate((selectors) => {
      const items = document.querySelectorAll(selectors.item);
      
      return Array.from(items).map(item => {
        const getTextContent = (selector) => {
          const el = item.querySelector(selector);
          return el ? el.textContent.trim() : null;
        };
        
        const getImageSrc = (selector) => {
          const img = item.querySelector(selector);
          if (!img) return null;
          return img.src || img.dataset.src || img.dataset.lazySrc;
        };
        
        const getLink = (selector) => {
          const link = item.querySelector(selector);
          return link ? link.href : null;
        };

        const title = getTextContent(selectors.title);
        const priceText = getTextContent(selectors.price);
        
        return {
          title,
          price: priceText,
          image: getImageSrc(selectors.image),
          link: getLink(selectors.link),
          rawData: {
            classes: item.className,
            innerHTML: item.innerHTML.substring(0, 200)
          }
        };
      });
    }, this.selectors);

    // Post-procesar datos
    return vehicles.map(vehicle => ({
      ...vehicle,
      priceNumeric: this.cleanPrice(vehicle.price),
      year: this.extractYear(vehicle.title),
      km: this.extractKm(vehicle.title)
    }));
  }

  async scrapePage(url) {
    await this.navigateTo(url);
    await this.page.waitForTimeout(2000); // Esperar carga completa
    return await this.extractVehicles();
  }
}

/**
 * GRUPO 2: React/Next.js con carga dinámica
 */
class ReactNextScraper extends BaseScraper {
  constructor(config = {}) {
    super(config);
    this.selectors = {
      container: '[class*="results"], [class*="grid"], [class*="list"]',
      item: '[class*="card"], [class*="item"], article',
      title: '[class*="title"], h2, h3',
      price: '[class*="price"]',
      image: 'img',
      loadMore: '[class*="load-more"], [class*="ver-mas"]',
      ...config.selectors
    };
  }

  async interceptAPIRequests() {
    const apiData = [];
    
    this.page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('api') && url.includes('vehicle')) {
        try {
          const json = await response.json();
          apiData.push(json);
        } catch (e) {
          // No es JSON
        }
      }
    });
    
    return apiData;
  }

  async extractVehicles() {
    // Esperar a que aparezcan los elementos
    await this.page.waitForSelector(this.selectors.item, {
      timeout: 15000
    });

    // Scroll para cargar más
    await this.autoScroll();
    await this.page.waitForTimeout(2000);

    const vehicles = await this.page.evaluate((selectors) => {
      const items = document.querySelectorAll(selectors.item);
      
      return Array.from(items).map(item => {
        const getText = (selector) => {
          const el = item.querySelector(selector);
          return el ? el.textContent.trim() : null;
        };
        
        const getImage = (selector) => {
          const img = item.querySelector(selector);
          if (!img) return null;
          // Manejar lazy loading
          return img.src || img.dataset.src || img.dataset.lazySrc;
        };
        
        const getLink = () => {
          const link = item.querySelector('a');
          return link ? link.href : null;
        };

        return {
          title: getText(selectors.title),
          price: getText(selectors.price),
          image: getImage(selectors.image),
          link: getLink()
        };
      });
    }, this.selectors);

    return vehicles.map(vehicle => ({
      ...vehicle,
      priceNumeric: this.cleanPrice(vehicle.price),
      year: this.extractYear(vehicle.title)
    }));
  }

  async scrapePage(url) {
    const apiData = await this.interceptAPIRequests();
    await this.navigateTo(url);
    const vehicles = await this.extractVehicles();
    
    // Si hay datos de API, combinar
    if (apiData.length > 0) {
      console.log('API data intercepted:', apiData.length);
    }
    
    return vehicles;
  }
}

/**
 * GRUPO 3: Sitios PHP Custom
 */
class CustomPHPScraper extends BaseScraper {
  constructor(config = {}) {
    super(config);
    this.selectors = {
      container: '.listado, .vehiculos, .cars, .inventory',
      item: '.vehiculo, .car, .auto, .item',
      title: 'h2, h3, .titulo, .title',
      price: '.precio, .price, span:has-text("$")',
      details: '.detalles, .specs, .info',
      nextPage: 'a.next, a.siguiente, a[rel="next"]',
      ...config.selectors
    };
  }

  async extractVehicles() {
    const vehicles = await this.page.evaluate((selectors) => {
      const items = document.querySelectorAll(selectors.item);
      if (items.length === 0) {
        // Buscar estructura de tabla
        const rows = document.querySelectorAll('tr');
        return Array.from(rows).slice(1).map(row => { // Skip header
          const cells = row.querySelectorAll('td');
          if (cells.length < 3) return null;
          
          return {
            title: cells[0]?.textContent.trim(),
            price: cells[1]?.textContent.trim(),
            details: cells[2]?.textContent.trim()
          };
        }).filter(Boolean);
      }
      
      return Array.from(items).map(item => {
        const getText = (selector) => {
          const el = item.querySelector(selector);
          return el ? el.textContent.trim() : null;
        };
        
        return {
          title: getText(selectors.title),
          price: getText(selectors.price),
          details: getText(selectors.details),
          link: item.querySelector('a')?.href
        };
      });
    }, this.selectors);

    return vehicles.map(vehicle => ({
      ...vehicle,
      priceNumeric: this.cleanPrice(vehicle.price),
      year: this.extractYear(vehicle.title || vehicle.details),
      km: this.extractKm(vehicle.details)
    }));
  }

  async scrapeAllPages(startUrl, maxPages = 5) {
    const allVehicles = [];
    let currentUrl = startUrl;
    let pageCount = 0;

    while (currentUrl && pageCount < maxPages) {
      await this.navigateTo(currentUrl);
      const vehicles = await this.extractVehicles();
      allVehicles.push(...vehicles);
      
      // Buscar siguiente página
      currentUrl = await this.page.evaluate((selector) => {
        const nextLink = document.querySelector(selector);
        return nextLink ? nextLink.href : null;
      }, this.selectors.nextPage);
      
      pageCount++;
      console.log(`Scraped page ${pageCount}, found ${vehicles.length} vehicles`);
    }

    return allVehicles;
  }
}

/**
 * GRUPO 4: Marketplaces con API
 */
class MarketplaceScraper extends BaseScraper {
  constructor(config = {}) {
    super(config);
    this.apiEndpoint = config.apiEndpoint;
    this.apiKey = config.apiKey;
  }

  async fetchFromAPI(params = {}) {
    // Implementación específica por marketplace
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.apiEndpoint}?${queryString}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API fetch error:', error);
      return null;
    }
  }

  async extractVehicles() {
    // Para marketplaces, preferir API sobre scraping
    const apiData = await this.fetchFromAPI({
      limit: 100,
      offset: 0,
      type: 'used'
    });

    if (apiData && apiData.results) {
      return apiData.results.map(item => ({
        title: `${item.brand} ${item.model} ${item.year}`,
        price: item.price,
        priceNumeric: item.price,
        year: item.year,
        km: item.kilometers,
        image: item.images?.[0],
        link: item.url,
        location: item.location,
        seller: item.seller
      }));
    }

    // Fallback a scraping tradicional
    return super.extractVehicles();
  }
}

/**
 * GRUPO 6: Sistemas de Gestión Automotriz
 */
class AutoSystemScraper extends BaseScraper {
  constructor(config = {}) {
    super(config);
    this.systemType = config.systemType; // 'autogest', 'cardealer', etc.
    this.selectors = this.getSelectorsForSystem(this.systemType);
  }

  getSelectorsForSystem(type) {
    const systems = {
      autogest: {
        container: '.inventory-list',
        item: '.vehicle-card',
        title: '.vehicle-title',
        price: '.vehicle-price',
        details: '.vehicle-specs'
      },
      cardealer: {
        container: '#vehicles',
        item: '.car-item',
        title: 'h3.car-name',
        price: '.car-price',
        details: '.car-info'
      },
      default: {
        container: '[class*="inventory"], [class*="stock"]',
        item: '[class*="vehicle"], [class*="car"]',
        title: 'h2, h3, [class*="title"]',
        price: '[class*="price"]',
        details: '[class*="detail"], [class*="spec"]'
      }
    };

    return systems[type] || systems.default;
  }

  async extractVehicles() {
    await this.page.waitForSelector(this.selectors.container);
    
    return await this.page.evaluate((selectors) => {
      const items = document.querySelectorAll(selectors.item);
      
      return Array.from(items).map(item => {
        const getText = (selector) => {
          const el = item.querySelector(selector);
          return el ? el.textContent.trim() : null;
        };
        
        const data = {
          title: getText(selectors.title),
          price: getText(selectors.price),
          details: getText(selectors.details)
        };

        // Extraer datos estructurados si existen
        const structuredData = item.querySelector('[type="application/ld+json"]');
        if (structuredData) {
          try {
            const json = JSON.parse(structuredData.textContent);
            Object.assign(data, json);
          } catch (e) {
            // Ignorar errores de parsing
          }
        }

        return data;
      });
    }, this.selectors);
  }
}

/**
 * Factory para crear el scraper apropiado
 */
class ScraperFactory {
  static create(siteGroup, config = {}) {
    const scrapers = {
      'wordpress': WordPressScraper,
      'react-next': ReactNextScraper,
      'custom-php': CustomPHPScraper,
      'marketplace': MarketplaceScraper,
      'auto-system': AutoSystemScraper
    };

    const ScraperClass = scrapers[siteGroup] || BaseScraper;
    return new ScraperClass(config);
  }
}

/**
 * Detector automático de tipo de sitio
 */
class SiteDetector {
  static async detect(page) {
    const detection = await page.evaluate(() => {
      const indicators = {
        wordpress: [
          !!document.querySelector('link[href*="wp-content"]'),
          !!document.querySelector('meta[name="generator"][content*="WordPress"]'),
          !!document.querySelector('.wp-block'),
          !!window.wp
        ],
        react: [
          !!document.querySelector('[data-reactroot]'),
          !!document.querySelector('#__next'),
          !!document.querySelector('[id*="react"]'),
          !!window.React
        ],
        woocommerce: [
          !!document.querySelector('.woocommerce'),
          !!document.querySelector('[class*="woocommerce"]'),
          !!window.woocommerce_params
        ],
        elementor: [
          !!document.querySelector('.elementor'),
          !!document.querySelector('[data-elementor-type]')
        ]
      };

      const results = {};
      for (const [tech, checks] of Object.entries(indicators)) {
        results[tech] = checks.filter(Boolean).length;
      }

      return results;
    });

    // Determinar el tipo más probable
    if (detection.wordpress > 0 || detection.woocommerce > 0) {
      return 'wordpress';
    } else if (detection.react > 0) {
      return 'react-next';
    } else {
      return 'custom-php';
    }
  }
}

/**
 * Ejemplo de uso
 */
async function scrapeExample() {
  // Ejemplo 1: WordPress
  const wpScraper = ScraperFactory.create('wordpress', {
    selectors: {
      item: '.e-loop-item' // Selector específico para LOX Autos
    }
  });

  await wpScraper.init();
  const wpVehicles = await wpScraper.scrapePage('https://loxautos.com.ar/');
  console.log('WordPress vehicles:', wpVehicles.length);
  await wpScraper.close();

  // Ejemplo 2: React/Next
  const reactScraper = ScraperFactory.create('react-next');
  await reactScraper.init();
  const reactVehicles = await reactScraper.scrapePage('https://www.kavak.com/ar/usados');
  console.log('React vehicles:', reactVehicles.length);
  await reactScraper.close();

  // Ejemplo 3: Detección automática
  const autoScraper = new BaseScraper();
  await autoScraper.init();
  await autoScraper.navigateTo('https://usados.cenoa.com.ar/');
  const detectedType = await SiteDetector.detect(autoScraper.page);
  console.log('Detected site type:', detectedType);
  await autoScraper.close();
}

// Exportar clases
module.exports = {
  BaseScraper,
  WordPressScraper,
  ReactNextScraper,
  CustomPHPScraper,
  MarketplaceScraper,
  AutoSystemScraper,
  ScraperFactory,
  SiteDetector
};

// Ejecutar ejemplo si es llamado directamente
if (require.main === module) {
  scrapeExample().catch(console.error);
}
