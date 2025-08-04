// scraper-grupos-5-6-7-especiales.js
// Playwright MCP Scraper para Grupos Especiales
// Grupo 5: Redes Sociales Only, Grupo 6: Sistemas de Gestión, Grupo 7: Híbridos

const { chromium } = require('playwright');

class SpecialGroupsMCPScraper {
  constructor(config = {}) {
    this.config = {
      headless: true,
      timeout: 45000,
      delay: 3000,
      maxPages: 3,
      ...config
    };

    // Grupo 5: Redes Sociales Only
    this.socialMediaDealerships = [
      {
        name: 'Indiana Usados',
        platform: 'Facebook',
        url: 'https://www.facebook.com/indianausados',
        type: 'social-media',
        features: {
          requiresLogin: true,
          hasPostStructure: true,
          needsSpecialHandling: true
        }
      },
      {
        name: 'Autosok Tucumán',
        platform: 'Instagram',
        url: 'https://www.instagram.com/autosoktuc',
        type: 'social-media',
        features: {
          requiresLogin: true,
          hasStories: true,
          needsSpecialHandling: true
        }
      }
    ];

    // Grupo 6: Sistemas de Gestión Automotriz
    this.managementSystemDealerships = [
      {
        name: 'Kumenia Renault',
        url: 'https://www.kumenia.com',
        searchPath: '/usados',
        type: 'management-system',
        systemType: 'automotive-crm',
        specificSelectors: {
          container: '.vehicles-grid, .stock-vehicles',
          item: '.vehicle-card, .stock-item',
          title: '.vehicle-name, .model-title',
          price: '.vehicle-price, .stock-price',
          specs: '.vehicle-specs, .technical-data'
        },
        features: {
          hasStockManagement: true,
          hasDetailedSpecs: true,
          brandSpecific: 'Renault'
        }
      },
      {
        name: 'SION Autocenter',
        url: 'https://sionautocenter.com.ar',
        searchPath: '/vehiculos/',
        type: 'management-system',
        systemType: 'automotive-crm',
        specificSelectors: {
          container: '.vehicles, .inventory',
          item: '.vehicle, .inventory-item',
          title: '.vehicle-title, h3',
          price: '.price, .vehicle-price'
        },
        features: {
          hasInventorySystem: true,
          hasFinancing: true
        }
      },
      {
        name: 'Pirerayen Fiat',
        url: 'https://pirerayenfiat.com.ar',
        searchPath: '/unidades/',
        type: 'management-system',
        systemType: 'automotive-crm',
        specificSelectors: {
          container: '.unidades, .vehicles',
          item: '.unidad, .vehicle-unit',
          title: '.unidad-title, .vehicle-name',
          price: '.unidad-price, .price'
        },
        features: {
          brandSpecific: 'Fiat',
          hasUnitManagement: true
        }
      }
    ];

    // Grupo 7: Sistemas Híbridos/Modernos
    this.hybridSystemDealerships = [
      {
        name: 'Grupo Randazzo',
        url: 'https://www.gruporandazzo.com',
        searchPath: '/vehiculos/',
        type: 'hybrid-system',
        technologies: ['swiper.js', 'custom-framework'],
        specificSelectors: {
          container: '.swiper-container, .vehicle-grid',
          item: '.swiper-slide, .vehicle-item',
          title: '.vehicle-title, .slide-title',
          price: '.vehicle-price, .slide-price'
        },
        features: {
          hasCarousel: true,
          usesSwiper: true,
          hasAjaxLoading: true
        }
      },
      {
        name: 'Autocity',
        url: 'https://autocity.com.ar',
        searchPath: '/autos/',
        type: 'hybrid-system',
        technologies: ['headless-cms', 'modern-framework'],
        specificSelectors: {
          container: '.vehicles, .cars-grid',
          item: '.vehicle, .car-item',
          title: '.car-title, h3',
          price: '.car-price, .price'
        },
        features: {
          hasHeadlessCMS: true,
          hasModernArchitecture: true
        }
      },
      {
        name: 'Montironi',
        url: 'https://montironi.com',
        searchPath: '/usados/',
        type: 'hybrid-system',
        technologies: ['custom-system'],
        specificSelectors: {
          container: '.usados, .vehicles',
          item: '.usado, .vehicle',
          title: '.usado-title, .vehicle-name',
          price: '.usado-price, .price'
        },
        features: {
          hasCustomSystem: true,
          isModernDesign: true
        }
      },
      {
        name: 'AVEC',
        url: 'https://avec.com.ar',
        searchPath: '/vehiculos/',
        type: 'hybrid-system',
        technologies: ['advanced-platform'],
        specificSelectors: {
          container: '.vehiculos, .catalog',
          item: '.vehiculo, .catalog-item',
          title: '.vehiculo-name, .item-title',
          price: '.vehiculo-price, .item-price'
        },
        features: {
          hasAdvancedPlatform: true,
          hasCustomDesign: true
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

  // ===== GRUPO 5: REDES SOCIALES =====

  async scrapeSocialMediaDealer(dealer) {
    console.log(`\n📱 Iniciando scraping de ${dealer.name} (${dealer.platform})...`);
    
    // NOTA: Este es un scraper prototipo para redes sociales
    // En un entorno real, requeriría APIs oficiales y autenticación
    
    const mockResults = [
      {
        dealership: dealer.name,
        platform: dealer.platform,
        id: `${dealer.name.toLowerCase().replace(/\s+/g, '-')}-social-1`,
        title: `${dealer.platform} Post - Vehículo 1`,
        description: 'Vehículo publicado en redes sociales',
        source: 'Social Media',
        timestamp: new Date().toISOString(),
        notes: 'Requiere scraping especializado de redes sociales con APIs oficiales',
        limitations: [
          'Necesita autenticación',
          'Requiere API oficial',
          'Contenido dinámico limitado',
          'Políticas de uso restrictivas'
        ]
      }
    ];

    console.log(`📱 ${dealer.name}: Scraping de redes sociales requiere implementación especializada`);
    console.log(`   - Plataforma: ${dealer.platform}`);
    console.log(`   - URL: ${dealer.url}`);
    console.log(`   - Requiere: API oficial, autenticación, permisos especiales`);
    
    return mockResults;
  }

  // ===== GRUPO 6: SISTEMAS DE GESTIÓN AUTOMOTRIZ =====

  async detectManagementSystemFeatures(page) {
    const features = {
      isAutomotiveCRM: false,
      hasStockManagement: false,
      hasInventorySystem: false,
      hasFinancingModule: false,
      hasVehicleSpecs: false,
      systemProvider: null
    };

    try {
      // Detectar características de CRM automotriz
      features.hasStockManagement = await page.evaluate(() => {
        return !!(
          document.querySelector('.stock') ||
          document.querySelector('.inventory') ||
          document.querySelector('[class*="stock"]') ||
          document.documentElement.outerHTML.includes('stock')
        );
      });

      features.hasFinancingModule = await page.evaluate(() => {
        return !!(
          document.querySelector('.financing') ||
          document.querySelector('.financiacion') ||
          document.querySelector('.credito') ||
          document.documentElement.outerHTML.includes('financing')
        );
      });

      features.hasVehicleSpecs = await page.evaluate(() => {
        return !!(
          document.querySelector('.specs') ||
          document.querySelector('.technical') ||
          document.querySelector('.especificaciones') ||
          document.querySelector('.ficha-tecnica')
        );
      });

      // Detectar proveedor del sistema
      const systemIndicators = await page.evaluate(() => {
        const html = document.documentElement.outerHTML.toLowerCase();
        const providers = {
          dealernet: html.includes('dealernet'),
          cobresol: html.includes('cobresol'),
          sinpar: html.includes('sinpar'),
          automotriz: html.includes('sistema-automotriz')
        };
        return providers;
      });

      features.systemProvider = Object.keys(systemIndicators).find(provider => systemIndicators[provider]) || 'unknown';
      features.isAutomotiveCRM = features.hasStockManagement || features.hasVehicleSpecs;

    } catch (error) {
      console.log('Error detectando características del sistema:', error.message);
    }

    return features;
  }

  async scrapeManagementSystemDealer(dealer) {
    const page = await this.context.newPage();
    const results = [];

    try {
      console.log(`\n🏢 Iniciando scraping de ${dealer.name} (Sistema de Gestión)...`);
      
      const fullUrl = dealer.url + (dealer.searchPath || '');
      await page.goto(fullUrl, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      const features = await this.detectManagementSystemFeatures(page);
      console.log(`📊 Sistema detectado:`, features);

      // Esperar a que cargue el contenido del sistema
      await page.waitForTimeout(5000);

      // Manejar sistemas que requieren interacción adicional
      if (features.hasStockManagement) {
        await this.handleStockManagementSystem(page);
      }

      const vehicles = await this.extractFromManagementSystem(page, dealer);
      results.push(...vehicles);

      console.log(`✅ ${dealer.name}: ${results.length} vehículos encontrados en sistema de gestión`);

    } catch (error) {
      console.error(`❌ Error en sistema de gestión ${dealer.name}:`, error.message);
    } finally {
      await page.close();
    }

    return results;
  }

  async handleStockManagementSystem(page) {
    console.log('🔧 Manejando sistema de gestión de stock...');
    
    try {
      // Buscar y clickear botón de "Ver Stock" o similar
      const stockButtons = [
        '.ver-stock',
        '.show-inventory',
        '.load-vehicles',
        'button[onclick*="stock"]',
        'a[href*="stock"]'
      ];

      for (const buttonSelector of stockButtons) {
        try {
          await page.click(buttonSelector);
          console.log(`✅ Botón de stock clickeado: ${buttonSelector}`);
          await page.waitForTimeout(3000);
          break;
        } catch (error) {
          continue;
        }
      }

    } catch (error) {
      console.log('⚠️ No se pudo interactuar con el sistema de stock');
    }
  }

  async extractFromManagementSystem(page, dealer) {
    const selectors = dealer.specificSelectors;
    
    return await page.evaluate((selectors, dealerName, baseUrl) => {
      const vehicles = [];
      
      // Buscar contenedor específico del sistema
      let container = null;
      for (const containerSelector of selectors.containers || ['.vehicles', '.stock', '.inventory']) {
        container = document.querySelector(containerSelector);
        if (container) break;
      }

      if (!container) {
        console.log('No se encontró contenedor del sistema de gestión');
        return vehicles;
      }

      // Buscar elementos de vehículos
      let items = [];
      for (const itemSelector of selectors.items || ['.vehicle', '.stock-item']) {
        items = container.querySelectorAll(itemSelector);
        if (items.length > 0) break;
      }

      console.log(`Procesando ${items.length} vehículos del sistema de gestión`);

      items.forEach((item, index) => {
        try {
          const vehicle = {
            dealership: dealerName,
            systemType: 'management-system',
            id: `${dealerName.toLowerCase().replace(/\s+/g, '-')}-mgmt-${index}`,
            timestamp: new Date().toISOString(),
            source: 'Management System'
          };

          // Extraer título
          for (const titleSelector of selectors.titles || ['.vehicle-name', 'h3']) {
            const titleElement = item.querySelector(titleSelector);
            if (titleElement && titleElement.textContent.trim()) {
              vehicle.title = titleElement.textContent.trim();
              break;
            }
          }

          // Extraer precio
          for (const priceSelector of selectors.prices || ['.price', '.vehicle-price']) {
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

          // Extraer especificaciones técnicas si están disponibles
          if (selectors.specs) {
            const specsElement = item.querySelector(selectors.specs);
            if (specsElement) {
              vehicle.specifications = specsElement.textContent.trim();
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

          // Extraer información adicional común en sistemas de gestión
          const dataAttributes = item.attributes;
          for (let i = 0; i < dataAttributes.length; i++) {
            const attr = dataAttributes[i];
            if (attr.name.startsWith('data-')) {
              vehicle[attr.name.replace('data-', '')] = attr.value;
            }
          }

          if (vehicle.title && vehicle.title.length > 0) {
            vehicles.push(vehicle);
          }

        } catch (error) {
          console.log(`Error procesando vehículo ${index}:`, error.message);
        }
      });

      return vehicles;
    }, selectors, dealer.name, dealer.url);
  }

  // ===== GRUPO 7: SISTEMAS HÍBRIDOS =====

  async detectHybridSystemFeatures(page) {
    const features = {
      usesSwiper: false,
      hasCarousel: false,
      hasAjaxLoading: false,
      hasHeadlessCMS: false,
      hasCustomFramework: false,
      detectedTechnologies: []
    };

    try {
      // Detectar Swiper.js
      features.usesSwiper = await page.evaluate(() => {
        return !!(
          window.Swiper ||
          document.querySelector('.swiper-container') ||
          document.querySelector('[class*="swiper"]') ||
          document.documentElement.outerHTML.includes('swiper')
        );
      });

      // Detectar carrusel
      features.hasCarousel = await page.evaluate(() => {
        return !!(
          document.querySelector('.carousel') ||
          document.querySelector('.slider') ||
          document.querySelector('[class*="slide"]')
        );
      });

      // Detectar AJAX loading
      features.hasAjaxLoading = await page.evaluate(() => {
        return !!(
          document.querySelector('[data-ajax]') ||
          document.querySelector('.ajax-load') ||
          document.documentElement.outerHTML.includes('ajax')
        );
      });

      // Detectar tecnologías
      const technologies = await page.evaluate(() => {
        const html = document.documentElement.outerHTML.toLowerCase();
        const techs = [];
        
        if (html.includes('swiper')) techs.push('Swiper.js');
        if (html.includes('vue.js') || html.includes('vue')) techs.push('Vue.js');
        if (html.includes('angular')) techs.push('Angular');
        if (html.includes('bootstrap')) techs.push('Bootstrap');
        if (html.includes('tailwind')) techs.push('Tailwind CSS');
        if (html.includes('headless')) techs.push('Headless CMS');
        
        return techs;
      });

      features.detectedTechnologies = technologies;
      features.hasCustomFramework = technologies.length > 0;

    } catch (error) {
      console.log('Error detectando características híbridas:', error.message);
    }

    return features;
  }

  async scrapeHybridSystemDealer(dealer) {
    const page = await this.context.newPage();
    const results = [];

    try {
      console.log(`\n🔀 Iniciando scraping de ${dealer.name} (Sistema Híbrido)...`);
      
      const fullUrl = dealer.url + (dealer.searchPath || '');
      await page.goto(fullUrl, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      const features = await this.detectHybridSystemFeatures(page);
      console.log(`📊 Tecnologías detectadas:`, features);

      // Esperar a que se inicialicen los componentes dinámicos
      await page.waitForTimeout(5000);

      // Manejar Swiper si está presente
      if (features.usesSwiper) {
        await this.handleSwiperCarousel(page);
      }

      // Manejar carga AJAX si está presente
      if (features.hasAjaxLoading) {
        await this.handleAjaxLoading(page);
      }

      const vehicles = await this.extractFromHybridSystem(page, dealer);
      results.push(...vehicles);

      console.log(`✅ ${dealer.name}: ${results.length} vehículos encontrados en sistema híbrido`);

    } catch (error) {
      console.error(`❌ Error en sistema híbrido ${dealer.name}:`, error.message);
    } finally {
      await page.close();
    }

    return results;
  }

  async handleSwiperCarousel(page) {
    console.log('🎠 Manejando carrusel Swiper...');
    
    try {
      // Intentar navegar por el carrusel para cargar todos los elementos
      const swiperNext = '.swiper-button-next, .swiper-next, .next-slide';
      const swiperPrev = '.swiper-button-prev, .swiper-prev, .prev-slide';
      
      // Ir al primer slide
      await page.click(swiperPrev).catch(() => {});
      await page.waitForTimeout(1000);
      
      // Navegar por varios slides
      for (let i = 0; i < 10; i++) {
        try {
          await page.click(swiperNext);
          await page.waitForTimeout(1500);
        } catch (error) {
          break; // No hay más slides
        }
      }
      
      console.log('✅ Carrusel navegado completamente');
      
    } catch (error) {
      console.log('⚠️ Error navegando carrusel:', error.message);
    }
  }

  async handleAjaxLoading(page) {
    console.log('⚡ Manejando carga AJAX...');
    
    try {
      // Buscar botones de "Cargar más" o similares
      const loadMoreButtons = [
        '.load-more',
        '.cargar-mas',
        '.show-more',
        'button[onclick*="load"]',
        '.ajax-load'
      ];

      for (const buttonSelector of loadMoreButtons) {
        try {
          const button = await page.$(buttonSelector);
          if (button) {
            await button.click();
            console.log(`✅ Botón AJAX clickeado: ${buttonSelector}`);
            await page.waitForTimeout(3000);
            break;
          }
        } catch (error) {
          continue;
        }
      }

    } catch (error) {
      console.log('⚠️ Error con carga AJAX:', error.message);
    }
  }

  async extractFromHybridSystem(page, dealer) {
    const selectors = dealer.specificSelectors;
    
    return await page.evaluate((selectors, dealerName, baseUrl) => {
      const vehicles = [];
      
      // Buscar contenedor híbrido
      let container = null;
      for (const containerSelector of selectors.containers || ['.swiper-container', '.vehicle-grid']) {
        container = document.querySelector(containerSelector);
        if (container) break;
      }

      if (!container) {
        container = document.body;
      }

      // Buscar elementos - pueden estar en slides o en grid
      let items = [];
      for (const itemSelector of selectors.items || ['.swiper-slide', '.vehicle-item']) {
        items = container.querySelectorAll(itemSelector);
        if (items.length > 0) break;
      }

      console.log(`Procesando ${items.length} elementos del sistema híbrido`);

      items.forEach((item, index) => {
        try {
          const vehicle = {
            dealership: dealerName,
            systemType: 'hybrid-system',
            id: `${dealerName.toLowerCase().replace(/\s+/g, '-')}-hybrid-${index}`,
            timestamp: new Date().toISOString(),
            source: 'Hybrid System'
          };

          // Extraer título
          for (const titleSelector of selectors.titles || ['.vehicle-title', '.slide-title']) {
            const titleElement = item.querySelector(titleSelector);
            if (titleElement && titleElement.textContent.trim()) {
              vehicle.title = titleElement.textContent.trim();
              break;
            }
          }

          // Extraer precio
          for (const priceSelector of selectors.prices || ['.vehicle-price', '.slide-price']) {
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

          // Extraer imagen (puede estar en slide)
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

          if (vehicle.title && vehicle.title.length > 0) {
            vehicles.push(vehicle);
          }

        } catch (error) {
          console.log(`Error procesando elemento híbrido ${index}:`, error.message);
        }
      });

      return vehicles;
    }, selectors, dealer.name, dealer.url);
  }

  // ===== MÉTODOS PRINCIPALES =====

  async scrapeAllSpecialGroups() {
    console.log('🚀 Iniciando Special Groups MCP Scraper...');
    
    await this.initBrowser();
    const allResults = {
      socialMedia: [],
      managementSystems: [],
      hybridSystems: []
    };

    try {
      // Grupo 5: Redes Sociales (solo mock por limitaciones técnicas)
      console.log('\n📱 === GRUPO 5: REDES SOCIALES ===');
      for (const dealer of this.socialMediaDealerships) {
        const results = await this.scrapeSocialMediaDealer(dealer);
        allResults.socialMedia.push({
          dealership: dealer.name,
          platform: dealer.platform,
          count: results.length,
          vehicles: results
        });
      }

      // Grupo 6: Sistemas de Gestión
      console.log('\n🏢 === GRUPO 6: SISTEMAS DE GESTIÓN ===');
      for (const dealer of this.managementSystemDealerships) {
        const results = await this.scrapeManagementSystemDealer(dealer);
        allResults.managementSystems.push({
          dealership: dealer.name,
          systemType: dealer.systemType,
          count: results.length,
          vehicles: results
        });
        
        await new Promise(resolve => setTimeout(resolve, this.config.delay));
      }

      // Grupo 7: Sistemas Híbridos
      console.log('\n🔀 === GRUPO 7: SISTEMAS HÍBRIDOS ===');
      for (const dealer of this.hybridSystemDealerships) {
        const results = await this.scrapeHybridSystemDealer(dealer);
        allResults.hybridSystems.push({
          dealership: dealer.name,
          technologies: dealer.technologies,
          count: results.length,
          vehicles: results
        });
        
        await new Promise(resolve => setTimeout(resolve, this.config.delay));
      }

    } catch (error) {
      console.error('❌ Error general en grupos especiales:', error.message);
    } finally {
      await this.closeBrowser();
    }

    return allResults;
  }
}

// Funciones de utilidad
async function scrapeSpecialGroups() {
  const scraper = new SpecialGroupsMCPScraper();
  return await scraper.scrapeAllSpecialGroups();
}

// Exportar para uso en otros módulos
module.exports = {
  SpecialGroupsMCPScraper,
  scrapeSpecialGroups
};

// Ejemplo de uso directo
if (require.main === module) {
  (async () => {
    try {
      console.log('🏁 Iniciando scraping de grupos especiales...');
      
      const results = await scrapeSpecialGroups();
      
      console.log('\n📊 RESULTADOS FINALES:');
      console.log('📱 Redes Sociales:', results.socialMedia.length);
      console.log('🏢 Sistemas de Gestión:', results.managementSystems.length);
      console.log('🔀 Sistemas Híbridos:', results.hybridSystems.length);
      
      console.log('\nDetalle por grupo:');
      console.log(JSON.stringify(results, null, 2));
      
    } catch (error) {
      console.error('💥 Error fatal:', error);
    }
  })();
}