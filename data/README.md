# 🚗 Garage AI - Scrapers MCP por Clasificación

Este proyecto contiene scrapers MCP (Model Context Protocol) basados en Playwright para extraer datos de concesionarias de autos usados clasificadas por su tecnología web.

## 📊 Clasificación de Concesionarias

Las concesionarias están organizadas en 7 grupos según su tecnología:

### Grupo 1: WordPress + WooCommerce (30%)
- **Tecnología**: WordPress con plugins WooCommerce/Elementor
- **Ejemplos**: LOX Autos, Cenoa Usados, Fortunato Fortino
- **Scraper**: `scraper-grupo1-wordpress.js`

### Grupo 2: React/Next.js (15%)
- **Tecnología**: SPAs modernas con React/Next.js
- **Ejemplos**: Kavak, Car Cash, TIENDA CARS
- **Scraper**: `scraper-grupo2-react-nextjs.js`

### Grupo 3: Custom PHP/HTML (35%)
- **Tecnología**: Sitios PHP tradicionales
- **Ejemplos**: Toyota Line Up, Autosol, Ford Pussetto
- **Scraper**: `scraper-grupo3-custom-php.js`

### Grupo 4: Portales/Marketplaces (5%)
- **Tecnología**: Plataformas multi-vendedor
- **Ejemplos**: Zona Auto, Autocosmos, DeRuedas
- **Scraper**: `scraper-grupo4-portales-marketplaces.js`

### Grupos 5-7: Sistemas Especiales (15%)
- **Grupo 5**: Redes Sociales Only (Facebook/Instagram)
- **Grupo 6**: Sistemas de Gestión Automotriz
- **Grupo 7**: Sistemas Híbridos/Modernos
- **Scraper**: `scraper-grupos-5-6-7-especiales.js`

## 🛠️ Instalación

```bash
# Instalar dependencias
npm install playwright @playwright/test

# Instalar navegadores de Playwright
npx playwright install
```

## 🚀 Uso de los Scrapers

### Uso Individual por Grupo

```javascript
// Grupo 1: WordPress
const { WordPressMCPScraper } = require('./scraper-grupo1-wordpress.js');

const scraper = new WordPressMCPScraper();
const results = await scraper.scrapeAll();
console.log(results);
```

```javascript
// Grupo 2: React/Next.js
const { ReactNextMCPScraper } = require('./scraper-grupo2-react-nextjs.js');

const scraper = new ReactNextMCPScraper();
const results = await scraper.scrapeAll();
console.log(results);
```

### Uso del Orquestador (Recomendado)

```javascript
const { MCPScraperOrchestrator } = require('./orchestrador-scrapers-mcp.js');

// Configuración personalizada
const config = {
  headless: true,
  saveResults: true,
  groups: {
    wordpress: { enabled: true, priority: 1 },
    reactNext: { enabled: true, priority: 2 },
    customPHP: { enabled: true, priority: 3 },
    portals: { enabled: false, priority: 4 }, // Deshabilitado
    specialGroups: { enabled: true, priority: 5 }
  },
  filters: {
    maxVehiclesPerDealer: 50,
    minPrice: 10000,
    maxPrice: 1000000
  }
};

const orchestrator = new MCPScraperOrchestrator(config);

// Ejecutar todos los grupos habilitados
const results = await orchestrator.executeAllScrapers();

// O ejecutar solo un grupo específico
const wordpressResults = await orchestrator.executeSpecificGroup('wordpress');
```

## 📁 Estructura de Archivos

```
data/
├── scraper-grupo1-wordpress.js           # Scraper WordPress + WooCommerce
├── scraper-grupo2-react-nextjs.js        # Scraper React/Next.js
├── scraper-grupo3-custom-php.js          # Scraper PHP tradicional
├── scraper-grupo4-portales-marketplaces.js # Scraper Portales
├── scraper-grupos-5-6-7-especiales.js    # Scrapers grupos especiales
├── orchestrador-scrapers-mcp.js          # Orquestador principal
├── configuraciones-sitios-mcp.js         # Configuraciones por sitio
└── README.md                             # Esta documentación
```

## ⚙️ Configuración

### Configuración por Sitio

Cada sitio tiene configuración específica en `configuraciones-sitios-mcp.js`:

```javascript
'loxautos.com.ar': {
  grupo: 1,
  nombre: 'LOX Autos',
  tecnologia: 'WordPress + Elementor + WooCommerce',
  selectores: {
    contenedor: '.elementor-loop-container',
    item: '.e-loop-item',
    titulo: '.elementor-heading-title',
    precio: '.elementor-widget-container .price'
  },
  caracteristicas: {
    tieneElementor: true,
    tieneLazyLoading: true,
    usaWooCommerce: true
  }
}
```

### Configuración del Scraper

```javascript
const config = {
  headless: true,        // Ejecutar sin ventana del navegador
  timeout: 30000,        // Timeout por página en ms
  delay: 2000,           // Delay entre requests en ms
  maxPages: 5,           // Máximo páginas a procesar
  saveResults: true,     // Guardar resultados en archivos
  logLevel: 'info'       // Nivel de logging
};
```

## 📊 Formato de Datos

Los vehículos extraídos siguen este formato estándar:

```javascript
{
  "dealership": "LOX Autos",
  "id": "lox-autos-1",
  "title": "Toyota Corolla 2020 1.8 CVT",
  "price": 2500000,
  "priceText": "$2.500.000",
  "year": 2020,
  "mileage": 45000,
  "brand": "Toyota",
  "model": "Corolla",
  "imageUrl": "https://example.com/image.jpg",
  "detailUrl": "https://example.com/detail",
  "source": "WordPress",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## 🎯 Características por Grupo

### Grupo 1 (WordPress)
- ✅ Detección automática de Elementor/WooCommerce
- ✅ Manejo de lazy loading de imágenes
- ✅ Paginación tradicional
- ✅ Selectores específicos por tema

### Grupo 2 (React/Next.js)
- ✅ Esperado de hidratación de React
- ✅ Interceptación de APIs
- ✅ Scroll infinito
- ✅ Carga dinámica de contenido

### Grupo 3 (PHP/HTML)
- ✅ Paginación tradicional
- ✅ Extracción de tablas HTML
- ✅ Manejo de sitios HTTP
- ✅ Arquitecturas simples

### Grupo 4 (Portales)
- ✅ Filtros de búsqueda avanzados
- ✅ Múltiples concesionarios
- ✅ APIs de portales
- ✅ Gran volumen de datos

### Grupos 5-7 (Especiales)
- ✅ Sistemas de gestión CRM
- ✅ Carruseles Swiper.js
- ✅ Redes sociales (limitado)
- ✅ Arquitecturas híbridas

## 📈 Monitoreo y Resultados

### Estadísticas de Ejecución

```javascript
const stats = orchestrator.getQuickStats();
console.log(stats);
// Output:
// {
//   totalVehicles: 1250,
//   totalDealerships: 45,
//   executionTime: 180000,
//   successRate: "89.5%"
// }
```

### Archivos de Resultado

Los resultados se guardan automáticamente en:
- `results/resumen-TIMESTAMP.json` - Resumen ejecutivo
- `results/datos-completos-TIMESTAMP.json` - Datos completos
- `results/grupo1_wordpress-TIMESTAMP.json` - Por grupo específico

## 🚨 Limitaciones y Consideraciones

### Redes Sociales (Grupo 5)
- ⚠️ Requiere APIs oficiales
- ⚠️ Necesita autenticación
- ⚠️ Políticas de uso restrictivas
- 💡 Implementación actual es solo prototipo

### Rate Limiting
- 🕒 Delays configurables entre requests
- 🛡️ Respeto a robots.txt
- 🔄 Reintentos automáticos
- ⚡ Control de concurrencia

### Detección Anti-Bot
- 🎭 User-agents realistas
- 🕰️ Tiempos de espera humanos
- 🔄 Rotación de estrategias
- 📱 Emulación de dispositivos

## 🧪 Testing

### Ejecutar Pruebas Individuales

```bash
# Probar scraper WordPress
cd data && node scraper-grupo1-wordpress.js

# Probar scraper React
cd data && node scraper-grupo2-react-nextjs.js

# Probar orquestador con configuración mínima
cd data && node orchestrador-scrapers-mcp.js
```

### Debugging

```javascript
const config = {
  headless: false,     // Ver navegador
  logLevel: 'debug',   // Logs detallados
  delay: 5000,         // Delays largos
  timeout: 60000       // Timeout extendido
};
```

## 🔧 Mantenimiento

### Actualizar Selectores

Cuando un sitio cambie su estructura:

1. Editar `configuraciones-sitios-mcp.js`
2. Actualizar selectores específicos
3. Probar con `headless: false`
4. Validar resultados

### Agregar Nuevo Sitio

```javascript
// En configuraciones-sitios-mcp.js
'nuevositio.com': {
  grupo: 1, // Según clasificación
  nombre: 'Nuevo Sitio',
  tecnologia: 'WordPress',
  url: 'https://nuevositio.com',
  selectores: {
    contenedor: '.products',
    item: '.product',
    titulo: 'h3',
    precio: '.price'
  },
  caracteristicas: {
    usaWooCommerce: true
  }
}
```

## 📝 Notas de Desarrollo

Este sistema de scrapers fue diseñado como **prototipo** para:
- Investigación de tecnologías web
- Análisis de patrones de sitios
- Clasificación automática
- Pruebas de concepto MCP

Para uso en producción, considerar:
- APIs oficiales cuando estén disponibles
- Términos de servicio de cada sitio
- Límites de velocidad apropiados
- Monitoreo de cambios estructurales

## 🤝 Contribución

Para contribuir:
1. Identificar nuevas concesionarias
2. Clasificar según los 7 grupos
3. Agregar configuración específica
4. Probar scraper correspondiente
5. Documentar hallazgos

---

**Última actualización**: Agosto 2025  
**Versión**: 1.0.0  
**Autor**: Sistema de Análisis Automatizado