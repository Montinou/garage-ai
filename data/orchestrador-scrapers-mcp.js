// orchestrador-scrapers-mcp.js
// Orquestador Principal para todos los Scrapers MCP por Clasificación
// Coordina y ejecuta scrapers de todos los grupos de concesionarias

const { WordPressMCPScraper } = require('./scraper-grupo1-wordpress.js');
const { ReactNextMCPScraper } = require('./scraper-grupo2-react-nextjs.js');
const { CustomPHPMCPScraper } = require('./scraper-grupo3-custom-php.js');
const { PortalMarketplaceMCPScraper } = require('./scraper-grupo4-portales-marketplaces.js');
const { SpecialGroupsMCPScraper } = require('./scraper-grupos-5-6-7-especiales.js');

class MCPScraperOrchestrator {
  constructor(config = {}) {
    this.config = {
      // Configuración global
      headless: true,
      timeout: 45000,
      delay: 3000,
      maxConcurrent: 2, // Máximo scrapers concurrentes
      outputFormat: 'json', // json, csv, both
      saveResults: true,
      logLevel: 'info', // debug, info, warn, error
      
      // Configuración por grupo
      groups: {
        wordpress: { enabled: true, priority: 1 },
        reactNext: { enabled: true, priority: 2 },
        customPHP: { enabled: true, priority: 3 },
        portals: { enabled: true, priority: 4 },
        specialGroups: { enabled: true, priority: 5 }
      },
      
      // Filtros globales
      filters: {
        maxVehiclesPerDealer: 100,
        minPrice: 0,
        maxPrice: 10000000,
        yearsRange: [2000, 2024]
      },
      
      ...config
    };

    this.results = {
      summary: {
        totalDealerships: 0,
        totalVehicles: 0,
        successfulScrapers: 0,
        failedScrapers: 0,
        executionTime: 0,
        groupResults: {}
      },
      data: {
        grupo1_wordpress: [],
        grupo2_reactNext: [],
        grupo3_customPHP: [],
        grupo4_portals: [],
        grupo5_socialMedia: [],
        grupo6_managementSystems: [],
        grupo7_hybridSystems: []
      },
      errors: []
    };

    this.startTime = null;
  }

  // Método principal para ejecutar todos los scrapers
  async executeAllScrapers() {
    console.log('🚀 INICIANDO ORQUESTADOR MCP DE SCRAPERS');
    console.log('=====================================');
    console.log(`⚙️ Configuración: ${JSON.stringify(this.config.groups, null, 2)}`);
    
    this.startTime = Date.now();

    try {
      // Ejecutar grupos en orden de prioridad
      const enabledGroups = Object.entries(this.config.groups)
        .filter(([_, config]) => config.enabled)
        .sort(([_, a], [__, b]) => a.priority - b.priority);

      for (const [groupName, groupConfig] of enabledGroups) {
        await this.executeGroup(groupName, groupConfig);
        
        // Delay entre grupos
        await new Promise(resolve => setTimeout(resolve, this.config.delay));
      }

      // Generar resumen final
      this.generateSummary();
      
      // Guardar resultados si está habilitado
      if (this.config.saveResults) {
        await this.saveResults();
      }

      console.log('\n✅ ORQUESTACIÓN COMPLETADA');
      this.printSummary();

    } catch (error) {
      console.error('❌ Error fatal en orquestador:', error.message);
      this.results.errors.push({
        type: 'fatal',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return this.results;
  }

  // Ejecutar un grupo específico de scrapers
  async executeGroup(groupName, groupConfig) {
    console.log(`\n📂 === EJECUTANDO GRUPO: ${groupName.toUpperCase()} ===`);
    
    try {
      let groupResults = [];

      switch (groupName) {
        case 'wordpress':
          groupResults = await this.executeWordPressGroup();
          this.results.data.grupo1_wordpress = groupResults;
          break;
          
        case 'reactNext':
          groupResults = await this.executeReactNextGroup();
          this.results.data.grupo2_reactNext = groupResults;
          break;
          
        case 'customPHP':
          groupResults = await this.executeCustomPHPGroup();
          this.results.data.grupo3_customPHP = groupResults;
          break;
          
        case 'portals':
          groupResults = await this.executePortalsGroup();
          this.results.data.grupo4_portals = groupResults;
          break;
          
        case 'specialGroups':
          groupResults = await this.executeSpecialGroups();
          break;
          
        default:
          console.log(`⚠️ Grupo desconocido: ${groupName}`);
      }

      // Procesar resultados del grupo
      const groupSummary = this.processGroupResults(groupName, groupResults);
      this.results.summary.groupResults[groupName] = groupSummary;

      console.log(`✅ Grupo ${groupName} completado: ${groupSummary.totalVehicles} vehículos`);

    } catch (error) {
      console.error(`❌ Error en grupo ${groupName}:`, error.message);
      this.results.errors.push({
        type: 'group',
        group: groupName,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Ejecutar scrapers del Grupo 1 (WordPress)
  async executeWordPressGroup() {
    console.log('🔧 Ejecutando scrapers WordPress + WooCommerce...');
    
    try {
      const scraper = new WordPressMCPScraper({
        headless: this.config.headless,
        timeout: this.config.timeout,
        delay: this.config.delay
      });

      const results = await scraper.scrapeAll();
      
      return this.normalizeResults(results, 'wordpress');

    } catch (error) {
      console.error('❌ Error en WordPress scrapers:', error.message);
      return [];
    }
  }

  // Ejecutar scrapers del Grupo 2 (React/Next.js)
  async executeReactNextGroup() {
    console.log('⚛️ Ejecutando scrapers React/Next.js...');
    
    try {
      const scraper = new ReactNextMCPScraper({
        headless: this.config.headless,
        timeout: this.config.timeout,
        delay: this.config.delay
      });

      const results = await scraper.scrapeAll();
      
      return this.normalizeResults(results, 'react-next');

    } catch (error) {
      console.error('❌ Error en React/Next scrapers:', error.message);
      return [];
    }
  }

  // Ejecutar scrapers del Grupo 3 (Custom PHP)
  async executeCustomPHPGroup() {
    console.log('🐘 Ejecutando scrapers Custom PHP/HTML...');
    
    try {
      const scraper = new CustomPHPMCPScraper({
        headless: this.config.headless,
        timeout: this.config.timeout,
        delay: this.config.delay
      });

      const results = await scraper.scrapeAll();
      
      return this.normalizeResults(results, 'custom-php');

    } catch (error) {
      console.error('❌ Error en Custom PHP scrapers:', error.message);
      return [];
    }
  }

  // Ejecutar scrapers del Grupo 4 (Portales/Marketplaces)
  async executePortalsGroup() {
    console.log('🌐 Ejecutando scrapers Portales/Marketplaces...');
    
    try {
      const scraper = new PortalMarketplaceMCPScraper({
        headless: this.config.headless,
        timeout: this.config.timeout,
        delay: this.config.delay,
        maxVehiclesPerSearch: this.config.filters.maxVehiclesPerDealer
      });

      const results = await scraper.scrapeAll();
      
      return this.normalizeResults(results, 'portals');

    } catch (error) {
      console.error('❌ Error en Portal scrapers:', error.message);
      return [];
    }
  }

  // Ejecutar scrapers de Grupos Especiales (5, 6, 7)
  async executeSpecialGroups() {
    console.log('🔀 Ejecutando scrapers Grupos Especiales...');
    
    try {
      const scraper = new SpecialGroupsMCPScraper({
        headless: this.config.headless,
        timeout: this.config.timeout,
        delay: this.config.delay
      });

      const results = await scraper.scrapeAllSpecialGroups();
      
      // Procesar resultados especiales
      this.results.data.grupo5_socialMedia = this.normalizeResults(results.socialMedia, 'social-media');
      this.results.data.grupo6_managementSystems = this.normalizeResults(results.managementSystems, 'management-systems');
      this.results.data.grupo7_hybridSystems = this.normalizeResults(results.hybridSystems, 'hybrid-systems');

      return results;

    } catch (error) {
      console.error('❌ Error en Grupos Especiales:', error.message);
      return { socialMedia: [], managementSystems: [], hybridSystems: [] };
    }
  }

  // Normalizar resultados de diferentes scrapers
  normalizeResults(results, groupType) {
    if (!Array.isArray(results)) {
      return [];
    }

    return results.map(dealershipResult => ({
      ...dealershipResult,
      groupType,
      scrapedAt: new Date().toISOString(),
      // Aplicar filtros si están configurados
      vehicles: this.applyFilters(dealershipResult.vehicles || [])
    }));
  }

  // Aplicar filtros globales a los vehículos
  applyFilters(vehicles) {
    if (!Array.isArray(vehicles)) {
      return [];
    }

    return vehicles.filter(vehicle => {
      // Filtro por precio
      if (vehicle.price) {
        if (vehicle.price < this.config.filters.minPrice || 
            vehicle.price > this.config.filters.maxPrice) {
          return false;
        }
      }

      // Filtro por año
      if (vehicle.year) {
        if (vehicle.year < this.config.filters.yearsRange[0] || 
            vehicle.year > this.config.filters.yearsRange[1]) {
          return false;
        }
      }

      return true;
    }).slice(0, this.config.filters.maxVehiclesPerDealer); // Limitar cantidad
  }

  // Procesar resultados de un grupo
  processGroupResults(groupName, results) {
    const groupSummary = {
      groupName,
      totalDealerships: results.length,
      totalVehicles: 0,
      successfulDealerships: 0,
      failedDealerships: 0,
      avgVehiclesPerDealership: 0
    };

    results.forEach(dealershipResult => {
      const vehicleCount = dealershipResult.vehicles?.length || 0;
      groupSummary.totalVehicles += vehicleCount;
      
      if (vehicleCount > 0) {
        groupSummary.successfulDealerships++;
      } else {
        groupSummary.failedDealerships++;
      }
    });

    groupSummary.avgVehiclesPerDealership = groupSummary.totalDealerships > 0 
      ? Math.round(groupSummary.totalVehicles / groupSummary.totalDealerships)
      : 0;

    return groupSummary;
  }

  // Generar resumen final
  generateSummary() {
    const endTime = Date.now();
    this.results.summary.executionTime = endTime - this.startTime;

    // Calcular totales
    Object.values(this.results.summary.groupResults).forEach(groupSummary => {
      this.results.summary.totalDealerships += groupSummary.totalDealerships;
      this.results.summary.totalVehicles += groupSummary.totalVehicles;
      this.results.summary.successfulScrapers += groupSummary.successfulDealerships;
      this.results.summary.failedScrapers += groupSummary.failedDealerships;
    });

    // Agregar metadatos
    this.results.summary.metadata = {
      executedAt: new Date().toISOString(),
      configUsed: this.config,
      totalGroups: Object.keys(this.config.groups).filter(g => this.config.groups[g].enabled).length,
      totalErrors: this.results.errors.length
    };
  }

  // Imprimir resumen en consola
  printSummary() {
    console.log('\n📊 RESUMEN DE EJECUCIÓN');
    console.log('========================');
    console.log(`⏱️ Tiempo total: ${(this.results.summary.executionTime / 1000).toFixed(2)} segundos`);
    console.log(`🏢 Total concesionarias: ${this.results.summary.totalDealerships}`);
    console.log(`🚗 Total vehículos: ${this.results.summary.totalVehicles}`);
    console.log(`✅ Scrapers exitosos: ${this.results.summary.successfulScrapers}`);
    console.log(`❌ Scrapers fallidos: ${this.results.summary.failedScrapers}`);
    console.log(`🚨 Total errores: ${this.results.errors.length}`);

    console.log('\n📈 RESULTADOS POR GRUPO:');
    Object.entries(this.results.summary.groupResults).forEach(([groupName, summary]) => {
      console.log(`  ${groupName}: ${summary.totalVehicles} vehículos de ${summary.totalDealerships} concesionarias`);
    });

    if (this.results.errors.length > 0) {
      console.log('\n🚨 ERRORES ENCONTRADOS:');
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.type}] ${error.message}`);
      });
    }
  }

  // Guardar resultados en archivos
  async saveResults() {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const resultsDir = path.join(__dirname, 'results');
      
      // Crear directorio si no existe
      try {
        await fs.mkdir(resultsDir, { recursive: true });
      } catch (error) {
        // Directorio ya existe
      }

      // Guardar resumen
      const summaryFile = path.join(resultsDir, `resumen-${timestamp}.json`);
      await fs.writeFile(summaryFile, JSON.stringify(this.results.summary, null, 2));

      // Guardar datos completos
      const dataFile = path.join(resultsDir, `datos-completos-${timestamp}.json`);
      await fs.writeFile(dataFile, JSON.stringify(this.results.data, null, 2));

      // Guardar por grupos
      for (const [groupName, groupData] of Object.entries(this.results.data)) {
        if (groupData.length > 0) {
          const groupFile = path.join(resultsDir, `${groupName}-${timestamp}.json`);
          await fs.writeFile(groupFile, JSON.stringify(groupData, null, 2));
        }
      }

      console.log(`💾 Resultados guardados en: ${resultsDir}`);

    } catch (error) {
      console.error('❌ Error guardando resultados:', error.message);
    }
  }

  // Método para ejecutar solo un grupo específico
  async executeSpecificGroup(groupName, customConfig = {}) {
    console.log(`🎯 Ejecutando solo grupo: ${groupName}`);
    
    this.config = { ...this.config, ...customConfig };
    this.startTime = Date.now();

    try {
      await this.executeGroup(groupName, this.config.groups[groupName] || { enabled: true, priority: 1 });
      this.generateSummary();
      
      if (this.config.saveResults) {
        await this.saveResults();
      }

      this.printSummary();

    } catch (error) {
      console.error(`❌ Error ejecutando grupo ${groupName}:`, error.message);
    }

    return this.results;
  }

  // Método para obtener estadísticas rápidas
  getQuickStats() {
    return {
      totalVehicles: this.results.summary.totalVehicles,
      totalDealerships: this.results.summary.totalDealerships,
      executionTime: this.results.summary.executionTime,
      successRate: this.results.summary.totalDealerships > 0 
        ? ((this.results.summary.successfulScrapers / this.results.summary.totalDealerships) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
}

// Funciones de utilidad para uso directo
async function executeAllMCPScrapers(config = {}) {
  const orchestrator = new MCPScraperOrchestrator(config);
  return await orchestrator.executeAllScrapers();
}

async function executeSpecificMCPGroup(groupName, config = {}) {
  const orchestrator = new MCPScraperOrchestrator(config);
  return await orchestrator.executeSpecificGroup(groupName, config);
}

// Exportar para uso en otros módulos
module.exports = {
  MCPScraperOrchestrator,
  executeAllMCPScrapers,
  executeSpecificMCPGroup
};

// Ejemplo de uso directo
if (require.main === module) {
  (async () => {
    try {
      console.log('🏁 Iniciando orquestador completo...');
      
      // Configuración de ejemplo
      const config = {
        headless: true,
        saveResults: true,
        groups: {
          wordpress: { enabled: true, priority: 1 },
          reactNext: { enabled: false, priority: 2 }, // Deshabilitado para prueba
          customPHP: { enabled: true, priority: 3 },
          portals: { enabled: false, priority: 4 },    // Deshabilitado para prueba
          specialGroups: { enabled: true, priority: 5 }
        },
        filters: {
          maxVehiclesPerDealer: 20 // Limitar para prueba
        }
      };

      // Opción 1: Ejecutar todos los grupos habilitados
      // const results = await executeAllMCPScrapers(config);

      // Opción 2: Ejecutar solo un grupo específico
      const results = await executeSpecificMCPGroup('wordpress', config);
      
      console.log('\n🎯 ESTADÍSTICAS RÁPIDAS:');
      const orchestrator = new MCPScraperOrchestrator();
      orchestrator.results = results;
      console.log(orchestrator.getQuickStats());
      
    } catch (error) {
      console.error('💥 Error fatal en orquestador:', error);
    }
  })();
}