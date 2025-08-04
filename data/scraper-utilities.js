// scraper-utilities.js
// Utilidades y helpers para el sistema de scraping

const { chromium } = require('playwright');

/**
 * Utilidades para manejo de datos
 */
class DataUtils {
  /**
   * Limpiar y normalizar precio
   * @param {string} priceText - Texto del precio
   * @returns {number|null} Precio numérico o null
   */
  static cleanPrice(priceText) {
    if (!priceText) return null;
    
    // Remover símbolos de moneda y espacios
    priceText = priceText.replace(/[$€£¥₹]/g, '').trim();
    
    // Extraer números con diferentes formatos
    const patterns = [
      /([\d,]+\.\d{2})/,  // 1,234.56
      /([\d.]+,\d{2})/,    // 1.234,56
      /([\d,]+)/,          // 1,234
      /(\d+)/              // 1234
    ];
    
    for (const pattern of patterns) {
      const match = priceText.match(pattern);
      if (match) {
        // Normalizar a formato estándar
        let number = match[1];
        // Si usa coma como decimal
        if (number.includes(',') && number.includes('.')) {
          if (number.lastIndexOf(',') > number.lastIndexOf('.')) {
            number = number.replace(/\./g, '').replace(',', '.');
          } else {
            number = number.replace(/,/g, '');
          }
        } else {
          number = number.replace(/,/g, '');
        }
        return parseFloat(number);
      }
    }
    
    return null;
  }

  /**
   * Extraer año del texto
   * @param {string} text - Texto a analizar
   * @returns {number|null} Año o null
   */
  static extractYear(text) {
    if (!text) return null;
    
    // Buscar años entre 1990 y 2030
    const yearMatch = text.match(/\b(19[9]\d|20[0-3]\d)\b/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
  }

  /**
   * Extraer kilometraje
   * @param {string} text - Texto a analizar
   * @returns {number|null} Kilometraje o null
   */
  static extractKilometers(text) {
    if (!text) return null;
    
    // Buscar patrones de km
    const patterns = [
      /([\d.,]+)\s*km/i,
      /([\d.,]+)\s*kms/i,
      /([\d.,]+)\s*kilómetros/i,
      /km\s*[:]*\s*([\d.,]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const km = match[1].replace(/[.,]/g, '');
        return parseInt(km);
      }
    }
    
    return null;
  }

  /**
   * Extraer marca y modelo
   * @param {string} title - Título del vehículo
   * @returns {Object} {brand, model}
   */
  static extractBrandModel(title) {
    if (!title) return { brand: null, model: null };
    
    const brands = [
      'Chevrolet', 'Ford', 'Fiat', 'Renault', 'Peugeot', 'Volkswagen', 'VW',
      'Toyota', 'Honda', 'Nissan', 'Citroën', 'Hyundai', 'Kia', 'Mazda',
      'Mercedes-Benz', 'Mercedes', 'BMW', 'Audi', 'Jeep', 'RAM', 'Dodge'
    ];
    
    // Normalizar título
    const normalizedTitle = title.replace(/\s+/g, ' ').trim();
    
    for (const brand of brands) {
      const regex = new RegExp(`\\b${brand}\\b`, 'i');
      if (regex.test(normalizedTitle)) {
        // Extraer modelo (palabra siguiente a la marca)
        const afterBrand = normalizedTitle.split(regex)[1]?.trim();
        const model = afterBrand?.split(' ')[0] || null;
        
        return {
          brand: brand,
          model: model
        };
      }
    }
    
    return { brand: null, model: null };
  }

  /**
   * Normalizar datos del vehículo
   * @param {Object} rawData - Datos crudos
   * @returns {Object} Datos normalizados
   */
  static normalizeVehicleData(rawData) {
    const normalized = {
      title: rawData.title?.trim() || null,
      price: this.cleanPrice(rawData.price),
      priceText: rawData.price?.trim() || null,
      year: this.extractYear(rawData.title || rawData.details),
      kilometers: this.extractKilometers(rawData.details || rawData.title),
      image: rawData.image || null,
      link: rawData.link || null,
      details: rawData.details?.trim() || null,
      ...this.extractBrandModel(rawData.title)
    };
    
    // Agregar campos calculados
    if (normalized.price && normalized.kilometers) {
      normalized.pricePerKm = Math.round(normalized.price / normalized.kilometers * 100) / 100;
    }
    
    if (normalized.year) {
      normalized.age = new Date().getFullYear() - normalized.year;
    }
    
    return normalized;
  }
}

/**
 * Utilidades para manejo del navegador
 */
class BrowserUtils {
  /**
   * Esperar que un elemento sea visible y estable
   * @param {Page} page - Página de Playwright
   * @param {string} selector - Selector CSS
   * @param {number} timeout - Tiempo máximo de espera
   */
  static async waitForElementStable(page, selector, timeout = 10000) {
    try {
      await page.waitForSelector(selector, { 
        state: 'visible',
        timeout 
      });
      
      // Esperar estabilidad
      await page.waitForFunction(
        (sel) => {
          const element = document.querySelector(sel);
          if (!element) return false;
          
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        },
        selector,
        { timeout: 5000 }
      );
      
      return true;
    } catch (error) {
      console.log(`Element ${selector} not stable:`, error.message);
      return false;
    }
  }

  /**
   * Scroll gradual para cargar contenido lazy
   * @param {Page} page - Página de Playwright
   * @param {Object} options - Opciones de scroll
   */
  static async smoothScroll(page, options = {}) {
    const {
      distance = 100,
      delay = 100,
      maxScrolls = 50
    } = options;
    
    await page.evaluate(async ({ distance, delay, maxScrolls }) => {
      let scrollCount = 0;
      let lastHeight = document.body.scrollHeight;
      
      while (scrollCount < maxScrolls) {
        window.scrollBy(0, distance);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const newHeight = document.body.scrollHeight;
        if (newHeight === lastHeight && 
            window.scrollY + window.innerHeight >= newHeight - 100) {
          break;
        }
        
        lastHeight = newHeight;
        scrollCount++;
      }
    }, { distance, delay, maxScrolls });
  }

  /**
   * Extraer imágenes con manejo de lazy loading
   * @param {ElementHandle} element - Elemento DOM
   * @returns {string|null} URL de la imagen
   */
  static async extractImage(element) {
    return await element.evaluate(el => {
      const img = el.querySelector('img');
      if (!img) return null;
      
      // Prioridad de atributos
      const sources = [
        img.src,
        img.dataset.src,
        img.dataset.lazySrc,
        img.dataset.original,
        img.getAttribute('data-src'),
        img.getAttribute('data-lazy-src')
      ];
      
      for (const source of sources) {
        if (source && source.startsWith('http')) {
          return source;
        }
      }
      
      // Intentar con srcset
      if (img.srcset) {
        const firstSrc = img.srcset.split(',')[0].trim().split(' ')[0];
        if (firstSrc) return firstSrc;
      }
      
      return null;
    });
  }

  /**
   * Detectar y manejar paginación
   * @param {Page} page - Página de Playwright
   * @returns {Object} Información de paginación
   */
  static async detectPagination(page) {
    const paginationInfo = await page.evaluate(() => {
      // Buscar elementos de paginación comunes
      const selectors = [
        '.pagination',
        '.pager',
        '.page-numbers',
        '.nav-links',
        '[class*="pagination"]',
        '[class*="page"]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          // Buscar siguiente página
          const nextSelectors = [
            'a.next',
            'a.siguiente',
            'a[rel="next"]',
            '.next-page',
            '[class*="next"]'
          ];
          
          let nextLink = null;
          for (const nextSel of nextSelectors) {
            const next = element.querySelector(nextSel) || document.querySelector(nextSel);
            if (next && next.href) {
              nextLink = next.href;
              break;
            }
          }
          
          // Contar páginas totales
          const pageNumbers = element.querySelectorAll('a[href*="page"], a[href*="pagina"]');
          
          return {
            found: true,
            type: nextLink ? 'links' : 'unknown',
            nextPageUrl: nextLink,
            totalPages: pageNumbers.length,
            currentPage: element.querySelector('.current, .active')?.textContent
          };
        }
      }
      
      // Buscar botón de cargar más
      const loadMoreSelectors = [
        '[class*="load-more"]',
        '[class*="ver-mas"]',
        'button:contains("más")',
        'button:contains("more")'
      ];
      
      for (const selector of loadMoreSelectors) {
        const button = document.querySelector(selector);
        if (button) {
          return {
            found: true,
            type: 'load-more',
            loadMoreButton: selector
          };
        }
      }
      
      return { found: false, type: 'none' };
    });
    
    return paginationInfo;
  }
}

/**
 * Monitor de rendimiento
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = [];
  }

  startTimer(label) {
    return {
      label,
      start: Date.now()
    };
  }

  endTimer(timer) {
    const duration = Date.now() - timer.start;
    this.metrics.push({
      label: timer.label,
      duration,
      timestamp: new Date()
    });
    return duration;
  }

  getReport() {
    const report = {
      totalMetrics: this.metrics.length,
      averageDuration: 0,
      byLabel: {}
    };
    
    if (this.metrics.length === 0) return report;
    
    // Calcular promedios por etiqueta
    this.metrics.forEach(metric => {
      if (!report.byLabel[metric.label]) {
        report.byLabel[metric.label] = {
          count: 0,
          total: 0,
          average: 0,
          min: Infinity,
          max: 0
        };
      }
      
      const labelStats = report.byLabel[metric.label];
      labelStats.count++;
      labelStats.total += metric.duration;
      labelStats.min = Math.min(labelStats.min, metric.duration);
      labelStats.max = Math.max(labelStats.max, metric.duration);
    });
    
    // Calcular promedios
    Object.values(report.byLabel).forEach(stats => {
      stats.average = Math.round(stats.total / stats.count);
    });
    
    report.averageDuration = Math.round(
      this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length
    );
    
    return report;
  }

  reset() {
    this.metrics = [];
  }
}

module.exports = {
  DataUtils,
  BrowserUtils,
  PerformanceMonitor
};