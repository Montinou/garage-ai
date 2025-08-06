/**
 * Translations for the Argentine car marketplace
 * All UI text in Spanish with Argentine-specific terminology
 */

export const translations = {
  common: {
    search: 'Buscar',
    filter: 'Filtrar',
    filters: 'Filtros',
    clear: 'Limpiar',
    clearAll: 'Limpiar todo',
    apply: 'Aplicar',
    cancel: 'Cancelar',
    save: 'Guardar',
    edit: 'Editar',
    delete: 'Eliminar',
    viewMore: 'Ver más',
    viewAll: 'Ver todo',
    viewDetails: 'Ver detalles',
    contact: 'Contactar',
    back: 'Volver',
    next: 'Siguiente',
    previous: 'Anterior',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    tryAgain: 'Intentar de nuevo',
    noResults: 'No se encontraron resultados',
    results: 'resultados',
    showing: 'Mostrando',
    of: 'de',
    page: 'Página',
    perPage: 'por página',
    total: 'Total',
    from: 'Desde',
    to: 'Hasta',
    all: 'Todos',
    none: 'Ninguno',
    yes: 'Sí',
    no: 'No',
    ok: 'Ok',
    close: 'Cerrar',
    open: 'Abrir',
    select: 'Seleccionar',
    selected: 'Seleccionado',
    available: 'Disponible',
    unavailable: 'No disponible',
    new: 'Nuevo',
    used: 'Usado',
    featured: 'Destacado',
    popular: 'Popular',
    recommended: 'Recomendado'
  },

  navigation: {
    home: 'Inicio',
    marketplace: 'Marketplace',
    vehicles: 'Vehículos',
    dealerships: 'Concesionarias',
    about: 'Acerca de',
    contact: 'Contacto',
    help: 'Ayuda',
    menu: 'Menú',
    breadcrumb: {
      home: 'Inicio',
      marketplace: 'Marketplace',
      vehicles: 'Vehículos',
      dealerships: 'Concesionarias'
    }
  },

  vehicle: {
    vehicle: 'Vehículo',
    vehicles: 'Vehículos',
    car: 'Auto',
    cars: 'Autos',
    brand: 'Marca',
    brands: 'Marcas',
    model: 'Modelo',
    models: 'Modelos',
    year: 'Año',
    years: 'Años',
    price: 'Precio',
    priceRange: 'Rango de precio',
    mileage: 'Kilometraje',
    kilometers: 'kilómetros',
    km: 'km',
    fuel: 'Combustible',
    fuelType: 'Tipo de combustible',
    transmission: 'Transmisión',
    transmissionType: 'Tipo de transmisión',
    condition: 'Estado',
    color: 'Color',
    colors: 'Colores',
    engine: 'Motor',
    engineSize: 'Cilindrada',
    horsepower: 'Potencia',
    hp: 'HP',
    doors: 'Puertas',
    seats: 'Asientos',
    features: 'Características',
    extras: 'Extras',
    equipment: 'Equipamiento',
    description: 'Descripción',
    specifications: 'Especificaciones',
    images: 'Imágenes',
    gallery: 'Galería',
    location: 'Ubicación',
    seller: 'Vendedor',
    dealer: 'Concesionaria',
    opportunity: 'Oportunidad',
    opportunities: 'Oportunidades',
    featured: 'Destacado',
    urgent: 'Urgente',
    negotiable: 'Negociable',
    financing: 'Financiación',
    warranty: 'Garantía',
    inspection: 'Revisión técnica',
    papers: 'Papeles',
    title: 'Título',
    registration: 'Registro',
    insurance: 'Seguro',
    
    // Vehicle conditions
    conditions: {
      new: 'Nuevo',
      used: 'Usado',
      excellent: 'Excelente',
      veryGood: 'Muy bueno',
      good: 'Bueno',
      fair: 'Regular',
      poor: 'Malo'
    },

    // Fuel types
    fuelTypes: {
      gasoline: 'Nafta',
      diesel: 'Diésel',
      hybrid: 'Híbrido',
      electric: 'Eléctrico',
      gas: 'GNC',
      flex: 'Flex'
    },

    // Transmission types
    transmissionTypes: {
      manual: 'Manual',
      automatic: 'Automática',
      cvt: 'CVT',
      semiautomatic: 'Semiautomática'
    }
  },

  filters: {
    title: 'Filtros',
    subtitle: 'Refina tu búsqueda',
    activeFilters: 'Filtros activos',
    clearFilters: 'Limpiar filtros',
    applyFilters: 'Aplicar filtros',
    showFilters: 'Mostrar filtros',
    hideFilters: 'Ocultar filtros',
    
    // Price filters
    priceRange: 'Rango de precio',
    priceMin: 'Precio mínimo',
    priceMax: 'Precio máximo',
    minPrice: 'Desde',
    maxPrice: 'Hasta',
    anyPrice: 'Cualquier precio',
    
    // Location filters
    location: 'Ubicación',
    province: 'Provincia',
    provinces: 'Provincias',
    city: 'Ciudad',
    cities: 'Ciudades',
    allProvinces: 'Todas las provincias',
    allCities: 'Todas las ciudades',
    selectProvince: 'Seleccionar provincia',
    selectCity: 'Seleccionar ciudad',
    
    // Brand and model filters
    brand: 'Marca',
    brands: 'Marcas',
    model: 'Modelo',
    models: 'Modelos',
    allBrands: 'Todas las marcas',
    allModels: 'Todos los modelos',
    selectBrand: 'Seleccionar marca',
    selectModel: 'Seleccionar modelo',
    
    // Year filters
    yearRange: 'Rango de años',
    fromYear: 'Desde año',
    toYear: 'Hasta año',
    minYear: 'Año mínimo',
    maxYear: 'Año máximo',
    
    // Mileage filters
    maxMileage: 'Kilometraje máximo',
    mileageRange: 'Rango de kilometraje',
    anyMileage: 'Cualquier kilometraje',
    
    // Special filters
    onlyOpportunities: 'Solo oportunidades',
    aiOpportunities: 'Oportunidades AI',
    featuredOnly: 'Solo destacados',
    withPhotos: 'Con fotos',
    withFinancing: 'Con financiación',
    withWarranty: 'Con garantía',
    
    // Sort options
    sortBy: 'Ordenar por',
    sortOptions: {
      relevance: 'Relevancia',
      priceAsc: 'Precio: menor a mayor',
      priceDesc: 'Precio: mayor a menor',
      yearDesc: 'Año: más nuevo',
      yearAsc: 'Año: más antiguo',
      mileageAsc: 'Menor kilometraje',
      dateDesc: 'Más recientes',
      dateAsc: 'Más antiguos'
    }
  },

  dealership: {
    dealership: 'Concesionaria',
    dealerships: 'Concesionarias',
    dealer: 'Concesionaria',
    dealers: 'Concesionarias',
    name: 'Nombre',
    officialBrand: 'Marca oficial',
    officialBrands: 'Marcas oficiales',
    type: 'Tipo',
    types: 'Tipos',
    location: 'Ubicación',
    address: 'Dirección',
    contact: 'Contacto',
    contactInfo: 'Información de contacto',
    phone: 'Teléfono',
    whatsapp: 'WhatsApp',
    email: 'Email',
    website: 'Sitio web',
    hours: 'Horarios',
    businessHours: 'Horarios de atención',
    schedule: 'Horario',
    inventory: 'Inventario',
    vehicles: 'Vehículos',
    vehicleCount: 'vehículos disponibles',
    totalVehicles: 'Total de vehículos',
    availableVehicles: 'Vehículos disponibles',
    rating: 'Calificación',
    reviews: 'Reseñas',
    verified: 'Verificada',
    official: 'Oficial',
    authorized: 'Autorizada',
    independent: 'Independiente',
    multibrand: 'Multimarca',
    
    // Directory specific terms
    directory: 'Directorio de concesionarias',
    findDealership: 'Encontrar concesionaria',
    searchDealerships: 'Buscar concesionarias',
    filterDealerships: 'Filtrar concesionarias',
    nearbyDealerships: 'Concesionarias cercanas',
    featuredDealerships: 'Concesionarias destacadas',
    topRated: 'Mejor valoradas',
    mostVehicles: 'Más vehículos',
    recentlyAdded: 'Agregadas recientemente',
    verifiedOnly: 'Solo verificadas',
    withInventory: 'Con inventario',
    
    // Stats and counts
    totalFound: 'concesionarias encontradas',
    showingResults: 'Mostrando {current} de {total} concesionarias',
    noResults: 'No se encontraron concesionarias',
    noResultsFilters: 'No se encontraron concesionarias que coincidan con los filtros aplicados',
    clearFilters: 'Limpiar filtros',
    
    // Sorting
    sortBy: 'Ordenar por',
    sortByName: 'Nombre',
    sortByRating: 'Calificación',
    sortByVehicleCount: 'Cantidad de vehículos',
    sortByNewest: 'Más recientes',
    sortAscending: 'Ascendente',
    sortDescending: 'Descendente',
    
    // Map and location
    viewOnMap: 'Ver en mapa',
    getDirections: 'Cómo llegar',
    distance: 'Distancia',
    showMap: 'Mostrar mapa',
    hideMap: 'Ocultar mapa',
    
    // Profile sections
    about: 'Acerca de',
    services: 'Servicios',
    specialties: 'Especialidades',
    certifications: 'Certificaciones',
    awards: 'Reconocimientos',
    
    // Contact actions
    contactForm: 'Formulario de contacto',
    requestInfo: 'Solicitar información',
    scheduleVisit: 'Agendar visita',
    askQuestion: 'Hacer consulta',
    
    // Dealership types
    dealershipTypes: {
      official: 'Oficial',
      multimarca: 'Multimarca'
    }
  },

  actions: {
    // View actions
    viewDetails: 'Ver detalles',
    viewProfile: 'Ver perfil',
    viewGallery: 'Ver galería',
    viewSpecs: 'Ver especificaciones',
    viewDealership: 'Ver concesionaria',
    viewInventory: 'Ver inventario',
    viewAll: 'Ver todo',
    viewMore: 'Ver más',
    
    // Contact actions
    contact: 'Contactar',
    contactDealer: 'Contactar concesionaria',
    contactSeller: 'Contactar vendedor',
    sendMessage: 'Enviar mensaje',
    sendEmail: 'Enviar email',
    sendWhatsApp: 'Enviar WhatsApp',
    callDealer: 'Llamar',
    callNow: 'Llamar ahora',
    showPhone: 'Ver teléfono',
    scheduleVisit: 'Programar visita',
    requestInfo: 'Solicitar información',
    
    // Share actions
    share: 'Compartir',
    shareVehicle: 'Compartir vehículo',
    shareDealership: 'Compartir concesionaria',
    copyLink: 'Copiar enlace',
    
    // Favorites
    addToFavorites: 'Agregar a favoritos',
    removeFromFavorites: 'Quitar de favoritos',
    favorite: 'Favorito',
    favorites: 'Favoritos',
    
    // Compare
    compare: 'Comparar',
    addToCompare: 'Agregar a comparación',
    removeFromCompare: 'Quitar de comparación',
    
    // Other actions
    calculate: 'Calcular',
    calculateFinancing: 'Calcular financiación',
    getQuote: 'Solicitar cotización',
    reserve: 'Reservar',
    buy: 'Comprar',
    negotiate: 'Negociar'
  },

  forms: {
    // Form labels
    name: 'Nombre',
    fullName: 'Nombre completo',
    firstName: 'Nombre',
    lastName: 'Apellido',
    email: 'Email',
    phone: 'Teléfono',
    message: 'Mensaje',
    subject: 'Asunto',
    comments: 'Comentarios',
    
    // Placeholders
    placeholders: {
      name: 'Ingrese su nombre',
      email: 'Ingrese su email',
      phone: 'Ingrese su teléfono',
      message: 'Escriba su mensaje...',
      search: 'Buscar vehículos...',
      searchBrand: 'Buscar marca...',
      searchModel: 'Buscar modelo...'
    },

    // Validation messages
    validation: {
      required: 'Este campo es obligatorio',
      invalidEmail: 'Email inválido',
      invalidPhone: 'Teléfono inválido',
      minLength: 'Mínimo {min} caracteres',
      maxLength: 'Máximo {max} caracteres',
      invalidPrice: 'Precio inválido',
      invalidYear: 'Año inválido',
      invalidMileage: 'Kilometraje inválido'
    },

    // Form actions
    submit: 'Enviar',
    send: 'Enviar',
    save: 'Guardar',
    cancel: 'Cancelar',
    reset: 'Limpiar',
    update: 'Actualizar',
    
    // Contact form
    contactForm: {
      title: 'Contactar concesionaria',
      subtitle: 'Envíe su consulta y nos comunicaremos con usted',
      interestedIn: 'Interesado en',
      preferredContact: 'Forma de contacto preferida',
      contactMethods: {
        phone: 'Teléfono',
        whatsapp: 'WhatsApp',
        email: 'Email'
      },
      inquiryTypes: {
        general: 'Consulta general',
        pricing: 'Consulta de precio',
        financing: 'Consulta de financiación',
        testDrive: 'Solicitar test drive',
        inspection: 'Solicitar inspección',
        reservation: 'Reservar vehículo'
      }
    }
  },

  messages: {
    // Success messages
    success: {
      messageSent: 'Mensaje enviado correctamente',
      contactSent: 'Consulta enviada correctamente',
      saved: 'Guardado correctamente',
      updated: 'Actualizado correctamente',
      deleted: 'Eliminado correctamente'
    },

    // Error messages
    error: {
      general: 'Ocurrió un error inesperado',
      network: 'Error de conexión',
      notFound: 'No se encontró el elemento solicitado',
      unauthorized: 'No autorizado',
      forbidden: 'Acceso denegado',
      serverError: 'Error del servidor',
      messageFailed: 'Error al enviar mensaje',
      loadFailed: 'Error al cargar datos',
      invalidData: 'Datos inválidos',
      timeout: 'Tiempo de espera agotado'
    },

    // Info messages
    info: {
      loading: 'Cargando...',
      searching: 'Buscando...',
      processing: 'Procesando...',
      noResults: 'No se encontraron resultados',
      emptyList: 'La lista está vacía',
      comingSoon: 'Próximamente',
      maintenance: 'En mantenimiento'
    }
  },

  meta: {
    // SEO titles and descriptions
    titles: {
      home: 'GarageAI - Mercado de Vehículos Usados Argentina',
      marketplace: 'Marketplace - Vehículos Usados Argentina',
      dealerships: 'Concesionarias - GarageAI',
      vehicle: '{brand} {model} {year} - {price}',
      dealership: '{name} - Concesionaria en {location}'
    },
    
    descriptions: {
      home: 'Encuentra el vehículo perfecto en el marketplace de autos usados más completo de Argentina. Miles de opciones de concesionarias verificadas.',
      marketplace: 'Explora miles de vehículos usados en Argentina. Filtros avanzados, precios actualizados y contacto directo con concesionarias.',
      dealerships: 'Directorio completo de concesionarias en Argentina. Encuentra distribuidores oficiales y multimarca cerca de tu ubicación.',
      vehicle: 'Detalles completos del {brand} {model} {year}. Especificaciones, fotos y contacto directo con la concesionaria.',
      dealership: 'Perfil completo de {name} en {location}. Inventario actualizado, información de contacto y horarios de atención.'
    }
  },

  time: {
    // Time and date related
    days: {
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo'
    },
    
    months: {
      january: 'Enero',
      february: 'Febrero',
      march: 'Marzo',
      april: 'Abril',
      may: 'Mayo',
      june: 'Junio',
      july: 'Julio',
      august: 'Agosto',
      september: 'Septiembre',
      october: 'Octubre',
      november: 'Noviembre',
      december: 'Diciembre'
    },
    
    relative: {
      now: 'Ahora',
      today: 'Hoy',
      yesterday: 'Ayer',
      tomorrow: 'Mañana',
      thisWeek: 'Esta semana',
      lastWeek: 'Semana pasada',
      thisMonth: 'Este mes',
      lastMonth: 'Mes pasado',
      ago: 'hace',
      in: 'en',
      minute: 'minuto',
      minutes: 'minutos',
      hour: 'hora',
      hours: 'horas',
      day: 'día',
      days: 'días',
      week: 'semana',
      weeks: 'semanas',
      month: 'mes',
      months: 'meses',
      year: 'año',
      years: 'años'
    }
  }
} as const;

// Helper type for type-safe translation keys
export type TranslationKey = keyof typeof translations;
export type TranslationKeys = typeof translations;

// Helper function to get translation
export function t(key: string): string {
  const keys = key.split('.');
  let value: any = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  console.warn(`Translation key is not a string: ${key}`);
  return key;
}

// Helper function to get translation with interpolation
export function translate(key: string, params?: Record<string, string>): string {
  let translation = t(key);
  
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      translation = translation.replace(`{${param}}`, value);
    });
  }
  
  return translation;
}

// Export for convenience
export default translations;