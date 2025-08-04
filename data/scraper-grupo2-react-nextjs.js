// scraper-grupo2-react-nextjs.js
// Playwright MCP Scraper para Grupo 2: React/Next.js
// Concesionarias: Kavak, Car Cash, TIENDA CARS, Car One, etc.

const { chromium } = require('playwright');

class ReactNextMCPScraper {
  constructor(config = {}) {
    this.config = {
      headless: true,
      timeout: 45000,
      delay: 3000,
      maxPages: 3,
      ...config
    };
    
    // Configuraciones específicas para sitios React/Next.js
    this.selectors = {
      // Selectores comunes para aplicaciones React/Next
      containers: [
        '[class*="results"]',
        '[class*="grid"]',
        '[class*="list"]',
        '[class*="catalog"]',
        '[class*="vehicles"]',
        '[class*="products"]'
      ],
      items: [
        '[class*="card"]',
        '[class*="item"]',
        '[class*="product"]',
        '[class*="vehicle"]',
        '[class*="listing"]'
      ],
      titles: [
        '[class*="title"]',
        '[class*="name"]',
        '[class*="heading"]',
        'h1', 'h2', 'h3', 'h4'
      ],
      prices: [
        '[class*="price"]',
        '[class*="cost"]',
        '[class*="amount"]',
        '[class*="value"]'
      ],
      images: [
        '[class*="image"] img',
        '[class*="photo"] img',
        '[class*="picture"] img',
        'img[src*="vehicle"]',
        'img[src*="car"]'
      ],
      links: [
        '[class*="link"]',
        '[href*="vehicle"]',
        '[href*="car"]',
        'a'
      ]
    };

    this.dealerships = [
      {
        name: 'Kavak Argentina',
        url: 'https://www.kavak.com',
        searchPath: '/ar/catalog-ui/',
        apiEndpoints: [
          '/catalog-ui/api/search',
          '/catalog-ui/api/vehicles'
        ],
        specificSelectors: {
          container: '[class*="results"], [class*="catalog"]',
          item: '[class*="card-product"]',
          title: '[class*="card-product__title"], [class*="title"]',
          price: '[class*="card-product__price"], [class*="price"]',
          image: '[class*="card-product__image"] img, [class*="image"] img'
        },
        features: {
          hasInfiniteScroll: true,
          requiresAPIIntercept: true,
          hasFilters: true,
          isNextJS: true
        }
      },
      {
        name: 'Car Cash Argentina',
        url: 'https://www.carcash.com.ar',
        searchPath: '/autos/',
        specificSelectors: {
          container: '[class*="vehicles"], [class*="grid"]',
          item: '[class*="vehicle-card"], [class*="card"]',
          title: '[class*="vehicle-title"], h3',
          price: '[class*="price"]'
        },
        features: {
          isReactApp: true,
          hasLazyLoading: true
        }
      },
      {
        name: 'TIENDA CARS',
        url: 'https://tiendacars.com',
        searchPath: '/vehiculos/',
        specificSelectors: {
          container: '[class*="catalog"], [class*="grid"]',
          item: '[class*="product"], [class*="car-item"]',
          title: '[class*="car-title"], h2',
          price: '[class*="price"]'
        },
        features: {
          isReactApp: true,
          hasFilters: true
        }
      },
      {
        name: 'Car One',
        url: 'https://www.carone.com.ar',
        searchPath: '/usados/',
        specificSelectors: {
          container: '[class*="vehicles"], [class*="listing"]',
          item: '[class*="vehicle"], [class*="item"]',
          title: 'h3, h4',
          price: '[class*="price"]'
        },
        features: {
          hasModernRouting: true,
          usesComponentLibrary: true
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

  // Detección automática de tecnología React/Next.js
  async detectReactFeatures(page) {
    const features = {
      isReact: false,
      isNextJS: false,
      hasSSR: false,
      hasAPI: false,
      usesStateManagement: false,
      componentLibrary: null
    };

    try {
      // Detectar React
      const reactIndicators = await page.evaluate(() => {
        const indicators = {
          reactRoot: !!document.querySelector('#__next, #root, [data-reactroot]'),
          reactText: document.documentElement.outerHTML.includes('react'),
          reactDevtools: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
          nextData: !!document.querySelector('#__NEXT_DATA__')
        };
        return indicators;
      });

      features.isReact = Object.values(reactIndicators).some(indicator => indicator);
      features.isNextJS = reactIndicators.nextData || reactIndicators.reactRoot;

      // Detectar SSR
      features.hasSSR = await page.evaluate(() => {
        return !!(
          document.querySelector('#__NEXT_DATA__') ||
          document.querySelector('[data-server-rendered]')
        );
      });

      // Detectar librerías de componentes
      const componentLibraries = await page.evaluate(() => {
        const libs = {
          materialUI: document.documentElement.outerHTML.includes('material-ui'),
          antd: document.documentElement.outerHTML.includes('antd'),
          chakra: document.documentElement.outerHTML.includes('chakra'),
          mantine: document.documentElement.outerHTML.includes('mantine')
        };
        return libs;
      });

      features.componentLibrary = Object.keys(componentLibraries).find(lib => componentLibraries[lib]) || null;

    } catch (error) {
      console.log('Error detectando características React:', error.message);
    }

    return features;
  }

  // Interceptor de API para obtener datos directamente
  async setupAPIInterception(page, dealership) {
    const interceptedData = [];
    
    // Interceptar requests API
    page.on('response', async (response) => {
      const url = response.url();
      
      // Verificar si es una API de vehículos
      if (dealership.apiEndpoints?.some(endpoint => url.includes(endpoint)) ||
          url.includes('/api/') && (
            url.includes('vehicle') || 
            url.includes('car') || 
            url.includes('product') ||
            url.includes('search')
          )) {
        
        try {
          const data = await response.json();
          console.log(`📡 API interceptada: ${url}`);
          interceptedData.push({
            url,
            data,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.log(`⚠️ Error procesando API response: ${error.message}`);
        }
      }
    });

    return interceptedData;
  }

  // Manejar scroll infinito
  async handleInfiniteScroll(page) {
    console.log('♾️ Manejando scroll infinito...');
    
    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 10;

    while (scrollAttempts < maxScrollAttempts) {
      // Scroll hasta abajo
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Esperar a que cargue nuevo contenido
      await page.waitForTimeout(2000);

      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      
      if (currentHeight === previousHeight) {
        // No hay más contenido que cargar
        break;
      }

      previousHeight = currentHeight;
      scrollAttempts++;
      
      console.log(`📜 Scroll ${scrollAttempts}: altura ${currentHeight}px`);
    }

    console.log(`✅ Scroll completado después de ${scrollAttempts} intentos`);
  }

  // Esperar a que la aplicación React se hidrate
  async waitForReactHydration(page) {
    console.log('⚡ Esperando hidratación de React...');
    
    try {
      // Esperar a que React esté disponible
      await page.waitForFunction(() => {
        return window.React || 
               window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
               document.querySelector('[data-reactroot]') ||
               document.querySelector('#__next');
      }, { timeout: 15000 });

      // Esperar a que el contenido se renderice
      await page.waitForTimeout(3000);
      
      console.log('✅ React hidratado correctamente');
    } catch (error) {
      console.log('⚠️ Timeout esperando hidratación, continuando...');
    }
  }

  // Scraper principal para un sitio específico
  async scrapeDealer(dealership) {
    const page = await this.context.newPage();
    const results = [];

    try {
      console.log(`\n🔄 Iniciando scraping de ${dealership.name}...`);
      
      // Configurar interceptor API si es necesario
      let interceptedData = [];
      if (dealership.features?.requiresAPIIntercept) {
        interceptedData = await this.setupAPIInterception(page, dealership);
      }

      // Navegar al sitio
      const fullUrl = dealership.url + (dealership.searchPath || '');
      await page.goto(fullUrl, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      // Detectar características del sitio
      const features = await this.detectReactFeatures(page);
      console.log(`📊 Características detectadas:`, features);

      // Esperar hidratación de React
      await this.waitForReactHydration(page);

      // Manejar scroll infinito si es necesario
      if (dealership.features?.hasInfiniteScroll) {
        await this.handleInfiniteScroll(page);
      }

      // Esperar contenido dinámico
      await this.waitForDynamicContent(page, dealership);

      // Intentar extraer de datos interceptados primero
      if (interceptedData.length > 0) {
        const apiVehicles = this.extractFromAPIData(interceptedData, dealership);
        results.push(...apiVehicles);
        console.log(`📡 ${apiVehicles.length} vehículos extraídos de API`);
      }

      // Extraer vehículos del DOM
      const domVehicles = await this.extractVehiclesFromDOM(page, dealership);
      results.push(...domVehicles);

      console.log(`✅ ${dealership.name}: ${results.length} vehículos encontrados`);

    } catch (error) {
      console.error(`❌ Error en ${dealership.name}:`, error.message);
    } finally {
      await page.close();
    }

    return results;
  }

  // Esperar contenido dinámico
  async waitForDynamicContent(page, dealership) {
    const selectors = dealership.specificSelectors || this.selectors;
    
    console.log('⏳ Esperando contenido dinámico...');
    
    // Intentar diferentes selectores
    for (const selector of selectors.containers || this.selectors.containers) {
      try {
        await page.waitForSelector(selector, { timeout: 10000 });
        console.log(`📦 Contenido encontrado: ${selector}`);
        
        // Esperar a que aparezcan elementos hijos
        await page.waitForFunction((containerSelector) => {
          const container = document.querySelector(containerSelector);
          return container && container.children.length > 0;
        }, selector, { timeout: 10000 });
        
        return;
      } catch (error) {
        continue;
      }
    }

    console.log('⚠️ No se encontró contenido específico, continuando...');
  }

  // Extraer datos de APIs interceptadas
  extractFromAPIData(interceptedData, dealership) {
    const vehicles = [];
    
    interceptedData.forEach(({ data, url }) => {
      try {
        if (Array.isArray(data)) {
          // Datos en formato array
          data.forEach((item, index) => {
            const vehicle = this.normalizeAPIVehicle(item, dealership, index);
            if (vehicle) vehicles.push(vehicle);
          });
        } else if (data.results && Array.isArray(data.results)) {
          // Datos en formato { results: [...] }
          data.results.forEach((item, index) => {
            const vehicle = this.normalizeAPIVehicle(item, dealership, index);
            if (vehicle) vehicles.push(vehicle);
          });
        } else if (data.data && Array.isArray(data.data)) {
          // Datos en formato { data: [...] }
          data.data.forEach((item, index) => {
            const vehicle = this.normalizeAPIVehicle(item, dealership, index);
            if (vehicle) vehicles.push(vehicle);
          });
        }
      } catch (error) {
        console.log(`Error procesando datos API: ${error.message}`);
      }
    });

    return vehicles;
  }

  // Normalizar datos de vehículo desde API
  normalizeAPIVehicle(item, dealership, index) {
    try {
      const vehicle = {
        dealership: dealership.name,
        id: `${dealership.name.toLowerCase().replace(/\s+/g, '-')}-api-${index}`,
        timestamp: new Date().toISOString(),
        source: 'API'
      };

      // Mapear campos comunes
      const fieldMappings = {
        title: ['title', 'name', 'model', 'description', 'vehicleName'],
        price: ['price', 'cost', 'amount', 'value', 'priceAmount'],
        year: ['year', 'modelYear', 'fabricationYear'],
        mileage: ['mileage', 'km', 'kilometers', 'odometer'],
        brand: ['brand', 'make', 'manufacturer'],
        model: ['model', 'modelName'],
        color: ['color', 'colour'],
        location: ['location', 'city', 'region'],
        imageUrl: ['image', 'imageUrl', 'photo', 'picture', 'thumbnail']
      };

      Object.keys(fieldMappings).forEach(field => {
        for (const apiField of fieldMappings[field]) {
          if (item[apiField] !== undefined && item[apiField] !== null) {
            vehicle[field] = item[apiField];
            break;
          }
        }
      });

      // Extraer precio numérico
      if (vehicle.price && typeof vehicle.price === 'string') {
        const priceMatch = vehicle.price.match(/[\d.,]+/);
        if (priceMatch) {
          vehicle.priceNumeric = parseFloat(priceMatch[0].replace(/[.,]/g, ''));
        }
      }

      return vehicle.title ? vehicle : null;

    } catch (error) {
      console.log(`Error normalizando vehículo API: ${error.message}`);
      return null;
    }
  }

  // Extraer vehículos del DOM
  async extractVehiclesFromDOM(page, dealership) {
    const selectors = dealership.specificSelectors || this.selectors;
    
    return await page.evaluate((selectors, dealerName, baseUrl) => {
      const vehicles = [];
      
      // Buscar contenedor
      let container = null;
      for (const containerSelector of selectors.containers || []) {
        container = document.querySelector(containerSelector);
        if (container) break;
      }

      if (!container) {
        console.log('No se encontró contenedor de productos');
        return vehicles;
      }

      // Buscar elementos de productos
      let items = [];
      for (const itemSelector of selectors.items || []) {
        items = container.querySelectorAll(itemSelector);
        if (items.length > 0) break;
      }

      console.log(`Procesando ${items.length} elementos React encontrados`);

      items.forEach((item, index) => {
        try {
          const vehicle = {
            dealership: dealerName,
            id: `${dealerName.toLowerCase().replace(/\s+/g, '-')}-dom-${index}`,
            timestamp: new Date().toISOString(),
            source: 'DOM'
          };

          // Extraer título
          for (const titleSelector of selectors.titles || []) {
            const titleElement = item.querySelector(titleSelector);
            if (titleElement && titleElement.textContent.trim()) {
              vehicle.title = titleElement.textContent.trim();
              break;
            }
          }

          // Extraer precio
          for (const priceSelector of selectors.prices || []) {
            const priceElement = item.querySelector(priceSelector);
            if (priceElement && priceElement.textContent.trim()) {
              vehicle.priceText = priceElement.textContent.trim();
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
              vehicle.imageUrl = imgElement.getAttribute('src') || 
                               imgElement.getAttribute('data-src') ||
                               imgElement.getAttribute('data-lazy-src');
              
              if (vehicle.imageUrl && !vehicle.imageUrl.startsWith('http')) {
                vehicle.imageUrl = baseUrl + vehicle.imageUrl;
              }
              break;
            }
          }

          // Extraer enlace
          const linkElement = item.querySelector('a[href]');
          if (linkElement) {
            vehicle.detailUrl = linkElement.getAttribute('href');
            if (vehicle.detailUrl && !vehicle.detailUrl.startsWith('http')) {
              vehicle.detailUrl = baseUrl + vehicle.detailUrl;
            }
          }

          // Extraer datos adicionales del texto
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
    console.log('🚀 Iniciando React/Next.js MCP Scraper...');
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
      console.log(`🔄 Scraping React/Next site: ${url}`);
      
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      const features = await this.detectReactFeatures(page);
      console.log('📊 Características detectadas:', features);

      const dealership = {
        name: 'Custom React Site',
        url: url,
        specificSelectors: { ...this.selectors, ...customSelectors },
        features: { hasInfiniteScroll: true }
      };

      await this.waitForReactHydration(page);
      await this.waitForDynamicContent(page, dealership);
      
      if (dealership.features.hasInfiniteScroll) {
        await this.handleInfiniteScroll(page);
      }

      const vehicles = await this.extractVehiclesFromDOM(page, dealership);
      
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
async function scrapeReactDealerships() {
  const scraper = new ReactNextMCPScraper();
  return await scraper.scrapeAll();
}

async function scrapeReactSite(url, selectors = {}) {
  const scraper = new ReactNextMCPScraper();
  return await scraper.scrapeByUrl(url, selectors);
}

// Exportar para uso en otros módulos
module.exports = {
  ReactNextMCPScraper,
  scrapeReactDealerships,
  scrapeReactSite
};

// Ejemplo de uso directo
if (require.main === module) {
  (async () => {
    try {
      console.log('🏁 Iniciando scraping React/Next.js de prueba...');
      
      // Scraper un sitio específico (descomenta para probar)
      const results = await scrapeReactSite('https://www.kavak.com/ar/');
      
      console.log('\n📊 RESULTADOS FINALES:');
      console.log(JSON.stringify(results, null, 2));
      
    } catch (error) {
      console.error('💥 Error fatal:', error);
    }
  })();
}