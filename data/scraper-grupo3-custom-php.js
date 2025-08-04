// scraper-grupo3-custom-php.js
// Playwright MCP Scraper para Grupo 3: Custom PHP/HTML
// Concesionarias: Toyota Line Up, Autosol, Jalil Salta, Ford Pussetto, etc.

const { chromium } = require('playwright');

class CustomPHPMCPScraper {
  constructor(config = {}) {
    this.config = {
      headless: true,
      timeout: 30000,
      delay: 2000,
      maxPages: 5,
      ...config
    };
    
    // Configuraciones específicas para sitios PHP tradicionales
    this.selectors = {
      // Selectores comunes para sitios PHP/HTML
      containers: [
        '.vehicles',
        '.cars',
        '.autos',
        '.products',
        '.listings',
        '.content',
        '.main',
        '#vehicles',
        '#cars',
        '#content'
      ],
      items: [
        '.vehicle',
        '.car',
        '.auto',
        '.product',
        '.listing',
        '.item',
        'tr', // Para tablas
        '.row'
      ],
      titles: [
        '.title',
        '.name',
        '.model',
        'h1', 'h2', 'h3', 'h4',
        '.car-title',
        '.vehicle-title'
      ],
      prices: [
        '.price',
        '.precio',
        '.cost',
        '.value',
        '.amount'
      ],
      images: [
        'img[src*="car"]',
        'img[src*="auto"]',
        'img[src*="vehicle"]',
        'img[alt*="car"]',
        'img[alt*="auto"]',
        'img'
      ],
      links: [
        'a[href*="vehicle"]',
        'a[href*="car"]',
        'a[href*="auto"]',
        'a[href*="detail"]',
        'a[href*="ver"]',
        'a'
      ]
    };

    this.dealerships = [
      {
        name: 'Toyota Line Up Usados',
        url: 'https://lineup.com.ar',
        searchPath: '/usados',
        specificSelectors: {
          container: '.vehicles, .usados',
          item: '.vehicle-item, .auto',
          title: '.vehicle-title, h3',
          price: '.price, .precio'
        },
        features: {
          hasTraditionalPagination: true,
          usesTables: false
        }
      },
      {
        name: 'Autosol Salta/Jujuy',
        url: 'https://www.autosol.com.ar',
        searchPath: '/usados',
        specificSelectors: {
          container: '.vehicles, .productos',
          item: '.vehicle, .producto',
          title: 'h2, h3',
          price: '.precio'
        },
        features: {
          hasTraditionalPagination: true,
          hasFilters: true
        }
      },
      {
        name: 'Jalil Salta',
        url: 'https://www.jalilsalta.com.ar',
        searchPath: '/',
        specificSelectors: {
          container: '.cars, .autos',
          item: '.car-item, .auto-item',
          title: '.car-title, h3',
          price: '.price'
        },
        features: {
          hasTraditionalPagination: false,
          usesFrames: false
        }
      },
      {
        name: 'Ford Pussetto',
        url: 'https://www.fordpussetto.com.ar',
        searchPath: '/vehiculos/usados',
        specificSelectors: {
          container: '.vehiculos, .usados',
          item: '.vehiculo',
          title: '.titulo, h2',
          price: '.precio'
        },
        features: {
          hasTraditionalPagination: true,
          brandSpecific: 'Ford'
        }
      },
      {
        name: 'Carmak',
        url: 'https://carmak.com.ar',
        searchPath: '/',
        specificSelectors: {
          container: '.productos, .cars',
          item: '.producto, .car',
          title: 'h3, .titulo',
          price: '.precio, .price'
        },
        features: {
          hasSimpleLayout: true
        }
      },
      {
        name: 'San Vicente Automotores',
        url: 'https://sanvicenteautomotores.com.ar',
        searchPath: '/vehiculos/',
        specificSelectors: {
          container: '.vehiculos',
          item: '.vehiculo-item',
          title: '.vehiculo-titulo',
          price: '.vehiculo-precio'
        },
        features: {
          hasTraditionalPagination: true
        }
      },
      {
        name: 'Malarczuk Automotores',
        url: 'https://malarczuk-autos.com.ar',
        searchPath: '/autos/',
        specificSelectors: {
          container: '.autos',
          item: '.auto',
          title: '.auto-titulo',
          price: '.auto-precio'
        },
        features: {
          hasSimpleLayout: true
        }
      },
      {
        name: 'Armando Automotores',
        url: 'http://www.armandoautomotores.com.ar',
        searchPath: '/vehiculos/',
        specificSelectors: {
          container: '.vehiculos, table',
          item: '.vehiculo, tr',
          title: '.titulo, td',
          price: '.precio, td'
        },
        features: {
          usesTables: true,
          isHTTP: true
        }
      },
      {
        name: 'NEOSTAR',
        url: 'https://neostar.com.ar',
        searchPath: '/autos/',
        specificSelectors: {
          container: '.autos, .vehicles',
          item: '.auto, .vehicle',
          title: 'h3, .title',
          price: '.price'
        },
        features: {
          hasModernDesign: true
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

  // Detección automática de tecnología PHP/HTML tradicional
  async detectPHPFeatures(page) {
    const features = {
      isPHP: false,
      hasTraditionalForms: false,
      usesTables: false,
      hasFrameset: false,
      hasJQuery: false,
      hasBootstrap: false,
      serverInfo: null
    };

    try {
      // Detectar PHP
      const phpIndicators = await page.evaluate(() => {
        const indicators = {
          phpExtension: window.location.href.includes('.php'),
          phpComments: document.documentElement.outerHTML.includes('<?php'),
          phpSession: document.documentElement.outerHTML.includes('PHPSESSID'),
          serverHeaders: true // Will be checked separately
        };
        return indicators;
      });

      features.isPHP = Object.values(phpIndicators).some(indicator => indicator);

      // Detectar uso de tablas para layout
      features.usesTables = await page.evaluate(() => {
        const tables = document.querySelectorAll('table');
        return tables.length > 2; // Más de 2 tablas sugiere layout con tablas
      });

      // Detectar frames
      features.hasFrameset = await page.evaluate(() => {
        return !!(
          document.querySelector('frameset') ||
          document.querySelector('frame') ||
          document.querySelector('iframe[src*="content"]')
        );
      });

      // Detectar jQuery
      features.hasJQuery = await page.evaluate(() => {
        return !!(window.jQuery || window.$);
      });

      // Detectar Bootstrap
      features.hasBootstrap = await page.evaluate(() => {
        return !!(
          document.querySelector('link[href*="bootstrap"]') ||
          document.querySelector('[class*="bootstrap"]') ||
          document.querySelector('.container, .row, .col-')
        );
      });

      // Detectar formularios tradicionales
      features.hasTraditionalForms = await page.evaluate(() => {
        const forms = document.querySelectorAll('form[method="post"], form[method="get"]');
        return forms.length > 0;
      });

    } catch (error) {
      console.log('Error detectando características PHP:', error.message);
    }

    return features;
  }

  // Manejar paginación tradicional
  async handleTraditionalPagination(page, dealership) {
    const results = [];
    let currentPage = 1;
    const maxPages = this.config.maxPages;

    console.log('📄 Iniciando paginación tradicional...');

    while (currentPage <= maxPages) {
      console.log(`📖 Procesando página ${currentPage}...`);

      // Extraer vehículos de la página actual
      const pageVehicles = await this.extractVehiclesFromPage(page, dealership);
      results.push(...pageVehicles);

      if (pageVehicles.length === 0) {
        console.log('❌ No se encontraron vehículos, terminando paginación');
        break;
      }

      // Buscar enlace a siguiente página
      const nextPageFound = await this.goToNextPage(page, currentPage);
      
      if (!nextPageFound) {
        console.log('🏁 No hay más páginas disponibles');
        break;
      }

      currentPage++;
      
      // Delay entre páginas
      await new Promise(resolve => setTimeout(resolve, this.config.delay));
    }

    console.log(`✅ Paginación completada: ${results.length} vehículos en ${currentPage - 1} páginas`);
    return results;
  }

  // Navegar a la siguiente página
  async goToNextPage(page, currentPage) {
    try {
      // Intentar diferentes selectores para "siguiente página"
      const nextSelectors = [
        'a[href*="page=' + (currentPage + 1) + '"]',
        'a[href*="pagina=' + (currentPage + 1) + '"]',
        'a[href*="p=' + (currentPage + 1) + '"]',
        '.next',
        '.siguiente',
        'a[rel="next"]',
        '.pagination a:last-child',
        '.paginacion a:last-child'
      ];

      for (const selector of nextSelectors) {
        const nextLink = await page.$(selector);
        if (nextLink) {
          const href = await nextLink.getAttribute('href');
          if (href) {
            console.log(`➡️ Navegando a: ${href}`);
            await page.goto(href, { 
              waitUntil: 'networkidle',
              timeout: this.config.timeout 
            });
            return true;
          }
        }
      }

      // Si no encontramos enlace, intentar construir URL de página
      const currentUrl = page.url();
      const nextPageUrl = this.buildNextPageUrl(currentUrl, currentPage + 1);
      
      if (nextPageUrl !== currentUrl) {
        console.log(`➡️ Construyendo URL de página: ${nextPageUrl}`);
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

  // Construir URL de siguiente página
  buildNextPageUrl(currentUrl, pageNumber) {
    try {
      const url = new URL(currentUrl);
      
      // Intentar diferentes parámetros de página
      const pageParams = ['page', 'pagina', 'p', 'pg'];
      
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

  // Extraer vehículos de tablas HTML
  async extractFromTables(page, dealership) {
    return await page.evaluate((dealerName) => {
      const vehicles = [];
      const tables = document.querySelectorAll('table');
      
      tables.forEach((table, tableIndex) => {
        const rows = table.querySelectorAll('tr');
        
        // Buscar header para identificar columnas
        const headerRow = rows[0];
        const columnMap = {};
        
        if (headerRow) {
          const headers = headerRow.querySelectorAll('th, td');
          headers.forEach((header, index) => {
            const text = header.textContent.toLowerCase();
            if (text.includes('modelo') || text.includes('vehiculo') || text.includes('auto')) {
              columnMap.title = index;
            } else if (text.includes('precio') || text.includes('price')) {
              columnMap.price = index;
            } else if (text.includes('año') || text.includes('year')) {
              columnMap.year = index;
            } else if (text.includes('km') || text.includes('kilometros')) {
              columnMap.mileage = index;
            }
          });
        }

        // Procesar filas de datos
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const cells = row.querySelectorAll('td');
          
          if (cells.length >= 2) {
            const vehicle = {
              dealership: dealerName,
              id: `${dealerName.toLowerCase().replace(/\s+/g, '-')}-table-${tableIndex}-${i}`,
              timestamp: new Date().toISOString(),
              source: 'Table'
            };

            // Extraer datos según el mapa de columnas
            if (columnMap.title !== undefined && cells[columnMap.title]) {
              vehicle.title = cells[columnMap.title].textContent.trim();
            } else if (cells[0]) {
              vehicle.title = cells[0].textContent.trim();
            }

            if (columnMap.price !== undefined && cells[columnMap.price]) {
              vehicle.priceText = cells[columnMap.price].textContent.trim();
            } else {
              // Buscar precio en todas las celdas
              for (const cell of cells) {
                const text = cell.textContent;
                if (text.match(/\$|precio|price/i) && text.match(/\d/)) {
                  vehicle.priceText = text.trim();
                  break;
                }
              }
            }

            // Extraer precio numérico
            if (vehicle.priceText) {
              const priceMatch = vehicle.priceText.match(/[\d.,]+/);
              if (priceMatch) {
                vehicle.price = parseFloat(priceMatch[0].replace(/[.,]/g, ''));
              }
            }

            // Extraer año si hay columna específica
            if (columnMap.year !== undefined && cells[columnMap.year]) {
              const yearText = cells[columnMap.year].textContent;
              const yearMatch = yearText.match(/\b(19|20)\d{2}\b/);
              if (yearMatch) {
                vehicle.year = parseInt(yearMatch[0]);
              }
            }

            // Buscar imagen en la fila
            const img = row.querySelector('img');
            if (img) {
              vehicle.imageUrl = img.getAttribute('src');
            }

            // Buscar enlace en la fila
            const link = row.querySelector('a[href]');
            if (link) {
              vehicle.detailUrl = link.getAttribute('href');
            }

            if (vehicle.title && vehicle.title.length > 5) {
              vehicles.push(vehicle);
            }
          }
        }
      });

      return vehicles;
    }, dealership.name);
  }

  // Extraer vehículos de una página
  async extractVehiclesFromPage(page, dealership) {
    // Primero intentar extracción por tablas si aplica
    if (dealership.features?.usesTables) {
      const tableVehicles = await this.extractFromTables(page, dealership);
      if (tableVehicles.length > 0) {
        return tableVehicles;
      }
    }

    // Extracción normal por selectores
    const selectors = dealership.specificSelectors || this.selectors;
    
    return await page.evaluate((selectors, dealerName, baseUrl) => {
      const vehicles = [];
      
      // Buscar contenedor
      let container = null;
      for (const containerSelector of selectors.containers || []) {
        container = document.querySelector(containerSelector);
        if (container) break;
      }

      // Si no encontramos contenedor específico, usar body
      if (!container) {
        container = document.body;
      }

      // Buscar elementos de productos
      let items = [];
      for (const itemSelector of selectors.items || []) {
        items = container.querySelectorAll(itemSelector);
        if (items.length > 0) break;
      }

      console.log(`Procesando ${items.length} elementos PHP encontrados`);

      items.forEach((item, index) => {
        try {
          const vehicle = {
            dealership: dealerName,
            id: `${dealerName.toLowerCase().replace(/\s+/g, '-')}-${index}`,
            timestamp: new Date().toISOString(),
            source: 'DOM'
          };

          // Extraer título
          for (const titleSelector of selectors.titles || ['h1', 'h2', 'h3']) {
            const titleElement = item.querySelector(titleSelector);
            if (titleElement && titleElement.textContent.trim()) {
              vehicle.title = titleElement.textContent.trim();
              break;
            }
          }

          // Si no encontramos título, usar todo el texto del elemento
          if (!vehicle.title) {
            const textContent = item.textContent.trim();
            if (textContent.length > 10 && textContent.length < 200) {
              vehicle.title = textContent;
            }
          }

          // Extraer precio
          for (const priceSelector of selectors.prices || ['.price', '.precio']) {
            const priceElement = item.querySelector(priceSelector);
            if (priceElement && priceElement.textContent.trim()) {
              vehicle.priceText = priceElement.textContent.trim();
              break;
            }
          }

          // Buscar precio en el texto si no lo encontramos
          if (!vehicle.priceText) {
            const fullText = item.textContent;
            const priceMatch = fullText.match(/\$[\s]*[\d.,]+|\bprecio[\s]*:?[\s]*[\d.,]+/i);
            if (priceMatch) {
              vehicle.priceText = priceMatch[0];
            }
          }

          // Extraer número del precio
          if (vehicle.priceText) {
            const priceMatch = vehicle.priceText.match(/[\d.,]+/);
            if (priceMatch) {
              vehicle.price = parseFloat(priceMatch[0].replace(/[.,]/g, ''));
            }
          }

          // Extraer imagen
          const imgElement = item.querySelector('img');
          if (imgElement) {
            vehicle.imageUrl = imgElement.getAttribute('src');
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

            // Extraer marca y modelo básico
            const titleUpper = vehicle.title.toUpperCase();
            const brands = ['TOYOTA', 'FORD', 'CHEVROLET', 'VOLKSWAGEN', 'FIAT', 'PEUGEOT', 'RENAULT'];
            for (const brand of brands) {
              if (titleUpper.includes(brand)) {
                vehicle.brand = brand;
                break;
              }
            }
          }

          // Solo agregar si tiene título válido
          if (vehicle.title && vehicle.title.length > 5) {
            vehicles.push(vehicle);
          }

        } catch (error) {
          console.log(`Error procesando elemento ${index}:`, error.message);
        }
      });

      return vehicles;
    }, selectors, dealership.name, dealership.url);
  }

  // Scraper principal para un sitio específico
  async scrapeDealer(dealership) {
    const page = await this.context.newPage();
    const results = [];

    try {
      console.log(`\n🔄 Iniciando scraping de ${dealership.name}...`);
      
      // Navegar al sitio
      const fullUrl = dealership.url + (dealership.searchPath || '');
      console.log(`🌐 Navegando a: ${fullUrl}`);
      
      await page.goto(fullUrl, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      // Detectar características del sitio
      const features = await this.detectPHPFeatures(page);
      console.log(`📊 Características detectadas:`, features);

      // Esperar a que cargue el contenido
      await page.waitForTimeout(3000);

      // Si tiene paginación tradicional, manejarla
      if (dealership.features?.hasTraditionalPagination) {
        const paginatedResults = await this.handleTraditionalPagination(page, dealership);
        results.push(...paginatedResults);
      } else {
        // Scraping de página única
        const pageResults = await this.extractVehiclesFromPage(page, dealership);
        results.push(...pageResults);
      }

      console.log(`✅ ${dealership.name}: ${results.length} vehículos encontrados`);

    } catch (error) {
      console.error(`❌ Error en ${dealership.name}:`, error.message);
    } finally {
      await page.close();
    }

    return results;
  }

  // Método principal para scraping de todos los dealers del grupo
  async scrapeAll() {
    console.log('🚀 Iniciando Custom PHP MCP Scraper...');
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
      console.log(`🔄 Scraping PHP site: ${url}`);
      
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      const features = await this.detectPHPFeatures(page);
      console.log('📊 Características detectadas:', features);

      const dealership = {
        name: 'Custom PHP Site',
        url: url,
        specificSelectors: { ...this.selectors, ...customSelectors },
        features: { hasTraditionalPagination: false }
      };

      await page.waitForTimeout(3000);
      const vehicles = await this.extractVehiclesFromPage(page, dealership);
      
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
async function scrapePHPDealerships() {
  const scraper = new CustomPHPMCPScraper();
  return await scraper.scrapeAll();
}

async function scrapePHPSite(url, selectors = {}) {
  const scraper = new CustomPHPMCPScraper();
  return await scraper.scrapeByUrl(url, selectors);
}

// Exportar para uso en otros módulos
module.exports = {
  CustomPHPMCPScraper,
  scrapePHPDealerships,
  scrapePHPSite
};

// Ejemplo de uso directo
if (require.main === module) {
  (async () => {
    try {
      console.log('🏁 Iniciando scraping PHP de prueba...');
      
      // Scraper un sitio específico 
      const results = await scrapePHPSite('https://lineup.com.ar/usados');
      
      console.log('\n📊 RESULTADOS FINALES:');
      console.log(JSON.stringify(results, null, 2));
      
    } catch (error) {
      console.error('💥 Error fatal:', error);
    }
  })();
}