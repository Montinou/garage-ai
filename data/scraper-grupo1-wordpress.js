// scraper-grupo1-wordpress.js
// Playwright MCP Scraper para Grupo 1: WordPress + WooCommerce
// Concesionarias: LOX Autos, Cenoa Usados, Fortunato Fortino, etc.

const { chromium } = require('playwright');

class WordPressMCPScraper {
  constructor(config = {}) {
    this.config = {
      headless: true,
      timeout: 30000,
      delay: 2000,
      maxPages: 3,
      ...config
    };
    
    // Configuraciones específicas para sitios WordPress
    this.selectors = {
      // Selectores comunes para WordPress + WooCommerce
      containers: [
        '.products',
        '.elementor-loop-container', 
        '.et_pb_shop',
        '.elementor-posts',
        '.woocommerce-products'
      ],
      items: [
        '.product',
        '.e-loop-item',
        '.et_pb_shop_item', 
        '.elementor-post',
        '.woocommerce-product'
      ],
      titles: [
        '.woocommerce-loop-product__title',
        '.elementor-heading-title',
        '.elementor-post__title',
        '.entry-title',
        'h2',
        'h3'
      ],
      prices: [
        '.price',
        '.woocommerce-Price-amount',
        '.elementor-price',
        '.et_pb_module_header'
      ],
      images: [
        'img.attachment-woocommerce_thumbnail',
        'img.wp-post-image',
        'img.elementor-image',
        'img[data-src]'
      ],
      links: [
        'a.woocommerce-LoopProduct-link',
        'a.elementor-post__thumbnail__link',
        'a.product-link'
      ]
    };

    this.dealerships = [
      {
        name: 'LOX Autos',
        url: 'https://loxautos.com.ar/',
        searchPath: '/vehiculos/',
        specificSelectors: {
          container: '.elementor-loop-container',
          item: '.e-loop-item',
          title: '.elementor-heading-title',
          price: '.elementor-widget-container .price',
          image: 'img[data-src]',
          link: 'a.elementor-post__thumbnail__link'
        },
        features: {
          hasLazyLoading: true,
          usesElementor: true,
          imageAttribute: 'data-src'
        }
      },
      {
        name: 'Cenoa Usados',
        url: 'https://usados.cenoa.com.ar/',
        searchPath: '/',
        specificSelectors: {
          container: '.elementor-posts-container',
          item: '.elementor-post',
          title: '.elementor-post__title',
          price: '.elementor-price'
        },
        features: {
          usesElementor: true,
          hasFilters: true
        }
      },
      {
        name: 'Fortunato Fortino',
        url: 'https://www.fortunatofortino.com/',
        searchPath: '/vehiculos-usados/',
        specificSelectors: {
          container: '.products',
          item: '.product',
          title: '.woocommerce-loop-product__title',
          price: '.price'
        },
        features: {
          usesWooCommerce: true
        }
      },
      {
        name: 'Dycar Chevrolet',
        url: 'https://www.chevroletdycar.com.ar/',
        searchPath: '/usados/',
        specificSelectors: {
          container: '.et_pb_shop',
          item: '.et_pb_shop_item',
          title: '.entry-title',
          price: '.et_pb_module_header'
        },
        features: {
          usesDivi: true
        }
      }
    ];
  }

  async initBrowser() {
    this.browser = await chromium.launch({ 
      headless: this.config.headless 
    });
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  // Detección automática de tecnología WordPress
  async detectWordPressFeatures(page) {
    const features = {
      isWordPress: false,
      hasWooCommerce: false,
      hasElementor: false,
      hasDivi: false,
      version: null
    };

    try {
      // Detectar WordPress
      const wpIndicators = await page.evaluate(() => {
        const indicators = {
          wpContent: !!document.querySelector('link[href*="wp-content"]'),
          wpIncludes: !!document.querySelector('script[src*="wp-includes"]'),
          wpGenerator: !!document.querySelector('meta[name="generator"][content*="WordPress"]'),
          wpJson: !!document.querySelector('link[rel="https://api.w.org/"]')
        };
        return indicators;
      });

      features.isWordPress = Object.values(wpIndicators).some(indicator => indicator);

      // Detectar WooCommerce
      features.hasWooCommerce = await page.evaluate(() => {
        return !!(
          document.querySelector('.woocommerce') ||
          document.querySelector('.products') ||
          document.querySelector('[class*="woocommerce"]')
        );
      });

      // Detectar Elementor
      features.hasElementor = await page.evaluate(() => {
        return !!(
          document.querySelector('.elementor') ||
          document.querySelector('[data-elementor-type]') ||
          document.querySelector('[class*="elementor"]')
        );
      });

      // Detectar Divi
      features.hasDivi = await page.evaluate(() => {
        return !!(
          document.querySelector('.et_pb_module') ||
          document.querySelector('[class*="et_pb"]')
        );
      });

    } catch (error) {
      console.log('Error detectando características:', error.message);
    }

    return features;
  }

  // Scraper principal para un sitio específico
  async scrapeDealer(dealership) {
    const page = await this.context.newPage();
    const results = [];

    try {
      console.log(`\n🔄 Iniciando scraping de ${dealership.name}...`);
      
      // Navegar al sitio
      const fullUrl = dealership.url + (dealership.searchPath || '');
      await page.goto(fullUrl, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      // Detectar características del sitio
      const features = await this.detectWordPressFeatures(page);
      console.log(`📊 Características detectadas:`, features);

      // Esperar a que cargue el contenido
      await this.waitForContent(page, dealership);

      // Manejar lazy loading si es necesario
      if (dealership.features?.hasLazyLoading) {
        await this.handleLazyLoading(page);
      }

      // Extraer vehículos
      const vehicles = await this.extractVehicles(page, dealership);
      results.push(...vehicles);

      console.log(`✅ ${dealership.name}: ${vehicles.length} vehículos encontrados`);

    } catch (error) {
      console.error(`❌ Error en ${dealership.name}:`, error.message);
    } finally {
      await page.close();
    }

    return results;
  }

  // Esperar a que cargue el contenido específico
  async waitForContent(page, dealership) {
    const selectors = dealership.specificSelectors || this.selectors;
    
    // Intentar diferentes selectores de contenedor
    for (const container of selectors.containers || this.selectors.containers) {
      try {
        await page.waitForSelector(container, { timeout: 10000 });
        console.log(`📦 Contenedor encontrado: ${container}`);
        return;
      } catch (error) {
        continue;
      }
    }

    console.log('⚠️ No se encontró contenedor específico, continuando...');
  }

  // Manejar lazy loading de imágenes
  async handleLazyLoading(page) {
    console.log('🖼️ Manejando lazy loading...');
    
    // Scroll para activar lazy loading
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if(totalHeight >= scrollHeight){
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    // Esperar a que se carguen las imágenes
    await page.waitForTimeout(2000);
  }

  // Extraer datos de vehículos
  async extractVehicles(page, dealership) {
    const selectors = dealership.specificSelectors || this.selectors;
    
    return await page.evaluate((selectors, dealerName, baseUrl) => {
      const vehicles = [];
      
      // Buscar contenedor de productos
      let container = null;
      for (const containerSelector of selectors.containers || ['.products', '.elementor-loop-container']) {
        container = document.querySelector(containerSelector);
        if (container) break;
      }

      if (!container) {
        console.log('No se encontró contenedor de productos');
        return vehicles;
      }

      // Buscar elementos de productos
      let items = [];
      for (const itemSelector of selectors.items || ['.product', '.e-loop-item']) {
        items = container.querySelectorAll(itemSelector);
        if (items.length > 0) break;
      }

      console.log(`Procesando ${items.length} elementos encontrados`);

      items.forEach((item, index) => {
        try {
          const vehicle = {
            dealership: dealerName,
            id: `${dealerName.toLowerCase().replace(/\s+/g, '-')}-${index}`,
            timestamp: new Date().toISOString()
          };

          // Extraer título
          for (const titleSelector of selectors.titles || ['.woocommerce-loop-product__title', 'h2', 'h3']) {
            const titleElement = item.querySelector(titleSelector);
            if (titleElement) {
              vehicle.title = titleElement.textContent.trim();
              break;
            }
          }

          // Extraer precio
          for (const priceSelector of selectors.prices || ['.price', '.woocommerce-Price-amount']) {
            const priceElement = item.querySelector(priceSelector);
            if (priceElement) {
              vehicle.priceText = priceElement.textContent.trim();
              // Extraer número del precio
              const priceMatch = vehicle.priceText.match(/[\d.,]+/);
              if (priceMatch) {
                vehicle.price = parseFloat(priceMatch[0].replace(/[.,]/g, ''));
              }
              break;
            }
          }

          // Extraer imagen
          for (const imgSelector of selectors.images || ['img']) {
            const imgElement = item.querySelector(imgSelector);
            if (imgElement) {
              vehicle.imageUrl = imgElement.getAttribute('data-src') || 
                               imgElement.getAttribute('src') || 
                               imgElement.getAttribute('data-lazy-src');
              
              if (vehicle.imageUrl && !vehicle.imageUrl.startsWith('http')) {
                vehicle.imageUrl = baseUrl + vehicle.imageUrl;
              }
              break;
            }
          }

          // Extraer enlace
          for (const linkSelector of selectors.links || ['a']) {
            const linkElement = item.querySelector(linkSelector);
            if (linkElement) {
              vehicle.detailUrl = linkElement.getAttribute('href');
              if (vehicle.detailUrl && !vehicle.detailUrl.startsWith('http')) {
                vehicle.detailUrl = baseUrl + vehicle.detailUrl;
              }
              break;
            }
          }

          // Extraer información adicional del título
          if (vehicle.title) {
            const yearMatch = vehicle.title.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
              vehicle.year = parseInt(yearMatch[0]);
            }

            const kmMatch = vehicle.title.match(/(\d+(?:\.\d+)?)\s*km/i);
            if (kmMatch) {
              vehicle.mileage = parseFloat(kmMatch[1].replace('.', ''));
            }
          }

          // Solo agregar si tiene título
          if (vehicle.title && vehicle.title.length > 0) {
            vehicles.push(vehicle);
          }

        } catch (error) {
          console.log(`Error procesando elemento ${index}:`, error.message);
        }
      });

      return vehicles;
    }, selectors, dealership.name, dealership.url);
  }

  // Método principal para scraping de todos los dealers del grupo
  async scrapeAll() {
    console.log('🚀 Iniciando WordPress MCP Scraper...');
    console.log(`📋 Sitios a procesar: ${this.dealerships.length}`);
    
    await this.initBrowser();
    const allResults = [];

    try {
      for (const dealership of this.dealerships) {
        const results = await this.scrapeDealer(dealership);
        allResults.push({
          dealership: dealership.name,
          url: dealership.url,
          count: results.length,
          vehicles: results
        });

        // Delay entre sitios
        await new Promise(resolve => setTimeout(resolve, this.config.delay));
      }

    } catch (error) {
      console.error('❌ Error general:', error.message);
    } finally {
      await this.closeBrowser();
    }

    return allResults;
  }

  // Método para scraping de un solo sitio por URL
  async scrapeByUrl(url, customSelectors = {}) {
    await this.initBrowser();
    const page = await this.context.newPage();
    
    try {
      console.log(`🔄 Scraping single URL: ${url}`);
      
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      const features = await this.detectWordPressFeatures(page);
      console.log('📊 Características detectadas:', features);

      const dealership = {
        name: 'Custom Site',
        url: url,
        specificSelectors: { ...this.selectors, ...customSelectors }
      };

      await this.waitForContent(page, dealership);
      const vehicles = await this.extractVehicles(page, dealership);
      
      console.log(`✅ ${vehicles.length} vehículos encontrados`);
      
      return vehicles;

    } catch (error) {
      console.error('❌ Error:', error.message);
      return [];
    } finally {
      await page.close();
      await this.closeBrowser();
    }
  }
}

// Funciones de utilidad para uso directo
async function scrapeWordPressDealerships() {
  const scraper = new WordPressMCPScraper();
  return await scraper.scrapeAll();
}

async function scrapeWordPressSite(url, selectors = {}) {
  const scraper = new WordPressMCPScraper();
  return await scraper.scrapeByUrl(url, selectors);
}

// Exportar para uso en otros módulos
module.exports = {
  WordPressMCPScraper,
  scrapeWordPressDealerships,
  scrapeWordPressSite
};

// Ejemplo de uso directo
if (require.main === module) {
  (async () => {
    try {
      console.log('🏁 Iniciando scraping de prueba...');
      
      // Opción 1: Scraper todos los sitios WordPress
      // const results = await scrapeWordPressDealerships();
      
      // Opción 2: Scraper un sitio específico
      const results = await scrapeWordPressSite('https://loxautos.com.ar/');
      
      console.log('\n📊 RESULTADOS FINALES:');
      console.log(JSON.stringify(results, null, 2));
      
    } catch (error) {
      console.error('💥 Error fatal:', error);
    }
  })();
}