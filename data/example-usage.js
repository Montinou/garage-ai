// example-usage.js
// Ejemplo de uso del sistema de scraping de concesionarias

const { ScraperFactory, SiteDetector } = require('./scrapers-concesionarias');
const { getSiteConfig } = require('./site-specific-configs');
const { DataUtils, BrowserUtils, PerformanceMonitor } = require('./scraper-utilities');

/**
 * Ejemplo 1: Scraping simple de un sitio WordPress
 */
async function scrapeWordPressSite() {
  console.log('\n📌 Ejemplo 1: Scraping de sitio WordPress (LOX Autos)');
  
  // Obtener configuración específica del sitio
  const config = getSiteConfig('loxautos.com.ar');
  
  // Crear scraper con configuración
  const scraper = ScraperFactory.create('wordpress', {
    selectors: config.selectors
  });
  
  try {
    await scraper.init();
    const vehicles = await scraper.scrapePage('https://loxautos.com.ar/autos-usados/');
    
    console.log(`✅ Encontrados ${vehicles.length} vehículos`);
    
    // Mostrar primeros 3 vehículos
    vehicles.slice(0, 3).forEach((vehicle, index) => {
      console.log(`\nVehículo ${index + 1}:`);
      console.log(`  Título: ${vehicle.title}`);
      console.log(`  Precio: $${vehicle.priceNumeric?.toLocaleString() || 'N/A'}`);
      console.log(`  Año: ${vehicle.year || 'N/A'}`);
      console.log(`  Km: ${vehicle.km?.toLocaleString() || 'N/A'}`);
    });
    
  } finally {
    await scraper.close();
  }
}

/**
 * Ejemplo 2: Detección automática del tipo de sitio
 */
async function autoDetectAndScrape(url) {
  console.log(`\n📌 Ejemplo 2: Detección automática para ${url}`);
  
  const scraper = new (require('./scrapers-concesionarias').BaseScraper)();
  const monitor = new PerformanceMonitor();
  
  try {
    await scraper.init();
    
    // Medir tiempo de navegación
    const navTimer = monitor.startTimer('navigation');
    await scraper.navigateTo(url);
    monitor.endTimer(navTimer);
    
    // Detectar tipo de sitio
    const detectTimer = monitor.startTimer('detection');
    const siteType = await SiteDetector.detect(scraper.page);
    monitor.endTimer(detectTimer);
    
    console.log(`🔍 Tipo detectado: ${siteType}`);
    
    // Obtener configuración y crear scraper apropiado
    const config = getSiteConfig(url);
    console.log(`⚙️ Grupo configurado: ${config.group}`);
    
    // Mostrar métricas de rendimiento
    const report = monitor.getReport();
    console.log(`⏱️ Tiempo navegación: ${report.byLabel.navigation.average}ms`);
    console.log(`⏱️ Tiempo detección: ${report.byLabel.detection.average}ms`);
    
  } finally {
    await scraper.close();
  }
}

/**
 * Ejemplo 3: Scraping con paginación
 */
async function scrapeWithPagination() {
  console.log('\n📌 Ejemplo 3: Scraping con paginación');
  
  const scraper = ScraperFactory.create('custom-php');
  const allVehicles = [];
  let currentPage = 1;
  const maxPages = 3;
  
  try {
    await scraper.init();
    
    while (currentPage <= maxPages) {
      console.log(`\n📄 Scrapeando página ${currentPage}...`);
      
      const url = `https://ejemplo.com/usados?page=${currentPage}`;
      await scraper.navigateTo(url);
      
      // Detectar paginación
      const paginationInfo = await BrowserUtils.detectPagination(scraper.page);
      console.log(`   Tipo de paginación: ${paginationInfo.type}`);
      
      // Extraer vehículos
      const vehicles = await scraper.extractVehicles();
      allVehicles.push(...vehicles);
      
      console.log(`   ✅ Encontrados ${vehicles.length} vehículos`);
      
      // Verificar si hay siguiente página
      if (!paginationInfo.nextPageUrl) {
        console.log('   ℹ️ No hay más páginas');
        break;
      }
      
      currentPage++;
    }
    
    console.log(`\n📊 Total vehículos recolectados: ${allVehicles.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await scraper.close();
  }
}

/**
 * Ejemplo 4: Procesamiento y normalización de datos
 */
async function processAndNormalizeData() {
  console.log('\n📌 Ejemplo 4: Procesamiento de datos');
  
  // Datos de ejemplo (simulando scraping)
  const rawVehicles = [
    {
      title: 'Chevrolet Cruze 2018 LTZ',
      price: '$ 25.500.000',
      details: '45.000 km - Manual - Nafta'
    },
    {
      title: 'Ford EcoSport 2020',
      price: 'USD 18,500',
      details: 'Kilometraje: 32000 kms'
    },
    {
      title: 'Volkswagen Amarok V6 2019',
      price: '$45.000.000.-',
      details: '68.000km - Automática'
    }
  ];
  
  console.log('\n🔄 Normalizando datos...');
  
  const normalizedVehicles = rawVehicles.map(vehicle => {
    const normalized = DataUtils.normalizeVehicleData(vehicle);
    
    console.log(`\n${normalized.title}:`);
    console.log(`  Marca: ${normalized.brand || 'N/A'}`);
    console.log(`  Modelo: ${normalized.model || 'N/A'}`);
    console.log(`  Año: ${normalized.year || 'N/A'}`);
    console.log(`  Precio: $${normalized.price?.toLocaleString() || 'N/A'}`);
    console.log(`  Km: ${normalized.kilometers?.toLocaleString() || 'N/A'} km`);
    console.log(`  Antigüedad: ${normalized.age || 'N/A'} años`);
    if (normalized.pricePerKm) {
      console.log(`  Precio/Km: $${normalized.pricePerKm}`);
    }
    
    return normalized;
  });
  
  // Estadísticas
  const avgPrice = normalizedVehicles
    .filter(v => v.price)
    .reduce((sum, v) => sum + v.price, 0) / normalizedVehicles.length;
  
  console.log(`\n📊 Precio promedio: $${Math.round(avgPrice).toLocaleString()}`);
}

/**
 * Ejemplo 5: Scraping de múltiples sitios en paralelo
 */
async function scrapeMultipleSites() {
  console.log('\n📌 Ejemplo 5: Scraping múltiple en paralelo');
  
  const sites = [
    { name: 'LOX Autos', url: 'https://loxautos.com.ar/', group: 'wordpress' },
    { name: 'Kavak', url: 'https://www.kavak.com/ar/', group: 'react-next' },
    { name: 'Carmak', url: 'https://carmak.com.ar/', group: 'custom-php' }
  ];
  
  const results = await Promise.allSettled(
    sites.map(async (site) => {
      const scraper = ScraperFactory.create(site.group);
      
      try {
        await scraper.init();
        const vehicles = await scraper.scrapePage(site.url);
        
        return {
          site: site.name,
          count: vehicles.length,
          vehicles: vehicles.slice(0, 2) // Primeros 2 de cada sitio
        };
      } finally {
        await scraper.close();
      }
    })
  );
  
  // Mostrar resultados
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`\n✅ ${result.value.site}: ${result.value.count} vehículos encontrados`);
    } else {
      console.log(`\n❌ ${sites[index].name}: Error - ${result.reason.message}`);
    }
  });
}

/**
 * Función principal
 */
async function main() {
  console.log('🚗 Sistema de Scraping de Concesionarias - Ejemplos de Uso');
  console.log('='.repeat(60));
  
  try {
    // Ejecutar ejemplos
    await scrapeWordPressSite();
    await autoDetectAndScrape('https://www.gruporandazzo.com/');
    await processAndNormalizeData();
    
    // Nota: Los siguientes ejemplos requieren sitios reales funcionando
    // await scrapeWithPagination();
    // await scrapeMultipleSites();
    
  } catch (error) {
    console.error('\n❌ Error general:', error);
  }
  
  console.log('\n✨ Ejemplos completados!');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  scrapeWordPressSite,
  autoDetectAndScrape,
  scrapeWithPagination,
  processAndNormalizeData,
  scrapeMultipleSites
};
