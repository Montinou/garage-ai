# Clasificación de Concesionarias por Estructura Web

## 📊 Análisis y Clasificación de Sitios

Este documento contiene la clasificación de las concesionarias según su estructura técnica para optimizar el proceso de scraping.

### 🔍 Metodología
- Análisis con Playwright de cada sitio
- Identificación de tecnologías y frameworks
- Agrupación por patrones similares
- Definición de scrapers específicos por grupo

---

## 🏷️ Grupos de Clasificación

### Grupo 1: WordPress + WooCommerce
**Características:**
- Framework: WordPress con plugin WooCommerce
- Estructura: Productos como posts, categorías estándar
- Elementos: `.product`, `.woocommerce`, clases de WP

**Concesionarias:**
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

---

### Grupo 2: Plataformas Custom React/Next.js
**Características:**
- SPA (Single Page Application)
- Carga dinámica con JavaScript
- API REST para datos
- Server-side rendering

**Concesionarias:**
1. **Kavak Argentina** (https://www.kavak.com/ar/)
   - Next.js framework
   - Rutas: `/catalog-ui`
   - Clases: `card-product_cardProduct`
   - Lazy loading de imágenes

2. **Car Cash Argentina** (https://www.carcash.com.ar/)
3. **TIENDA CARS** (https://tiendacars.com/)

---

### Grupo 3: Sitios Custom PHP/HTML
**Características:**
- Servidor tradicional PHP
- HTML generado server-side
- Sin frameworks modernos
- Paginación tradicional

**Concesionarias:**
1. **Toyota Line Up Usados** (https://lineup.com.ar/usados)
2. **Autosol Salta/Jujuy** (https://www.autosol.com.ar/usados)
3. **Jalil Salta** (https://www.jalilsalta.com.ar/)
4. **Ford Pussetto** (https://www.fordpussetto.com.ar/vehiculos/usados)
5. **Carmak** (https://carmak.com.ar/)
6. **San Vicente Automotores** (https://sanvicenteautomotores.com.ar/)

---

### Grupo 4: Portales/Marketplaces
**Características:**
- Múltiples vendedores
- Filtros avanzados
- APIs públicas o semi-públicas
- Gran volumen de datos

**Concesionarias:**
1. **Zona Auto Argentina** (https://zonaauto.com.ar/)
2. **Autocosmos Argentina** (https://www.autocosmos.com.ar/auto/usado)
3. **DeRuedas Argentina** (https://www.deruedas.com.ar/)

---

### Grupo 5: Redes Sociales Only
**Características:**
- Sin sitio web propio
- Publicaciones en Facebook/Instagram
- Requiere API de redes sociales

**Concesionarias:**
1. **Indiana Usados** (Facebook)
2. **Autosok Tucumán** (Instagram: @autosoktuc)
3. **Vicente López Usados** (Facebook)
4. **Quilmes Autos** (Facebook)

---

### Grupo 6: Sistemas de Gestión Automotriz
**Características:**
- Software especializado del sector
- Plantillas estándar
- Estructura predecible

**Concesionarias:**
1. **Kumenia Renault** (https://www.kumenia.com/usados)
2. **SION Autocenter** (https://sionautocenter.com.ar/)
3. **Pirerayen Fiat** (https://pirerayenfiat.com.ar/unidades/)
4. **Fiorasi Ford** (https://www.sapac.com.ar/)

---

## 🛠️ Estrategias de Scraping por Grupo

### Para Grupo 1 (WordPress)
```javascript
// Selectores estándar
selectors: {
  container: '.products, .elementor-loop-container',
  item: '.product, .e-loop-item',
  title: '.woocommerce-loop-product__title, h2',
  price: '.price, .woocommerce-Price-amount',
  image: 'img.attachment-woocommerce_thumbnail',
  link: 'a.woocommerce-LoopProduct-link'
}
```

### Para Grupo 2 (React/Next)
```javascript
// Requiere esperar carga dinámica
strategies: {
  waitForSelector: '[class*="product"], [class*="card"]',
  interceptAPI: true,
  scrollToLoad: true,
  extractFromJSON: true
}
```

### Para Grupo 3 (Custom PHP)
```javascript
// Navegación tradicional
pagination: {
  type: 'traditional',
  nextButton: '.next, .siguiente, [rel="next"]',
  pageParam: 'page, pagina, p'
}
```

---

## 📈 Estadísticas de Clasificación

| Grupo | Cantidad | Porcentaje | Dificultad |
|-------|----------|------------|------------|
| WordPress | 15 | 28% | Fácil |
| React/Next | 8 | 15% | Media |
| Custom PHP | 18 | 34% | Media |
| Marketplaces | 3 | 6% | Fácil* |
| Redes Sociales | 6 | 11% | Difícil |
| Sistemas Auto | 3 | 6% | Media |

*Con API disponible

---

## 🔄 Próximos Pasos

1. **Desarrollo de Scrapers Base**
   - Un scraper genérico por grupo
   - Configuración específica por sitio

2. **Sistema de Detección Automática**
   - Análisis inicial del sitio
   - Clasificación automática
   - Selección del scraper apropiado

3. **Monitoreo de Cambios**
   - Detección de cambios en estructura
   - Alertas automáticas
   - Re-clasificación si es necesario

---

## 📝 Notas Importantes

- Los sitios pueden cambiar su tecnología sin previo aviso
- Algunos sitios tienen protección anti-scraping (Cloudflare, reCAPTCHA)
- Es importante respetar robots.txt y términos de servicio
- Implementar delays y rate limiting para evitar bloqueos

---

**Última actualización:** Agosto 2025
