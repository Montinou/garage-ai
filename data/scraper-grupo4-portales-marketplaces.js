// scraper-grupo4-portales-marketplaces.js
// Playwright MCP Scraper para Grupo 4: Portales/Marketplaces
// Concesionarias: Zona Auto, Autocosmos, DeRuedas, Autos Misiones, etc.

const { chromium } = require('playwright');

class PortalMarketplaceMCPScraper {
  constructor(config = {}) {
    this.config = {
      headless: true,
      timeout: 45000,
      delay: 3000,
      maxPages: 10, // Portales tienen más contenido
      maxVehiclesPerSearch: 500,
      ...config
    };
    
    // Configuraciones específicas para portales/marketplaces
    this.selectors = {
      // Selectores comunes para portales
      containers: [
        '.search-results',
        '.results',
        '.listings',
        '.vehicles',
        '.autos',
        '.grid',
        '.list',
        '.content'
      ],
      items: [
        '.vehicle-item',
        '.auto-item',
        '.listing',
        '.card',
        '.item',
        '.result',
        '.product'
      ],
      titles: [
        '.vehicle-title',
        '.auto-title',
        '.title',
        '.name',
        'h1', 'h2', 'h3', 'h4',
        '.heading'
      ],
      prices: [
        '.price',
        '.precio',
        '.cost',
        '.amount',
        '.value'
      ],
      images: [
        '.vehicle-image img',
        '.auto-image img',
        '.listing-image img',
        '.photo img',
        'img[alt*="auto"]',
        'img[alt*="car"]',
        'img'
      ],
      links: [
        '.vehicle-link',
        '.auto-link',
        'a[href*="vehicle"]',
        'a[href*="auto"]',
        'a[href*="detail"]',
        'a'
      ],
      pagination: [
        '.pagination',
        '.pager',
        '.page-nav',
        '.next',
        '.siguiente'
      ],
      filters: [
        '.filters',
        '.search-filters',
        '.filtros'
      ]
    };

    this.portals = [
      {
        name: 'Zona Auto Argentina',
        url: 'https://zonaauto.com.ar',
        searchPath: '/autos-usados/',
        apiEndpoints: [
          '/api/search',
          '/api/vehicles'
        ],
        specificSelectors: {
          container: '.search-results, .vehicles-grid',
          item: '.vehicle-item, .auto-card',
          title: '.vehicle-title, h3',
          price: '.price, .precio',
          dealer: '.dealer-name, .concesionario'
        },
        features: {
          hasAPIAccess: true,
          hasAdvancedFilters: true,
          hasMultipleDealers: true,
          paginationType: 'infinite-scroll'
        }
      },
      {
        name: 'Autocosmos Argentina',
        url: 'https://www.autocosmos.com.ar',
        searchPath: '/auto/usado',
        apiEndpoints: [
          '/clasificados/api/search'
        ],
        specificSelectors: {
          container: '.results-container, .clasificados',
          item: '.clasificado-item, .result-item',
          title: '.clasificado-title, .auto-title',
          price: '.clasificado-price, .price',
          location: '.location, .ubicacion'
        },
        features: {
          hasAPIAccess: true,
          hasAdvancedSearch: true,
          hasLocationFilters: true,
          paginationType: 'numbered'
        }
      },
      {
        name: 'DeRuedas Argentina',
        url: 'https://www.deruedas.com.ar',
        searchPath: '/autos/',
        specificSelectors: {
          container: '.results, .autos-grid',
          item: '.auto-item, .vehicle-card',
          title: '.auto-title, h2',
          price: '.auto-price, .price',
          specs: '.auto-specs, .specifications'
        },
        features: {
          hasDetailedSpecs: true,
          hasImageGallery: true,
          paginationType: 'numbered'
        }
      },
      {
        name: 'Autos Misiones',
        url: 'https://www.autosmisiones.com',
        searchPath: '/autos-usados/',
        specificSelectors: {
          container: '.autos, .vehicles',
          item: '.auto, .vehicle',
          title: '.auto-titulo, h3',
          price: '.auto-precio, .price',
          contact: '.contact-info, .contacto'
        },
        features: {
          isRegionalPortal: true,
          hasContactInfo: true,
          paginationType: 'simple'
        }
      }
    ];

    // Filtros comunes para portales
    this.commonFilters = {
      priceRange: ['0-50000', '50000-100000', '100000-200000', '200000+'],
      yearRange: ['2020-2024', '2015-2019', '2010-2014', '2005-2009'],
      brands: ['Toyota', 'Ford', 'Chevrolet', 'Volkswagen', 'Fiat', 'Peugeot', 'Renault'],
      conditions: ['usado', 'seminuevo'],
      locations: ['Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza']
    };
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

  // Detección automática de características de portales
  async detectPortalFeatures(page) {
    const features = {
      hasAPI: false,
      hasFilters: false,
      hasInfiniteScroll: false,
      hasPagination: false,
      hasAdvancedSearch: false,
      hasMultipleDealers: false,
      paginationType: 'none'
    };

    try {
      // Detectar filtros
      features.hasFilters = await page.evaluate(() => {
        return !!(
          document.querySelector('.filters') ||
          document.querySelector('.search-filters') ||
          document.querySelector('.filtros') ||
          document.querySelector('select[name*="brand"]') ||
          document.querySelector('select[name*="price"]')
        );
      });

      // Detectar paginación
      features.hasPagination = await page.evaluate(() => {
        return !!(
          document.querySelector('.pagination') ||
          document.querySelector('.pager') ||
          document.querySelector('.page-nav') ||
          document.querySelector('a[href*="page"]')
        );
      });

      // Detectar scroll infinito
      features.hasInfiniteScroll = await page.evaluate(() => {
        return !!(
          document.querySelector('[data-infinite]') ||
          document.querySelector('.infinite-scroll') ||
          document.documentElement.outerHTML.includes('infinite')
        );
      });

      // Detectar múltiples dealers
      features.hasMultipleDealers = await page.evaluate(() => {
        return !!(
          document.querySelector('.dealer') ||
          document.querySelector('.concesionario') ||
          document.querySelector('.seller') ||
          document.querySelector('.vendedor')
        );
      });

      // Determinar tipo de paginación
      if (features.hasInfiniteScroll) {
        features.paginationType = 'infinite-scroll';
      } else if (features.hasPagination) {
        features.paginationType = 'numbered';
      } else {
        features.paginationType = 'simple';
      }

    } catch (error) {
      console.log('Error detectando características del portal:', error.message);
    }

    return features;
  }

  // Interceptor de API para portales que la usen
  async setupPortalAPIInterception(page, portal) {
    const interceptedData = [];
    
    page.on('response', async (response) => {
      const url = response.url();
      
      // Verificar si es una API de vehículos del portal
      if (portal.apiEndpoints?.some(endpoint => url.includes(endpoint)) ||
          (url.includes('/api/') && (
            url.includes('vehicle') || 
            url.includes('auto') || 
            url.includes('clasificado') ||
            url.includes('search') ||
            url.includes('listing')
          ))) {
        
        try {
          const contentType = response.headers()['content-type'];
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log(`📡 API Portal interceptada: ${url}`);
            interceptedData.push({
              url,
              data,
              timestamp: new Date().toISOString(),
              portal: portal.name
            });
          }
        } catch (error) {
          console.log(`⚠️ Error procesando API response del portal: ${error.message}`);
        }
      }
    });

    return interceptedData;
  }

  // Aplicar filtros de búsqueda en el portal
  async applySearchFilters(page, portal, filters = {}) {
    console.log('🎛️ Aplicando filtros de búsqueda...');

    try {
      // Esperar a que aparezcan los filtros
      await page.waitForSelector('.filters, .search-filters, .filtros', { timeout: 10000 });

      // Aplicar filtro de marca si está disponible
      if (filters.brand) {
        const brandSelectors = [
          `select[name*="brand"] option[value*="${filters.brand}"]`,
          `select[name*="marca"] option[value*="${filters.brand}"]`,
          `.filter-brand input[value*="${filters.brand}"]`
        ];

        for (const selector of brandSelectors) {
          try {
            await page.click(selector);
            console.log(`✅ Filtro de marca aplicado: ${filters.brand}`);
            break;
          } catch (error) {
            continue;
          }
        }
      }

      // Aplicar filtro de precio si está disponible
      if (filters.priceRange) {
        const priceSelectors = [
          `select[name*="price"] option[value*="${filters.priceRange}"]`,
          `select[name*="precio"] option[value*="${filters.priceRange}"]`
        ];

        for (const selector of priceSelectors) {
          try {
            await page.click(selector);
            console.log(`✅ Filtro de precio aplicado: ${filters.priceRange}`);
            break;
          } catch (error) {
            continue;
          }
        }
      }

      // Buscar y clickear botón de búsqueda/aplicar filtros
      const searchButtons = [
        '.search-button',
        '.btn-search',
        '.apply-filters',
        'input[type="submit"]',
        'button[type="submit"]'
      ];

      for (const buttonSelector of searchButtons) {
        try {
          await page.click(buttonSelector);
          console.log('🔍 Filtros aplicados');
          await page.waitForTimeout(3000);
          break;
        } catch (error) {
          continue;
        }
      }

    } catch (error) {
      console.log('⚠️ No se pudieron aplicar filtros:', error.message);
    }
  }

  // Manejar scroll infinito en portales
  async handlePortalInfiniteScroll(page, maxVehicles = 500) {
    console.log('♾️ Manejando scroll infinito del portal...');
    
    let vehicleCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 20;
    let previousHeight = 0;

    while (scrollAttempts < maxScrollAttempts && vehicleCount < maxVehicles) {
      // Contar vehículos actuales
      vehicleCount = await page.evaluate(() => {
        const items = document.querySelectorAll('.vehicle-item, .auto-item, .listing, .card, .item, .result');
        return items.length;
      });

      if (vehicleCount >= maxVehicles) {
        console.log(`🛑 Límite de vehículos alcanzado: ${vehicleCount}`);
        break;
      }

      // Scroll hasta abajo
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Esperar a que cargue nuevo contenido
      await page.waitForTimeout(4000);

      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      
      if (currentHeight === previousHeight) {
        // No hay más contenido que cargar
        console.log('🏁 No hay más contenido disponible');
        break;
      }

      previousHeight = currentHeight;
      scrollAttempts++;
      
      console.log(`📜 Scroll ${scrollAttempts}: ${vehicleCount} vehículos, altura ${currentHeight}px`);
    }

    const finalCount = await page.evaluate(() => {
      const items = document.querySelectorAll('.vehicle-item, .auto-item, .listing, .card, .item, .result');
      return items.length;
    });

    console.log(`✅ Scroll completado: ${finalCount} vehículos cargados`);
    return finalCount;
  }

  // Manejar paginación numerada en portales
  async handlePortalPagination(page, portal) {
    const allResults = [];
    let currentPage = 1;
    const maxPages = Math.min(this.config.maxPages, 15); // Limitar páginas en portales

    console.log('📄 Iniciando paginación numerada del portal...');

    while (currentPage <= maxPages) {
      console.log(`📖 Procesando página ${currentPage} de ${portal.name}...`);

      // Extraer vehículos de la página actual
      const pageVehicles = await this.extractVehiclesFromPortalPage(page, portal);
      allResults.push(...pageVehicles);

      if (pageVehicles.length === 0) {
        console.log('❌ No se encontraron vehículos, terminando paginación');
        break;
      }

      // Ir a siguiente página
      const nextPageFound = await this.goToNextPortalPage(page, currentPage);
      
      if (!nextPageFound) {
        console.log('🏁 No hay más páginas disponibles');
        break;
      }

      currentPage++;
      
      // Delay entre páginas
      await new Promise(resolve => setTimeout(resolve, this.config.delay));

      // Verificar si hemos alcanzado el límite de vehículos
      if (allResults.length >= this.config.maxVehiclesPerSearch) {
        console.log(`🛑 Límite máximo de vehículos alcanzado: ${allResults.length}`);
        break;
      }
    }

    console.log(`✅ Paginación completada: ${allResults.length} vehículos en ${currentPage - 1} páginas`);
    return allResults;
  }

  // Navegar a siguiente página en portal
  async goToNextPortalPage(page, currentPage) {
    try {
      // Selectores específicos para portales
      const nextSelectors = [
        `.pagination a[href*="page=${currentPage + 1}"]`,
        `.pagination a[href*="pagina=${currentPage + 1}"]`,
        `.pagination a[href*="p=${currentPage + 1}"]`,
        '.pagination .next',
        '.pagination .siguiente',
        'a[rel="next"]',
        '.pager .next',
        `.page-${currentPage + 1}`,
        '.pagination a:last-child'
      ];

      for (const selector of nextSelectors) {
        try {
          const nextLink = await page.$(selector);
          if (nextLink) {
            const isDisabled = await page.evaluate(el => {
              return el.classList.contains('disabled') || 
                     el.classList.contains('inactive') ||
                     el.getAttribute('aria-disabled') === 'true';
            }, nextLink);

            if (!isDisabled) {
              console.log(`➡️ Navegando con selector: ${selector}`);
              await nextLink.click();
              await page.waitForNavigation({ waitUntil: 'networkidle', timeout: this.config.timeout });
              return true;
            }
          }
        } catch (error) {
          continue;
        }
      }

      // Si no funcionó con clicks, intentar URL directa
      const currentUrl = page.url();
      const nextPageUrl = this.buildPortalNextPageUrl(currentUrl, currentPage + 1);
      
      if (nextPageUrl !== currentUrl) {
        console.log(`➡️ Navegando a URL construida: ${nextPageUrl}`);
        await page.goto(nextPageUrl, { 
          waitUntil: 'networkidle',
          timeout: this.config.timeout 
        });
        return true;
      }

      return false;

    } catch (error) {
      console.log(`Error navegando a página ${currentPage + 1}:`, error.message);
      return false;
    }
  }

  // Construir URL de siguiente página para portal
  buildPortalNextPageUrl(currentUrl, pageNumber) {
    try {
      const url = new URL(currentUrl);
      
      // Parámetros comunes en portales
      const pageParams = ['page', 'pagina', 'p', 'offset', 'from'];
      
      for (const param of pageParams) {
        if (url.searchParams.has(param)) {
          url.searchParams.set(param, pageNumber.toString());
          return url.toString();
        }
      }

      // Si no hay parámetros, agregar el más común
      url.searchParams.set('page', pageNumber.toString());
      return url.toString();

    } catch (error) {
      return currentUrl;
    }
  }

  // Extraer vehículos de una página de portal
  async extractVehiclesFromPortalPage(page, portal) {
    const selectors = portal.specificSelectors || this.selectors;
    
    return await page.evaluate((selectors, portalName, baseUrl) => {
      const vehicles = [];
      
      // Buscar contenedor
      let container = null;
      for (const containerSelector of selectors.containers || []) {
        container = document.querySelector(containerSelector);
        if (container) break;
      }

      if (!container) {
        container = document.body;
      }

      // Buscar elementos de vehículos
      let items = [];
      for (const itemSelector of selectors.items || []) {
        items = container.querySelectorAll(itemSelector);
        if (items.length > 0) break;
      }

      console.log(`Procesando ${items.length} vehículos del portal`);

      items.forEach((item, index) => {
        try {
          const vehicle = {
            portal: portalName,
            id: `${portalName.toLowerCase().replace(/\s+/g, '-')}-${index}`,
            timestamp: new Date().toISOString(),
            source: 'Portal'
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

          // Extraer dealer/concesionario si está disponible
          if (selectors.dealer) {
            for (const dealerSelector of [selectors.dealer]) {
              const dealerElement = item.querySelector(dealerSelector);
              if (dealerElement && dealerElement.textContent.trim()) {
                vehicle.dealer = dealerElement.textContent.trim();
                break;
              }
            }
          }

          // Extraer ubicación si está disponible
          if (selectors.location) {
            for (const locationSelector of [selectors.location]) {
              const locationElement = item.querySelector(locationSelector);
              if (locationElement && locationElement.textContent.trim()) {
                vehicle.location = locationElement.textContent.trim();
                break;
              }
            }
          }

          // Extraer imagen
          const imgElement = item.querySelector('img');
          if (imgElement) {
            vehicle.imageUrl = imgElement.getAttribute('src') || 
                             imgElement.getAttribute('data-src') ||
                             imgElement.getAttribute('data-lazy-src');
            
            if (vehicle.imageUrl && !vehicle.imageUrl.startsWith('http')) {
              vehicle.imageUrl = baseUrl + vehicle.imageUrl;
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

          // Extraer especificaciones adicionales
          if (selectors.specs) {
            const specsElement = item.querySelector(selectors.specs);
            if (specsElement) {
              vehicle.specifications = specsElement.textContent.trim();
              
              // Extraer año y kilometraje de especificaciones
              const yearMatch = vehicle.specifications.match(/\b(19|20)\d{2}\b/);
              if (yearMatch) {
                vehicle.year = parseInt(yearMatch[0]);
              }

              const kmMatch = vehicle.specifications.match(/(\d+(?:\.\d+)?)\s*km/i);
              if (kmMatch) {
                vehicle.mileage = parseFloat(kmMatch[1].replace('.', ''));
              }
            }
          }

          // Extraer información del título si no la tenemos
          if (vehicle.title && !vehicle.year) {
            const yearMatch = vehicle.title.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
              vehicle.year = parseInt(yearMatch[0]);
            }
          }

          if (vehicle.title && !vehicle.mileage) {
            const kmMatch = vehicle.title.match(/(\d+(?:\.\d+)?)\s*km/i);
            if (kmMatch) {
              vehicle.mileage = parseFloat(kmMatch[1].replace('.', ''));
            }
          }

          // Solo agregar si tiene información válida
          if (vehicle.title && vehicle.title.length > 5) {
            vehicles.push(vehicle);
          }

        } catch (error) {
          console.log(`Error procesando elemento ${index}:`, error.message);
        }
      });

      return vehicles;
    }, selectors, portal.name, portal.url);
  }

  // Scraper principal para un portal específico
  async scrapePortal(portal, searchFilters = {}) {
    const page = await this.context.newPage();
    const results = [];

    try {
      console.log(`\n🔄 Iniciando scraping de ${portal.name}...`);
      
      // Configurar interceptor API si es necesario
      let interceptedData = [];
      if (portal.features?.hasAPIAccess) {
        interceptedData = await this.setupPortalAPIInterception(page, portal);
      }

      // Navegar al portal
      const fullUrl = portal.url + (portal.searchPath || '');
      console.log(`🌐 Navegando a: ${fullUrl}`);
      
      await page.goto(fullUrl, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      // Detectar características del portal
      const features = await this.detectPortalFeatures(page);
      console.log(`📊 Características detectadas:`, features);

      // Aplicar filtros si están disponibles
      if (features.hasFilters && Object.keys(searchFilters).length > 0) {
        await this.applySearchFilters(page, portal, searchFilters);
      }

      // Esperar a que cargue el contenido
      await page.waitForTimeout(5000);

      // Manejar según el tipo de paginación
      if (portal.features?.paginationType === 'infinite-scroll') {
        await this.handlePortalInfiniteScroll(page, this.config.maxVehiclesPerSearch);
        const vehicles = await this.extractVehiclesFromPortalPage(page, portal);
        results.push(...vehicles);
      } else if (portal.features?.paginationType === 'numbered') {
        const paginatedResults = await this.handlePortalPagination(page, portal);
        results.push(...paginatedResults);
      } else {
        // Extracción simple de página única
        const vehicles = await this.extractVehiclesFromPortalPage(page, portal);
        results.push(...vehicles);
      }

      // Procesar datos interceptados de API si los hay
      if (interceptedData.length > 0) {
        console.log(`📡 Procesando ${interceptedData.length} respuestas de API interceptadas`);
        // Aquí podrías procesar los datos de API si fuera necesario
      }

      console.log(`✅ ${portal.name}: ${results.length} vehículos encontrados`);

    } catch (error) {
      console.error(`❌ Error en ${portal.name}:`, error.message);
    } finally {
      await page.close();
    }

    return results;
  }

  // Método principal para scraping de todos los portales
  async scrapeAll(searchFilters = {}) {
    console.log('🚀 Iniciando Portal/Marketplace MCP Scraper...');
    console.log(`📋 Portales a procesar: ${this.portals.length}`);
    
    await this.initBrowser();
    const allResults = [];

    try {
      for (const portal of this.portals) {
        const results = await this.scrapePortal(portal, searchFilters);
        allResults.push({
          portal: portal.name,
          url: portal.url,
          count: results.length,
          vehicles: results
        });

        // Delay entre portales
        await new Promise(resolve => setTimeout(resolve, this.config.delay * 2));
      }

    } catch (error) {
      console.error('❌ Error general:', error.message);
    } finally {
      await this.closeBrowser();
    }

    return allResults;
  }

  // Método para scraping de un solo portal por URL
  async scrapeByUrl(url, customSelectors = {}, searchFilters = {}) {
    await this.initBrowser();
    const page = await this.context.newPage();
    
    try {
      console.log(`🔄 Scraping portal: ${url}`);
      
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      const features = await this.detectPortalFeatures(page);
      console.log('📊 Características detectadas:', features);

      const portal = {
        name: 'Custom Portal',
        url: url,
        specificSelectors: { ...this.selectors, ...customSelectors },
        features: features
      };

      if (features.hasFilters && Object.keys(searchFilters).length > 0) {
        await this.applySearchFilters(page, portal, searchFilters);
      }

      await page.waitForTimeout(5000);

      let vehicles = [];
      if (features.paginationType === 'infinite-scroll') {
        await this.handlePortalInfiniteScroll(page, this.config.maxVehiclesPerSearch);
        vehicles = await this.extractVehiclesFromPortalPage(page, portal);
      } else if (features.paginationType === 'numbered') {
        vehicles = await this.handlePortalPagination(page, portal);
      } else {
        vehicles = await this.extractVehiclesFromPortalPage(page, portal);
      }
      
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
async function scrapeAllPortals(filters = {}) {
  const scraper = new PortalMarketplaceMCPScraper();
  return await scraper.scrapeAll(filters);
}

async function scrapePortalSite(url, selectors = {}, filters = {}) {
  const scraper = new PortalMarketplaceMCPScraper();
  return await scraper.scrapeByUrl(url, selectors, filters);
}

// Exportar para uso en otros módulos
module.exports = {
  PortalMarketplaceMCPScraper,
  scrapeAllPortals,
  scrapePortalSite
};

// Ejemplo de uso directo
if (require.main === module) {
  (async () => {
    try {
      console.log('🏁 Iniciando scraping de portales de prueba...');
      
      // Filtros de ejemplo
      const filters = {
        brand: 'Toyota',
        priceRange: '50000-100000'
      };
      
      // Scraper un portal específico
      const results = await scrapePortalSite('https://zonaauto.com.ar/', {}, filters);
      
      console.log('\n📊 RESULTADOS FINALES:');
      console.log(JSON.stringify(results.slice(0, 5), null, 2)); // Solo mostrar primeros 5
      console.log(`\nTotal: ${results.length} vehículos encontrados`);
      
    } catch (error) {
      console.error('💥 Error fatal:', error);
    }
  })();
}