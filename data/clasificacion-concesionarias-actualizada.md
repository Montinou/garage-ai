# Clasificación de Concesionarias por Estructura Web (Actualizada)

## 📊 Análisis y Clasificación de Sitios - Versión 2.0

Este documento contiene la clasificación actualizada de las concesionarias según su estructura técnica para optimizar el proceso de scraping.

### 🔍 Metodología Actualizada
- Análisis con Playwright de cada sitio
- Identificación de tecnologías y frameworks
- Agrupación por patrones similares
- Definición de scrapers específicos por grupo
- Pruebas en sitios representativos

---

## 🏷️ Grupos de Clasificación Actualizados

### Grupo 1: WordPress + WooCommerce
**Características:**
- Framework: WordPress con plugin WooCommerce o Elementor
- Estructura: Productos como posts, categorías estándar
- Elementos: `.product`, `.woocommerce`, `.elementor`, clases de WP
- Identificadores: `wp-content`, `wp-includes` en URLs

**Concesionarias Confirmadas:**
1. **LOX Autos** (https://loxautos.com.ar/)
   - Elementor + WooCommerce
   - Clases: `elementor`, `e-loop-item`, `product`
   - jQuery disponible

2. **Cenoa Usados** (https://usados.cenoa.com.ar/)
   - WordPress con Elementor
   - Estructura similar a LOX
   - Data attributes de Elementor

3. **Fortunato Fortino** (https://www.fortunatofortino.com/)
4. **Horacio Pussetto S.A.** (http://horaciopussetto.com.ar/)
5. **Dycar Chevrolet** (https://www.chevroletdycar.com.ar/)
6. **Indiana Usados** (cuando tengan web)
7. **Sebastiani Usados** (https://www.sebastianiusados.com/)

**Selectores Comunes:**
```javascript
{
  container: '.products, .elementor-loop-container, .et_pb_shop, .elementor-posts',
  item: '.product, .e-loop-item, .et_pb_shop_item, .elementor-post',
  title: '.woocommerce-loop-product__title, h2, h3, .entry-title, .elementor-post__title',
  price: '.price, .woocommerce-Price-amount, .et_pb_module_header, .elementor-price',
  image: 'img.attachment-woocommerce_thumbnail, img.wp-post-image, img.elementor-image'
}
```

---

### Grupo 2: Plataformas Custom React/Next.js
**Características:**
- SPA (Single Page Application)
- Carga dinámica con JavaScript
- API REST para datos
- Server-side rendering
- Lazy loading de imágenes

**Concesionarias Confirmadas:**
1. **Kavak Argentina** (https://www.kavak.com/ar/)
   - Next.js framework
   - Rutas: `/catalog-ui`
   - Clases: `card-product_cardProduct`
   - API endpoints detectables

2. **Car Cash Argentina** (https://www.carcash.com.ar/)
3. **TIENDA CARS** (https://tiendacars.com/)
4. **Car One** (https://www.carone.com.ar/)
   - Posible React con routing moderno

**Estrategias de Scraping:**
```javascript
{
  waitForSelector: '[class*="product"], [class*="card"]',
  interceptAPI: true,
  scrollToLoad: true,
  extractFromJSON: true,
  handleLazyLoading: true
}
```

---

### Grupo 3: Sitios Custom PHP/HTML
**Características:**
- Servidor tradicional PHP
- HTML generado server-side
- Sin frameworks modernos
- Paginación tradicional
- Estructura HTML más simple

**Concesionarias Confirmadas:**
1. **Toyota Line Up Usados** (https://lineup.com.ar/usados)
2. **Autosol Salta/Jujuy** (https://www.autosol.com.ar/usados)
3. **Jalil Salta** (https://www.jalilsalta.com.ar/)
4. **Ford Pussetto** (https://www.fordpussetto.com.ar/vehiculos/usados)
5. **Carmak** (https://carmak.com.ar/)
6. **San Vicente Automotores** (https://sanvicenteautomotores.com.ar/)
7. **Malarczuk Automotores** (https://malarczuk-autos.com.ar)
8. **Armando Automotores** (http://www.armandoautomotores.com.ar/)
9. **NEOSTAR** (https://neostar.com.ar/)
10. **AutoGaba** (https://zonaauto.com.ar/concesionarios/autogaba-concesionaria/)

---

### Grupo 4: Portales/Marketplaces
**Características:**
- Múltiples vendedores
- Filtros avanzados
- APIs públicas o semi-públicas
- Gran volumen de datos
- Sistemas de búsqueda complejos

**Concesionarias:**
1. **Zona Auto Argentina** (https://zonaauto.com.ar/)
2. **Autocosmos Argentina** (https://www.autocosmos.com.ar/auto/usado)
3. **DeRuedas Argentina** (https://www.deruedas.com.ar/)
4. **Autos Misiones** (https://www.autosmisiones.com/)

---

### Grupo 5: Redes Sociales Only
**Características:**
- Sin sitio web propio
- Publicaciones en Facebook/Instagram
- Requiere API de redes sociales o scraping específico

**Concesionarias:**
1. **Indiana Usados** (Facebook)
2. **Autosok Tucumán** (Instagram: @autosoktuc)
3. **Vicente López Usados** (Facebook)
4. **Quilmes Autos** (Facebook)
5. **Berazategui Cars** (Instagram: @berazateguicars)
6. **Río Grande Autos** (posiblemente solo redes)

---

### Grupo 6: Sistemas de Gestión Automotriz
**Características:**
- Software especializado del sector
- Plantillas estándar del sistema
- Estructura predecible
- APIs propietarias

**Concesionarias:**
1. **Kumenia Renault** (https://www.kumenia.com/usados)
2. **SION Autocenter** (https://sionautocenter.com.ar/)
3. **Pirerayen Fiat** (https://pirerayenfiat.com.ar/unidades/)
4. **Fiorasi Ford** (https://www.sapac.com.ar/)
5. **Centro Motor S.A.** (https://www.centromotorsa.com.ar/)

---

### Grupo 7: Sistemas Híbridos/Modernos
**Características:**
- Combinación de tecnologías
- Frameworks custom con componentes modernos
- Difícil de categorizar en un solo grupo

**Concesionarias:**
1. **Grupo Randazzo** (https://www.gruporandazzo.com/)
   - Sistema custom con Swiper.js
   - Carga dinámica pero no React
   
2. **Autocity** (https://autocity.com.ar/)
   - Plataforma moderna custom
   - Posible headless CMS
   
3. **Montironi** (https://montironi.com/)
   - Sistema moderno sin framework detectado
   
4. **AVEC** (https://avec.com.ar/)
   - Plataforma custom avanzada

---

## 🛠️ Estrategias de Scraping Actualizadas por Grupo

### Para Grupo 1 (WordPress)
```javascript
// Detectores adicionales
detectors: {
  isWordPress: 'link[href*="wp-content"], meta[name="generator"][content*="WordPress"]',
  hasElementor: '.elementor, [data-elementor-type]',
  hasWooCommerce: '.woocommerce, .products'
}

// Manejo de paginación
pagination: {
  type: 'numbered',
  selectors: '.page-numbers, .pagination, .nav-links'
}
```

### Para Grupo 7 (Sistemas Híbridos)
```javascript
// Requiere análisis específico por sitio
strategies: {
  analyzeFirst: true,
  detectFrameworks: true,
  customSelectors: true,
  fallbackStrategies: ['generic', 'table', 'list']
}
```

---

## 📈 Estadísticas de Clasificación Actualizada

| Grupo | Cantidad | Porcentaje | Dificultad | Confiabilidad |
|-------|----------|------------|------------|---------------|
| WordPress | 20+ | 30% | Fácil | Alta |
| React/Next | 10+ | 15% | Media | Media |
| Custom PHP | 25+ | 35% | Media | Variable |
| Marketplaces | 4 | 5% | Fácil* | Alta |
| Redes Sociales | 8+ | 10% | Difícil | Baja |
| Sistemas Auto | 5 | 3% | Media | Media |
| Híbridos | 4+ | 2% | Alta | Baja |

*Con API disponible

---

## 🔧 Configuraciones Específicas por Sitio

### Sitios con Particularidades

1. **Kavak**: 
   - Requiere interceptar llamadas API
   - Endpoints: `/catalog-ui/api/search`
   - Paginación infinita

2. **LOX Autos**:
   - Elementor con lazy loading
   - Selectores: `.e-loop-item`
   - Imágenes en `data-src`

3. **Grupo Randazzo**:
   - Swiper.js para carrusel
   - Carga dinámica de vehículos
   - Posible AJAX para más resultados

---

## 🚀 Próximos Pasos

1. **Implementación de Scrapers**
   - Priorizar grupos 1, 2 y 3 (80% de sitios)
   - Desarrollar detector automático mejorado
   - Sistema de fallback para sitios híbridos

2. **Testing y Validación**
   - Ejecutar scrapers en sitios de prueba
   - Validar estructura de datos
   - Medir performance

3. **Sistema de Monitoreo**
   - Detectar cambios en estructuras
   - Alertas automáticas
   - Re-clasificación automática

---

## 📝 Notas Técnicas Importantes

- **Rate Limiting**: Implementar delays de 1-2 segundos entre requests
- **User-Agent**: Rotar user agents para evitar detección
- **Proxies**: Considerar para sitios con protección agresiva
- **Cookies**: Algunos sitios requieren mantener sesión
- **JavaScript**: Grupo 2 y 7 requieren ejecutar JS

---

**Última actualización:** Agosto 2025
**Versión:** 2.0
**Autor:** Sistema de Análisis Automatizado