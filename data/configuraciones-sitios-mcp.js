// configuraciones-sitios-mcp.js
// Configuraciones específicas por sitio para scrapers MCP
// Actualizado según clasificación de concesionarias

const configuracionesSitios = {
  
  // ===============================
  // GRUPO 1: WordPress + WooCommerce
  // ===============================
  
  'loxautos.com.ar': {
    grupo: 1,
    nombre: 'LOX Autos',
    tecnologia: 'WordPress + Elementor + WooCommerce',
    url: 'https://loxautos.com.ar/',
    busqueda: '/vehiculos/',
    
    selectores: {
      contenedor: '.elementor-loop-container',
      item: '.e-loop-item',
      titulo: '.elementor-heading-title',
      precio: '.elementor-widget-container .price',
      imagen: 'img[data-src]',
      enlace: 'a.elementor-post__thumbnail__link'
    },
    
    caracteristicas: {
      tieneElementor: true,
      tieneLazyLoading: true,
      atributoImagen: 'data-src',
      usaWooCommerce: true,
      tienePaginacion: true
    },
    
    configuracionScraper: {
      esperarSelector: '.elementor-loop-container',
      manejarLazyLoading: true,
      tiempoEspera: 3000,
      scrollParaCargar: true
    }
  },

  'usados.cenoa.com.ar': {
    grupo: 1,
    nombre: 'Cenoa Usados',
    tecnologia: 'WordPress + Elementor',
    url: 'https://usados.cenoa.com.ar/',
    busqueda: '/',
    
    selectores: {
      contenedor: '.elementor-posts-container',
      item: '.elementor-post',
      titulo: '.elementor-post__title',
      precio: '.elementor-price',
      imagen: 'img[data-src]',
      enlace: 'a.elementor-post__read-more'
    },
    
    caracteristicas: {
      tieneElementor: true,
      tieneFiltros: true,
      usaElementorPosts: true
    }
  },

  'fortunatofortino.com': {
    grupo: 1,
    nombre: 'Fortunato Fortino',
    tecnologia: 'WordPress + WooCommerce',
    url: 'https://www.fortunatofortino.com/',
    busqueda: '/vehiculos-usados/',
    
    selectores: {
      contenedor: '.products',
      item: '.product',
      titulo: '.woocommerce-loop-product__title',
      precio: '.price',
      imagen: 'img.attachment-woocommerce_thumbnail',
      enlace: 'a.woocommerce-LoopProduct-link'
    },
    
    caracteristicas: {
      usaWooCommerce: true,
      tieneProductos: true,
      estandarWordPress: true
    }
  },

  'chevroletdycar.com.ar': {
    grupo: 1,
    nombre: 'Dycar Chevrolet',
    tecnologia: 'WordPress + Divi',
    url: 'https://www.chevroletdycar.com.ar/',
    busqueda: '/usados/',
    
    selectores: {
      contenedor: '.et_pb_shop',
      item: '.et_pb_shop_item',
      titulo: '.entry-title',
      precio: '.et_pb_module_header',
      imagen: 'img.wp-post-image'
    },
    
    caracteristicas: {
      usaDivi: true,
      marcaEspecifica: 'Chevrolet'
    }
  },

  // ===============================
  // GRUPO 2: React/Next.js
  // ===============================

  'kavak.com': {
    grupo: 2,
    nombre: 'Kavak Argentina',
    tecnologia: 'Next.js + React',
    url: 'https://www.kavak.com',
    busqueda: '/ar/catalog-ui/',
    
    endpointsAPI: [
      '/catalog-ui/api/search',
      '/catalog-ui/api/vehicles',
      '/api/search'
    ],
    
    selectores: {
      contenedor: '[class*="results"], [class*="catalog"]',
      item: '[class*="card-product"]',
      titulo: '[class*="card-product__title"], [class*="title"]',
      precio: '[class*="card-product__price"], [class*="price"]',
      imagen: '[class*="card-product__image"] img'
    },
    
    caracteristicas: {
      tieneScrollInfinito: true,
      requiereInterceptorAPI: true,
      tieneFiltros: true,
      esNextJS: true,
      cargaDinamica: true
    },
    
    configuracionScraper: {
      esperarHidratacion: true,
      interceptarAPI: true,
      manejarScrollInfinito: true,
      tiempoEsperaExtra: 5000
    }
  },

  'carcash.com.ar': {
    grupo: 2,
    nombre: 'Car Cash Argentina',
    tecnologia: 'React SPA',
    url: 'https://www.carcash.com.ar',
    busqueda: '/autos/',
    
    selectores: {
      contenedor: '[class*="vehicles"], [class*="grid"]',
      item: '[class*="vehicle-card"], [class*="card"]',
      titulo: '[class*="vehicle-title"], h3',
      precio: '[class*="price"]'
    },
    
    caracteristicas: {
      esReact: true,
      tieneLazyLoading: true,
      usaComponentes: true
    }
  },

  'tiendacars.com': {
    grupo: 2,
    nombre: 'TIENDA CARS',
    tecnologia: 'React + Custom Framework',
    url: 'https://tiendacars.com',
    busqueda: '/vehiculos/',
    
    selectores: {
      contenedor: '[class*="catalog"], [class*="grid"]',
      item: '[class*="product"], [class*="car-item"]',
      titulo: '[class*="car-title"], h2',
      precio: '[class*="price"]'
    },
    
    caracteristicas: {
      esReact: true,
      tieneFiltros: true,
      arquitecturaModerna: true
    }
  },

  // ===============================
  // GRUPO 3: Custom PHP/HTML
  // ===============================

  'lineup.com.ar': {
    grupo: 3,
    nombre: 'Toyota Line Up Usados',
    tecnologia: 'PHP Tradicional',
    url: 'https://lineup.com.ar',
    busqueda: '/usados',
    
    selectores: {
      contenedor: '.vehicles, .usados',
      item: '.vehicle-item, .auto',
      titulo: '.vehicle-title, h3',
      precio: '.price, .precio',
      imagen: 'img[src*="vehicle"]'
    },
    
    caracteristicas: {
      tienePaginacionTradicional: true,
      usaTablas: false,
      marcaEspecifica: 'Toyota',
      arquitecturaSimple: true
    },
    
    configuracionScraper: {
      manejarPaginacion: true,
      tipoNavegacion: 'tradicional',
      parametrosPagina: ['page', 'pagina', 'p']
    }
  },

  'autosol.com.ar': {
    grupo: 3,
    nombre: 'Autosol Salta/Jujuy',
    tecnologia: 'PHP + HTML',
    url: 'https://www.autosol.com.ar',
    busqueda: '/usados',
    
    selectores: {
      contenedor: '.vehicles, .productos',
      item: '.vehicle, .producto',
      titulo: 'h2, h3',
      precio: '.precio'
    },
    
    caracteristicas: {
      tienePaginacionTradicional: true,
      tieneFiltros: true,
      esRegional: true,
      ubicacion: 'Salta/Jujuy'
    }
  },

  'jalilsalta.com.ar': {
    grupo: 3,
    nombre: 'Jalil Salta',
    tecnologia: 'HTML Tradicional',
    url: 'https://www.jalilsalta.com.ar',
    busqueda: '/',
    
    selectores: {
      contenedor: '.cars, .autos',
      item: '.car-item, .auto-item',
      titulo: '.car-title, h3',
      precio: '.price'
    },
    
    caracteristicas: {
      arquitecturaSimple: true,
      sinPaginacion: true,
      esRegional: true
    }
  },

  'armandoautomotores.com.ar': {
    grupo: 3,
    nombre: 'Armando Automotores',
    tecnologia: 'PHP + Tablas HTML',
    url: 'http://www.armandoautomotores.com.ar',
    busqueda: '/vehiculos/',
    
    selectores: {
      contenedor: '.vehiculos, table',
      item: '.vehiculo, tr',
      titulo: '.titulo, td',
      precio: '.precio, td'
    },
    
    caracteristicas: {
      usaTablas: true,
      esHTTP: true,
      arquitecturaAntigua: true,
      requiereManejoEspecial: true
    },
    
    configuracionScraper: {
      extraerDeTablas: true,
      manejarHTTP: true,
      tiempoEsperaExtra: 5000
    }
  },

  // ===============================
  // GRUPO 4: Portales/Marketplaces
  // ===============================

  'zonaauto.com.ar': {
    grupo: 4,
    nombre: 'Zona Auto Argentina',
    tecnologia: 'Portal/Marketplace',
    url: 'https://zonaauto.com.ar',
    busqueda: '/autos-usados/',
    
    endpointsAPI: [
      '/api/search',
      '/api/vehicles'
    ],
    
    selectores: {
      contenedor: '.search-results, .vehicles-grid',
      item: '.vehicle-item, .auto-card',
      titulo: '.vehicle-title, h3',
      precio: '.price, .precio',
      concesionario: '.dealer-name, .concesionario',
      ubicacion: '.location, .ubicacion'
    },
    
    caracteristicas: {
      tieneAccesoAPI: true,
      tieneFiltrosAvanzados: true,
      tieneMultiplesConcesionarios: true,
      tipoPaginacion: 'scroll-infinito',
      esMarketplace: true
    },
    
    configuracionScraper: {
      interceptarAPI: true,
      manejarScrollInfinito: true,
      aplicarFiltros: true,
      maxVehiculos: 500
    }
  },

  'autocosmos.com.ar': {
    grupo: 4,
    nombre: 'Autocosmos Argentina',
    tecnologia: 'Portal Clasificados',
    url: 'https://www.autocosmos.com.ar',
    busqueda: '/auto/usado',
    
    endpointsAPI: [
      '/clasificados/api/search'
    ],
    
    selectores: {
      contenedor: '.results-container, .clasificados',
      item: '.clasificado-item, .result-item',
      titulo: '.clasificado-title, .auto-title',
      precio: '.clasificado-price, .price',
      ubicacion: '.location, .ubicacion'
    },
    
    caracteristicas: {
      tieneAccesoAPI: true,
      tieneBusquedaAvanzada: true,
      tieneFiltrosUbicacion: true,
      tipoPaginacion: 'numerada',
      esPortalGrande: true
    }
  },

  // ===============================
  // GRUPO 5: Redes Sociales Only
  // ===============================

  'facebook.com/indianausados': {
    grupo: 5,
    nombre: 'Indiana Usados',
    tecnologia: 'Facebook Posts',
    plataforma: 'Facebook',
    url: 'https://www.facebook.com/indianausados',
    
    caracteristicas: {
      requiereLogin: true,
      tieneEstructuraPosts: true,
      necesitaManejoEspecial: true,
      requiereAPIOficial: true
    },
    
    limitaciones: [
      'Necesita autenticación',
      'Requiere API oficial de Facebook',
      'Políticas de uso restrictivas',
      'Contenido dinámico limitado'
    ]
  },

  'instagram.com/autosoktuc': {
    grupo: 5,
    nombre: 'Autosok Tucumán',
    tecnologia: 'Instagram Posts',
    plataforma: 'Instagram',
    url: 'https://www.instagram.com/autosoktuc',
    
    caracteristicas: {
      requiereLogin: true,
      tieneStories: true,
      necesitaManejoEspecial: true,
      requiereAPIOficial: true
    }
  },

  // ===============================
  // GRUPO 6: Sistemas de Gestión
  // ===============================

  'kumenia.com': {
    grupo: 6,
    nombre: 'Kumenia Renault',
    tecnologia: 'Sistema CRM Automotriz',
    url: 'https://www.kumenia.com',
    busqueda: '/usados',
    tipoSistema: 'automotive-crm',
    
    selectores: {
      contenedor: '.vehicles-grid, .stock-vehicles',
      item: '.vehicle-card, .stock-item',
      titulo: '.vehicle-name, .model-title',
      precio: '.vehicle-price, .stock-price',
      especificaciones: '.vehicle-specs, .technical-data'
    },
    
    caracteristicas: {
      tieneGestionStock: true,
      tieneEspecificacionesDetalladas: true,
      marcaEspecifica: 'Renault',
      tieneSistemaInventario: true
    }
  },

  'sionautocenter.com.ar': {
    grupo: 6,
    nombre: 'SION Autocenter',
    tecnologia: 'Sistema Gestión Automotriz',
    url: 'https://sionautocenter.com.ar',
    busqueda: '/vehiculos/',
    tipoSistema: 'automotive-crm',
    
    selectores: {
      contenedor: '.vehicles, .inventory',
      item: '.vehicle, .inventory-item',
      titulo: '.vehicle-title, h3',
      precio: '.price, .vehicle-price'
    },
    
    caracteristicas: {
      tieneSistemaInventario: true,
      tieneFinanciacion: true,
      esMultimarca: true
    }
  },

  // ===============================
  // GRUPO 7: Sistemas Híbridos
  // ===============================

  'gruporandazzo.com': {
    grupo: 7,
    nombre: 'Grupo Randazzo',
    tecnologia: 'Sistema Híbrido + Swiper.js',
    url: 'https://www.gruporandazzo.com',
    busqueda: '/vehiculos/',
    tecnologias: ['swiper.js', 'framework-custom'],
    
    selectores: {
      contenedor: '.swiper-container, .vehicle-grid',
      item: '.swiper-slide, .vehicle-item',
      titulo: '.vehicle-title, .slide-title',
      precio: '.vehicle-price, .slide-price'
    },
    
    caracteristicas: {
      tieneCarrusel: true,
      usaSwiper: true,
      tieneCargaAjax: true,
      arquitecturaHibrida: true
    },
    
    configuracionScraper: {
      manejarCarrusel: true,
      navegarSlides: true,
      esperarSwiper: true
    }
  },

  'autocity.com.ar': {
    grupo: 7,
    nombre: 'Autocity',
    tecnologia: 'Headless CMS + Framework Moderno',
    url: 'https://autocity.com.ar',
    busqueda: '/autos/',
    tecnologias: ['headless-cms', 'framework-moderno'],
    
    selectores: {
      contenedor: '.vehicles, .cars-grid',
      item: '.vehicle, .car-item',
      titulo: '.car-title, h3',
      precio: '.car-price, .price'
    },
    
    caracteristicas: {
      tieneHeadlessCMS: true,
      tieneArquitecturaModerna: true,
      esPlataformaPersonalizada: true
    }
  },

  'montironi.com': {
    grupo: 7,
    nombre: 'Montironi',
    tecnologia: 'Sistema Custom Moderno',
    url: 'https://montironi.com',
    busqueda: '/usados/',
    tecnologias: ['sistema-custom'],
    
    selectores: {
      contenedor: '.usados, .vehicles',
      item: '.usado, .vehicle',
      titulo: '.usado-title, .vehicle-name',
      precio: '.usado-price, .price'
    },
    
    caracteristicas: {
      tieneSistemaCustom: true,
      esDiseñoModerno: true,
      arquitecturaPersonalizada: true
    }
  }
};

// Configuraciones por defecto para cada grupo
const configuracionesGrupo = {
  1: { // WordPress
    timeoutDefault: 30000,
    delayDefault: 2000,
    selectoresComunes: {
      contenedores: ['.products', '.elementor-loop-container', '.et_pb_shop', '.elementor-posts'],
      items: ['.product', '.e-loop-item', '.et_pb_shop_item', '.elementor-post'],
      titulos: ['.woocommerce-loop-product__title', '.elementor-heading-title', '.entry-title', 'h2', 'h3'],
      precios: ['.price', '.woocommerce-Price-amount', '.elementor-price'],
      imagenes: ['img.attachment-woocommerce_thumbnail', 'img.wp-post-image', 'img.elementor-image']
    }
  },
  
  2: { // React/Next.js
    timeoutDefault: 45000,
    delayDefault: 3000,
    selectoresComunes: {
      contenedores: ['[class*="results"]', '[class*="grid"]', '[class*="catalog"]'],
      items: ['[class*="card"]', '[class*="item"]', '[class*="product"]'],
      titulos: ['[class*="title"]', '[class*="name"]', 'h1', 'h2', 'h3'],
      precios: ['[class*="price"]', '[class*="cost"]'],
      imagenes: ['[class*="image"] img', '[class*="photo"] img']
    }
  },
  
  3: { // Custom PHP
    timeoutDefault: 30000,
    delayDefault: 2000,
    selectoresComunes: {
      contenedores: ['.vehicles', '.cars', '.autos', '.products', '.listings'],
      items: ['.vehicle', '.car', '.auto', '.product', '.listing', 'tr'],
      titulos: ['.title', '.name', 'h1', 'h2', 'h3'],
      precios: ['.price', '.precio', '.cost'],
      imagenes: ['img']
    }
  },
  
  4: { // Portales
    timeoutDefault: 45000,
    delayDefault: 3000,
    maxVehiculos: 500,
    selectoresComunes: {
      contenedores: ['.search-results', '.results', '.listings'],
      items: ['.vehicle-item', '.auto-item', '.listing'],
      titulos: ['.vehicle-title', '.auto-title', '.title'],
      precios: ['.price', '.precio'],
      concesionarios: ['.dealer', '.concesionario', '.seller']
    }
  }
};

// Función para obtener configuración de un sitio
function obtenerConfiguracionSitio(url) {
  // Extraer dominio de la URL
  const dominio = url.replace(/https?:\/\//, '').replace(/www\./, '').split('/')[0];
  
  return configuracionesSitios[dominio] || null;
}

// Función para obtener configuración por grupo
function obtenerConfiguracionGrupo(numeroGrupo) {
  return configuracionesGrupo[numeroGrupo] || null;
}

// Función para listar sitios por grupo
function listarSitiosPorGrupo(numeroGrupo) {
  return Object.values(configuracionesSitios).filter(sitio => sitio.grupo === numeroGrupo);
}

// Función para obtener todos los sitios con una característica específica
function buscarSitiosPorCaracteristica(caracteristica, valor = true) {
  return Object.values(configuracionesSitios).filter(sitio => 
    sitio.caracteristicas && sitio.caracteristicas[caracteristica] === valor
  );
}

// Exportar todas las configuraciones y funciones de utilidad
module.exports = {
  configuracionesSitios,
  configuracionesGrupo,
  obtenerConfiguracionSitio,
  obtenerConfiguracionGrupo,
  listarSitiosPorGrupo,
  buscarSitiosPorCaracteristica
};

// Ejemplo de uso si se ejecuta directamente
if (require.main === module) {
  console.log('📋 CONFIGURACIONES DE SITIOS MCP');
  console.log('================================');
  
  // Mostrar estadísticas por grupo
  for (let grupo = 1; grupo <= 7; grupo++) {
    const sitiosGrupo = listarSitiosPorGrupo(grupo);
    console.log(`\nGrupo ${grupo}: ${sitiosGrupo.length} sitios`);
    sitiosGrupo.forEach(sitio => {
      console.log(`  - ${sitio.nombre} (${sitio.tecnologia})`);
    });
  }
  
  // Mostrar sitios con características específicas
  console.log('\n🔍 SITIOS CON CARACTERÍSTICAS ESPECIALES:');
  console.log(`WordPress + Elementor: ${buscarSitiosPorCaracteristica('tieneElementor').length}`);
  console.log(`React/Next.js: ${buscarSitiosPorCaracteristica('esReact').length + buscarSitiosPorCaracteristica('esNextJS').length}`);
  console.log(`Con API disponible: ${buscarSitiosPorCaracteristica('tieneAccesoAPI').length}`);
  console.log(`Scroll infinito: ${buscarSitiosPorCaracteristica('tieneScrollInfinito').length}`);
  console.log(`Sistemas de gestión: ${buscarSitiosPorCaracteristica('tieneGestionStock').length}`);
}