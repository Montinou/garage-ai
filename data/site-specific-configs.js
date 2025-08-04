// site-specific-configs.js
// Configuraciones específicas por sitio para optimizar el scraping

const siteConfigs = {
  // GRUPO 1: WordPress
  'loxautos.com.ar': {
    group: 'wordpress',
    name: 'LOX Autos',
    selectors: {
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

  'kavak.com': {
    group: 'react-next',
    name: 'Kavak',
    apiEndpoints: [
      '/catalog-ui/api/search',
      '/catalog-ui/api/vehicles'
    ],
    selectors: {
      container: '[class*="results"]',
      item: '[class*="card-product"]',
      title: '[class*="card-product__title"]',
      price: '[class*="card-product__price"]',
      image: '[class*="card-product__image"] img'
    },
    features: {
      hasInfiniteScroll: true,
      requiresAPIIntercept: true,
      hasFilters: true
    }
  },

  'gruporandazzo.com': {
    group: 'hybrid',
    name: 'Grupo Randazzo',
    selectors: {
      container: '.swiper-container, .vehicle-grid',
      item: '.swiper-slide, .vehicle-item',
      title: 'h3, .vehicle-title',
      price: '.price, [class*="precio"]',
      image: 'img'
    },
    features: {
      usesSwiper: true,
      hasDynamicLoading: true,
      multipleLayouts: true
    },
    scrapeStrategy: 'custom'
  },

  'autocity.com.ar': {
    group: 'hybrid',
    name: 'Autocity',
    baseUrl: 'https://autocity.com.ar/catalogo/usados/',
    selectors: {
      container: '.catalog-container, .results',
      item: '.vehicle-card, .product-item',
      title: '.vehicle-name, h3',
      price: '.vehicle-price',
      details: '.vehicle-specs'
    },
    features: {
      hasFilters: true,
      ajaxPagination: true,
      requiresSession: true
    }
  },

  'cenoa.com.ar': {
    group: 'wordpress',
    name: 'Cenoa Usados',
    selectors: {
      container: '.elementor-posts-container',
      item: 'article.elementor-post',
      title: '.elementor-post__title',
      price: '.elementor-post__price',
      image: '.elementor-post__thumbnail img'
    },
    features: {
      usesElementor: true,
      hasArchivePage: true
    }
  },

  'montironi.com': {
    group: 'custom-php',
    name: 'Montironi',
    urls: {
      ford: 'https://montironi.com/ford/usados',
      fiat: 'https://montironi.com/fiat/usados',
      hyundai: 'https://montironi.com/hyundai/usados'
    },
    selectors: {
      container: '.vehicle-list, .inventory',
      item: '.vehicle, .car-item',
      title: 'h3, .title',
      price: '.price',
      details: '.specs'
    },
    features: {
      multipleBrands: true,
      separateUrls: true
    }
  },

  'avec.com.ar': {
    group: 'hybrid',
    name: 'AVEC',
    brands: ['Peugeot', 'Citroën', 'Fiat', 'DS'],
    selectors: {
      container: '.vehicles-container',
      item: '.vehicle-item',
      title: '.vehicle-model',
      price: '.vehicle-price',
      image: '.vehicle-image img'
    },
    features: {
      multiBrand: true,
      modernUI: true,
      requiresInteraction: true
    }
  },

  // Configuraciones para sitios de marketplaces
  'zonaauto.com.ar': {
    group: 'marketplace',
    name: 'Zona Auto',
    apiAvailable: false,
    selectors: {
      searchForm: '#search-form',
      results: '.results-container',
      item: '.listing-item',
      nextPage: '.pagination .next'
    },
    features: {
      hasAdvancedSearch: true,
      requiresFormSubmit: true
    }
  },

  // Template para sitios genéricos
  '_default': {
    group: 'unknown',
    selectors: {
      // Intentar múltiples selectores comunes
      container: '.vehicles, .cars, .inventory, .products, .listings, .results',
      item: '.vehicle, .car, .product, .item, .listing, article',
      title: 'h1, h2, h3, .title, .name',
      price: '.price, .precio, [class*="price"]',
      image: 'img',
      link: 'a'
    },
    features: {
      fallbackMode: true
    }
  }
};

/**
 * Obtener configuración para un sitio específico
 * @param {string} domain - Dominio del sitio
 * @returns {Object} Configuración del sitio
 */
function getSiteConfig(domain) {
  // Normalizar dominio
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
  
  // Buscar configuración exacta
  if (siteConfigs[domain]) {
    return siteConfigs[domain];
  }
  
  // Buscar por coincidencia parcial
  for (const [key, config] of Object.entries(siteConfigs)) {
    if (domain.includes(key) || key.includes(domain)) {
      return config;
    }
  }
  
  // Retornar configuración por defecto
  return siteConfigs._default;
}

/**
 * Obtener todos los sitios de un grupo específico
 * @param {string} groupName - Nombre del grupo
 * @returns {Array} Lista de sitios del grupo
 */
function getSitesByGroup(groupName) {
  return Object.entries(siteConfigs)
    .filter(([domain, config]) => config.group === groupName && domain !== '_default')
    .map(([domain, config]) => ({ domain, ...config }));
}

/**
 * Validar si un sitio tiene configuración específica
 * @param {string} domain - Dominio a verificar
 * @returns {boolean}
 */
function hasCustomConfig(domain) {
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
  return domain in siteConfigs;
}

module.exports = {
  siteConfigs,
  getSiteConfig,
  getSitesByGroup,
  hasCustomConfig
};