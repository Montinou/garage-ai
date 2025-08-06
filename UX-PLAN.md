# Plan de Experiencia de Usuario (UX) - Mercado de Vehículos Argentino

## Resumen Ejecutivo

Este plan define la estrategia UX para una aplicación web de mercado de vehículos usados enfocada en Argentina, con interfaz completa en español, integración con datos reales de NeonDB, y diseño responsivo para múltiples dispositivos.

## 1. Análisis de Contexto Argentino

### Características del Mercado Local
- **Moneda**: Pesos Argentinos (ARS) con formato local
- **Geografía**: Estructura provincial argentina (24 provincias + CABA)
- **Idioma**: Español argentino con términos locales específicos
- **Cultura de Compra**: Enfoque en negociación, contacto directo con concesionarias
- **Dispositivos**: Alto uso de smartphones para búsquedas iniciales

### Comportamiento del Usuario Objetivo
1. **Búsqueda Inicial**: Filtros por precio, marca, año, ubicación
2. **Comparación**: Vista de múltiples vehículos en grilla
3. **Detalle**: Galería de imágenes, especificaciones técnicas
4. **Contacto**: Comunicación directa con concesionaria (WhatsApp, teléfono)

## 2. Arquitectura de Información

### Jerarquía de Páginas
```
/marketplace (Dashboard Principal)
├── /vehiculos/[id] (Perfil de Vehículo)
├── /concesionarias (Directorio de Concesionarias)
└── /concesionarias/[id] (Perfil de Concesionaria)
```

### Flujos de Usuario Principales

#### Flujo 1: Búsqueda de Vehículo
1. **Entrada**: Landing en `/marketplace`
2. **Filtrado**: Panel lateral con filtros avanzados
3. **Resultados**: Grilla responsiva de tarjetas de vehículos
4. **Detalle**: Navegación a `/vehiculos/[id]`
5. **Contacto**: Enlace directo a concesionaria

#### Flujo 2: Exploración por Concesionaria
1. **Entrada**: Landing en `/concesionarias`
2. **Selección**: Tarjeta de concesionaria por ubicación/marca
3. **Inventario**: Vista de vehículos disponibles
4. **Contacto**: Información de contacto y ubicación

## 3. Diseño del Sistema

### Paleta de Colores Argentina
- **Primario**: Azul (#0066CC) - confianza, estabilidad
- **Secundario**: Celeste (#87CEEB) - tradición argentina
- **Acentos**: Amarillo (#FFD700) - destacar ofertas
- **Neutros**: Grises (#F8F9FA, #6C757D, #212529)

### Tipografía
- **Principal**: GeistSans (ya implementada)
- **Monoespaciada**: GeistMono (ya implementada)
- **Jerarquía**: H1-H6 con escalado responsivo

### Iconografía
- **Filtros**: Sliders, checkboxes, dropdowns
- **Vehículos**: Iconos de marca, tipo de combustible, transmisión
- **Contacto**: WhatsApp, teléfono, email, ubicación

## 4. Componentes de Interfaz

### Componentes de Layout
1. **Header Principal**
   - Logo de la aplicación
   - Navegación principal
   - Menú hamburguesa (mobile)
   - Campo de búsqueda rápida

2. **Footer**
   - Enlaces importantes
   - Información de contacto
   - Redes sociales
   - Copyright

3. **Sidebar de Filtros**
   - Panel colapsible (móvil)
   - Filtros categorizados
   - Contador de resultados
   - Botón "Limpiar filtros"

### Componentes de Vehículos
1. **CarCard (Tarjeta de Vehículo)**
   - Imagen principal con carousel de preview
   - Título (Marca Modelo Año)
   - Precio en ARS con formato local
   - Especificaciones básicas (km, combustible)
   - Badge de "Oportunidad" (si aplica)
   - Ubicación (Ciudad, Provincia)
   - Botón "Ver más"

2. **CarGrid (Grilla Responsiva)**
   - Desktop: 3-4 columnas
   - Tablet: 2 columnas
   - Mobile: 1 columna
   - Paginación al final
   - Indicador de carga (skeleton)

3. **FilterPanel (Panel de Filtros)**
   - **Precio**: Slider con rango en ARS
   - **Ubicación**: Dropdown provincia + ciudad
   - **Marca/Modelo**: Combobox con búsqueda
   - **Año**: Slider de rango
   - **Kilometraje**: Input numérico
   - **Combustible**: Radio buttons
   - **Transmisión**: Checkbox group

4. **VehicleGallery (Galería de Imágenes)**
   - Imagen principal grande
   - Thumbnails navegables
   - Zoom on hover (desktop)
   - Swipe navigation (mobile)
   - Lazy loading optimizado

5. **VehicleSpecs (Especificaciones)**
   - Grid responsivo de especificaciones
   - Iconos para cada categoría
   - Valores formateados correctamente
   - Sección de "Extras" si aplica

### Componentes de Concesionarias
1. **DealerCard (Tarjeta de Concesionaria)**
   - Logo/imagen de concesionaria
   - Nombre y ubicación
   - Marcas oficiales (badges)
   - Cantidad de vehículos disponibles
   - Rating y reseñas (si disponible)
   - Información de contacto resumida

2. **DealerProfile (Perfil Completo)**
   - Header con información principal
   - Mapa de ubicación interactivo
   - Horarios de atención
   - Galería de vehículos disponibles
   - Información de contacto completa

## 5. Consideraciones de Responsividad

### Breakpoints
```css
/* Mobile First Approach */
mobile: 320px - 767px
tablet: 768px - 1023px
desktop: 1024px+
```

### Adaptaciones por Dispositivo
- **Mobile**: 
  - Navegación tipo drawer
  - Filtros en modal/sheet
  - Tarjetas full-width
  - Touch-friendly buttons (44px min)
  
- **Tablet**:
  - Sidebar persistente para filtros
  - Grilla de 2 columnas
  - Navegación híbrida
  
- **Desktop**:
  - Layout de 3 columnas (sidebar + content + info)
  - Hover states
  - Tooltips informativos

## 6. Internacionalización (i18n)

### Términos Específicos del Dominio
```typescript
const translations = {
  vehicle: {
    brand: "Marca",
    model: "Modelo", 
    year: "Año",
    mileage: "Kilometraje",
    price: "Precio",
    fuel: "Combustible",
    transmission: "Transmisión",
    condition: "Estado"
  },
  filters: {
    priceRange: "Rango de Precio",
    location: "Ubicación", 
    makeModel: "Marca y Modelo",
    yearRange: "Años",
    maxMileage: "Kilometraje Máximo",
    fuelType: "Tipo de Combustible",
    transmissionType: "Tipo de Transmisión"
  },
  actions: {
    search: "Buscar",
    clear: "Limpiar",
    contact: "Contactar",
    viewMore: "Ver más",
    showPhone: "Ver teléfono",
    sendWhatsApp: "Enviar WhatsApp"
  }
}
```

### Formato de Datos Locales
- **Precio**: $1.500.000 ARS (con puntos como separadores de miles)
- **Fecha**: DD/MM/AAAA
- **Números**: 150.000 km

## 7. Microinteracciones y Feedback

### Estados de Carga
- **Skeleton screens** para carga inicial
- **Progressive loading** para imágenes
- **Shimmer effects** en tarjetas

### Feedback Visual
- **Hover states** en elementos interactivos
- **Loading spinners** en botones de acción
- **Toast notifications** para acciones exitosas
- **Error states** con mensajes claros en español

### Animaciones
- **Fade in/out** para modales y overlays
- **Slide transitions** para navegación móvil
- **Smooth scrolling** para anclas internas
- **Parallax subtle** en hero sections (opcional)

## 8. Accesibilidad (WCAG 2.1 AA)

### Cumplimiento Técnico
- **Contraste**: Ratio mínimo 4.5:1 para texto
- **Keyboard navigation**: Tab index lógico
- **Screen readers**: Aria labels en español
- **Focus indicators**: Visibles y distintivos

### Consideraciones Locales
- **Textos alternativos** para imágenes en español
- **Labels** descriptivos para formularios
- **Error messages** claros y accionables
- **Breadcrumbs** para navegación contextual

## 9. Performance y Optimización

### Estrategias de Carga
- **Critical CSS** inline para above-the-fold
- **Image lazy loading** con placeholders
- **Component code splitting** por ruta
- **CDN optimization** para assets estáticos

### Métricas Objetivo
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

## 10. Testing UX

### Test de Usabilidad
1. **Tarea**: Encontrar un auto específico usando filtros
2. **Tarea**: Contactar concesionaria desde detalle de vehículo
3. **Tarea**: Comparar precios entre vehículos similares
4. **Tarea**: Navegar catálogo en dispositivo móvil

### Métricas de Éxito
- **Task completion rate**: > 90%
- **Time to complete**: < 2 minutos por tarea
- **Error rate**: < 5%
- **User satisfaction**: > 4.5/5

## 11. Roadmap de Implementación UX

### Fase 1: Componentes Base (Semana 1)
- Sistema de diseño y tokens
- Componentes UI reutilizables
- Layout responsivo básico
- Traducciones y i18n setup

### Fase 2: Funcionalidad Core (Semana 2)  
- Marketplace con filtros básicos
- Tarjetas de vehículos funcionales
- Sistema de navegación
- Integración con datos reales

### Fase 3: Features Avanzadas (Semana 3)
- Filtros avanzados completos
- Páginas de detalle de vehículos
- Directorio de concesionarias
- Optimizaciones de performance

### Fase 4: Testing y Refinamiento (Semana 4)
- Testing en dispositivos reales
- Optimización de conversión
- A/B testing de elementos clave
- Ajustes finales de UX

## Conclusión

Este plan UX establece las bases para una experiencia de usuario centrada en el contexto argentino, priorizando facilidad de uso, accesibilidad, y optimización para dispositivos móviles. La implementación progresiva asegura un producto viable desde las primeras iteraciones mientras construye hacia una experiencia completa y pulida.