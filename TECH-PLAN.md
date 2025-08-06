# Plan Técnico de Implementación - Mercado de Vehículos Argentino

## Resumen Ejecutivo

Este documento define la arquitectura técnica y estrategia de implementación para una aplicación de mercado de vehículos usados en Argentina, integrada con NeonDB y construida sobre Next.js 13+ con TypeScript y componentes reutilizables.

## 1. Arquitectura Técnica

### Stack Tecnológico Actual
- **Framework**: Next.js 13+ (App Router)
- **Base de Datos**: NeonDB (PostgreSQL) con Drizzle ORM
- **Styling**: Tailwind CSS + shadcn/ui
- **Tipado**: TypeScript estricto
- **Fonts**: GeistSans + GeistMono
- **Estado**: React hooks + URL search params

### Arquitectura de Datos
```
NeonDB Schema:
├── vehicles (tabla principal)
├── brands (marcas de vehículos)
├── models (modelos por marca)  
├── dealerships (concesionarias)
├── provinces (provincias argentinas)
├── cities (ciudades por provincia)
├── images (imágenes de vehículos)
└── vehicleImages (imágenes optimizadas GCS)
```

### Estructura de Archivos Propuesta
```
app/
├── layout.tsx (actualizado con i18n)
├── page.tsx (landing/redirect)
├── marketplace/
│   ├── page.tsx (dashboard principal)
│   ├── loading.tsx
│   └── error.tsx
├── vehiculos/
│   └── [id]/
│       ├── page.tsx (detalle vehículo)
│       ├── loading.tsx
│       └── error.tsx
├── concesionarias/
│   ├── page.tsx (directorio)
│   ├── [id]/
│   │   └── page.tsx (perfil concesionaria)
│   ├── loading.tsx
│   └── error.tsx
└── api/
    ├── vehicles/
    │   ├── search/route.ts
    │   ├── featured/route.ts
    │   └── [id]/route.ts
    ├── dealerships/
    │   ├── route.ts
    │   └── [id]/route.ts
    └── filters/
        └── options/route.ts

components/
├── layout/
│   ├── Header.tsx
│   ├── Footer.tsx  
│   ├── Sidebar.tsx
│   └── Navigation.tsx
├── vehicles/
│   ├── VehicleCard.tsx
│   ├── VehicleGrid.tsx
│   ├── VehicleDetails.tsx
│   ├── VehicleGallery.tsx
│   ├── VehicleSpecs.tsx
│   └── FilterPanel.tsx
├── dealerships/
│   ├── DealerCard.tsx
│   ├── DealerProfile.tsx
│   └── LocationMap.tsx
├── common/
│   ├── SearchBar.tsx
│   ├── PriceFormatter.tsx
│   ├── LoadingSpinner.tsx
│   └── ErrorBoundary.tsx
└── ui/ (shadcn/ui existente)

lib/
├── vehicle-queries.ts (nuevos queries específicos)
├── dealership-filters.ts (filtros de concesionarias)
├── translations.ts (i18n español)
├── format-utils.ts (formateo ARS, fechas)
├── validation-schemas.ts (Zod schemas)
└── constants.ts (constantes de la app)
```

## 2. Queries de Base de Datos

### Nuevas Consultas Requeridas

#### `/lib/vehicle-queries.ts`
```typescript
// Búsqueda avanzada con filtros
export const searchVehicles = async (filters: VehicleFilters) => {
  return await db
    .select({
      id: vehicles.id,
      title: vehicles.title,
      price: vehicles.price,
      year: vehicles.year,
      mileage: vehicles.mileage,
      brand: brands.name,
      model: models.name,
      location: sql<string>`${cities.name} || ', ' || ${provinces.name}`,
      dealership: dealerships.name,
      primaryImage: sql<string>`(
        SELECT ${images.imageUrl} 
        FROM ${images} 
        WHERE ${images.vehicleId} = ${vehicles.id} 
        AND ${images.isPrimary} = true 
        LIMIT 1
      )`,
      isOpportunity: vehicles.isOpportunityAi,
      opportunityScore: vehicles.opportunityScore
    })
    .from(vehicles)
    .leftJoin(brands, eq(vehicles.brandId, brands.id))
    .leftJoin(models, eq(vehicles.modelId, models.id))
    .leftJoin(dealerships, eq(vehicles.dealershipId, dealerships.id))
    .leftJoin(cities, eq(vehicles.cityId, cities.id))
    .leftJoin(provinces, eq(vehicles.provinceId, provinces.id))
    .where(buildFilterConditions(filters))
    .orderBy(desc(vehicles.createdAt))
    .limit(filters.limit || 20)
    .offset(filters.offset || 0);
};

// Vehículo individual con todos los detalles
export const getVehicleDetails = async (id: string) => {
  return await db
    .select({
      vehicle: vehicles,
      brand: brands,
      model: models,
      dealership: {
        id: dealerships.id,
        name: dealerships.name,
        phone: dealerships.phone,
        whatsapp: dealerships.whatsapp,
        email: dealerships.email,
        address: dealerships.address,
        officialBrand: dealerships.officialBrand
      },
      location: {
        city: cities.name,
        province: provinces.name,
        region: provinces.region
      },
      images: sql<VehicleImage[]>`
        COALESCE(
          json_agg(
            json_build_object(
              'id', ${images.id},
              'url', ${images.imageUrl},
              'order', ${images.imageOrder},
              'type', ${images.imageType},
              'isPrimary', ${images.isPrimary}
            ) 
            ORDER BY ${images.imageOrder}, ${images.isPrimary} DESC
          ) FILTER (WHERE ${images.id} IS NOT NULL), 
          '[]'
        )
      `
    })
    .from(vehicles)
    .leftJoin(brands, eq(vehicles.brandId, brands.id))
    .leftJoin(models, eq(vehicles.modelId, models.id))
    .leftJoin(dealerships, eq(vehicles.dealershipId, dealerships.id))
    .leftJoin(cities, eq(vehicles.cityId, cities.id))
    .leftJoin(provinces, eq(vehicles.provinceId, provinces.id))
    .leftJoin(images, eq(vehicles.id, images.vehicleId))
    .where(eq(vehicles.id, id))
    .groupBy(
      vehicles.id, brands.id, models.id, 
      dealerships.id, cities.id, provinces.id
    )
    .limit(1);
};

// Opciones para filtros (marcas, modelos, ubicaciones)
export const getFilterOptions = async () => {
  const [brandOptions, locationOptions, priceRange] = await Promise.all([
    // Marcas con conteo de vehículos
    db
      .select({
        id: brands.id,
        name: brands.name,
        count: count(vehicles.id)
      })
      .from(brands)
      .leftJoin(vehicles, eq(brands.id, vehicles.brandId))
      .groupBy(brands.id, brands.name)
      .having(sql`count(${vehicles.id}) > 0`)
      .orderBy(brands.name),

    // Provincias y ciudades
    db
      .select({
        province: {
          id: provinces.id,
          name: provinces.name,
          region: provinces.region
        },
        cities: sql<City[]>`
          json_agg(
            json_build_object(
              'id', ${cities.id},
              'name', ${cities.name}
            )
          )
        `
      })
      .from(provinces)
      .leftJoin(cities, eq(provinces.id, cities.provinceId))
      .groupBy(provinces.id, provinces.name, provinces.region)
      .orderBy(provinces.name),

    // Rango de precios
    db
      .select({
        min: min(vehicles.price),
        max: max(vehicles.price),
        avg: avg(vehicles.price)
      })
      .from(vehicles)
      .where(and(
        isNotNull(vehicles.price),
        eq(vehicles.status, 'available')
      ))
  ]);

  return { brandOptions, locationOptions, priceRange: priceRange[0] };
};
```

#### `/lib/dealership-filters.ts`
```typescript
// Concesionarias con inventario
export const getDealershipsWithInventory = async (filters?: DealershipFilters) => {
  return await db
    .select({
      id: dealerships.id,
      name: dealerships.name,
      slug: dealerships.slug,
      officialBrand: dealerships.officialBrand,
      dealershipType: dealerships.dealershipType,
      location: sql<string>`${cities.name} || ', ' || ${provinces.name}`,
      vehicleCount: sql<number>`count(${vehicles.id})`,
      rating: dealerships.rating,
      phone: dealerships.phone,
      whatsapp: dealerships.whatsapp,
      address: dealerships.address
    })
    .from(dealerships)
    .leftJoin(cities, eq(dealerships.cityId, cities.id))
    .leftJoin(provinces, eq(dealerships.provinceId, provinces.id))
    .leftJoin(vehicles, and(
      eq(dealerships.id, vehicles.dealershipId),
      eq(vehicles.status, 'available')
    ))
    .where(eq(dealerships.isActive, true))
    .groupBy(
      dealerships.id, dealerships.name, dealerships.slug,
      dealerships.officialBrand, dealerships.dealershipType,
      cities.name, provinces.name, dealerships.rating,
      dealerships.phone, dealerships.whatsapp, dealerships.address
    )
    .having(sql`count(${vehicles.id}) > 0`)
    .orderBy(desc(sql`count(${vehicles.id})`));
};

// Perfil completo de concesionaria
export const getDealershipProfile = async (id: string) => {
  const [profile, inventory] = await Promise.all([
    db
      .select({
        dealership: dealerships,
        location: {
          city: cities.name,
          province: provinces.name,
          region: provinces.region
        }
      })
      .from(dealerships)
      .leftJoin(cities, eq(dealerships.cityId, cities.id))
      .leftJoin(provinces, eq(dealerships.provinceId, provinces.id))
      .where(eq(dealerships.id, id))
      .limit(1),

    db
      .select({
        id: vehicles.id,
        title: vehicles.title,
        price: vehicles.price,
        year: vehicles.year,
        brand: brands.name,
        model: models.name,
        primaryImage: sql<string>`(
          SELECT ${images.imageUrl} 
          FROM ${images} 
          WHERE ${images.vehicleId} = ${vehicles.id} 
          AND ${images.isPrimary} = true 
          LIMIT 1
        )`
      })
      .from(vehicles)
      .leftJoin(brands, eq(vehicles.brandId, brands.id))
      .leftJoin(models, eq(vehicles.modelId, models.id))
      .where(and(
        eq(vehicles.dealershipId, id),
        eq(vehicles.status, 'available')
      ))
      .orderBy(desc(vehicles.createdAt))
      .limit(20)
  ]);

  return { profile: profile[0], inventory };
};
```

## 3. Componentes React

### Layout Components

#### `/components/layout/Header.tsx`
```typescript
interface HeaderProps {
  className?: string;
}

export default function Header({ className }: HeaderProps) {
  return (
    <header className={cn("border-b bg-background", className)}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/marketplace" className="text-xl font-bold">
              GarageAI
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link href="/marketplace">Vehículos</Link>
              <Link href="/concesionarias">Concesionarias</Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <SearchBar className="hidden sm:flex" />
            <MobileNavigation className="md:hidden" />
          </div>
        </div>
      </div>
    </header>
  );
}
```

#### `/components/vehicles/VehicleCard.tsx`
```typescript
interface VehicleCardProps {
  vehicle: {
    id: string;
    title: string;
    price: string;
    year: number;
    brand: string;
    model: string;
    location: string;
    mileage: number;
    primaryImage?: string;
    isOpportunity?: boolean;
  };
}

export default function VehicleCard({ vehicle }: VehicleCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video relative">
        <Image
          src={vehicle.primaryImage || '/placeholder.jpg'}
          alt={vehicle.title}
          fill
          className="object-cover"
        />
        {vehicle.isOpportunity && (
          <Badge className="absolute top-2 right-2 bg-yellow-500">
            Oportunidad
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg line-clamp-2">
          {vehicle.title}
        </h3>
        
        <div className="mt-2 space-y-1">
          <p className="text-2xl font-bold text-primary">
            <PriceFormatter value={vehicle.price} />
          </p>
          <p className="text-sm text-muted-foreground">
            {vehicle.year} • {formatNumber(vehicle.mileage)} km
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {vehicle.location}
          </p>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full">
          <Link href={`/vehiculos/${vehicle.id}`}>
            Ver detalles
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
```

#### `/components/vehicles/FilterPanel.tsx`
```typescript
interface FilterPanelProps {
  filters: VehicleFilters;
  onFiltersChange: (filters: VehicleFilters) => void;
  options: FilterOptions;
}

export default function FilterPanel({ 
  filters, 
  onFiltersChange, 
  options 
}: FilterPanelProps) {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filtros</h2>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onFiltersChange({})}
        >
          Limpiar
        </Button>
      </div>

      {/* Rango de Precio */}
      <div className="space-y-2">
        <Label>Precio (ARS)</Label>
        <div className="px-2">
          <Slider
            range
            min={options.priceRange.min}
            max={options.priceRange.max}
            value={[filters.priceMin || options.priceRange.min, 
                   filters.priceMax || options.priceRange.max]}
            onValueChange={([min, max]) => 
              onFiltersChange({ ...filters, priceMin: min, priceMax: max })
            }
          />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span><PriceFormatter value={filters.priceMin || options.priceRange.min} /></span>
          <span><PriceFormatter value={filters.priceMax || options.priceRange.max} /></span>
        </div>
      </div>

      {/* Ubicación */}
      <div className="space-y-2">
        <Label>Ubicación</Label>
        <Select
          value={filters.provinceId || ''}
          onValueChange={(value) => 
            onFiltersChange({ ...filters, provinceId: value, cityId: undefined })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar provincia" />
          </SelectTrigger>
          <SelectContent>
            {options.locationOptions.map(province => (
              <SelectItem key={province.province.id} value={province.province.id}>
                {province.province.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {filters.provinceId && (
          <Select
            value={filters.cityId || ''}
            onValueChange={(value) => 
              onFiltersChange({ ...filters, cityId: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar ciudad" />
            </SelectTrigger>
            <SelectContent>
              {getCitiesForProvince(filters.provinceId, options.locationOptions)?.map(city => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Marca y Modelo */}
      <div className="space-y-2">
        <Label>Marca</Label>
        <Select
          value={filters.brandId || ''}
          onValueChange={(value) => 
            onFiltersChange({ ...filters, brandId: value, modelId: undefined })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas las marcas" />
          </SelectTrigger>
          <SelectContent>
            {options.brandOptions.map(brand => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name} ({brand.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Año */}
      <div className="space-y-2">
        <Label>Año</Label>
        <div className="px-2">
          <Slider
            range
            min={1990}
            max={new Date().getFullYear()}
            value={[filters.yearMin || 1990, filters.yearMax || new Date().getFullYear()]}
            onValueChange={([min, max]) => 
              onFiltersChange({ ...filters, yearMin: min, yearMax: max })
            }
          />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{filters.yearMin || 1990}</span>
          <span>{filters.yearMax || new Date().getFullYear()}</span>
        </div>
      </div>

      {/* Solo Oportunidades */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="opportunities"
          checked={filters.onlyOpportunities || false}
          onCheckedChange={(checked) => 
            onFiltersChange({ ...filters, onlyOpportunities: checked })
          }
        />
        <label 
          htmlFor="opportunities"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Solo oportunidades AI
        </label>
      </div>
    </div>
  );
}
```

## 4. API Routes

### `/app/api/vehicles/search/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { searchVehicles } from '@/lib/vehicle-queries';
import { VehicleFiltersSchema } from '@/lib/validation-schemas';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const rawFilters = {
      priceMin: searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined,
      priceMax: searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined,
      brandId: searchParams.get('brandId') || undefined,
      modelId: searchParams.get('modelId') || undefined,
      provinceId: searchParams.get('provinceId') || undefined,
      cityId: searchParams.get('cityId') || undefined,
      yearMin: searchParams.get('yearMin') ? Number(searchParams.get('yearMin')) : undefined,
      yearMax: searchParams.get('yearMax') ? Number(searchParams.get('yearMax')) : undefined,
      mileageMax: searchParams.get('mileageMax') ? Number(searchParams.get('mileageMax')) : undefined,
      onlyOpportunities: searchParams.get('onlyOpportunities') === 'true',
      limit: Number(searchParams.get('limit')) || 20,
      offset: Number(searchParams.get('offset')) || 0
    };

    // Validar filtros
    const filters = VehicleFiltersSchema.parse(rawFilters);
    
    // Ejecutar búsqueda
    const vehicles = await searchVehicles(filters);
    
    return Response.json({
      vehicles,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: vehicles.length === filters.limit
      },
      appliedFilters: filters
    });

  } catch (error) {
    console.error('Error searching vehicles:', error);
    return Response.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

## 5. Utilities y Helpers

### `/lib/format-utils.ts`
```typescript
// Formateo de precios en pesos argentinos
export function formatPrice(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
}

// Formateo de números con separadores de miles
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-AR').format(num);
}

// Formateo de fechas
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
}

// Construcción de URLs de WhatsApp
export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

// Formateo de especificaciones de vehículos
export function formatVehicleSpecs(vehicle: Vehicle) {
  return {
    year: vehicle.year?.toString(),
    mileage: vehicle.mileage ? `${formatNumber(vehicle.mileage)} km` : 'N/A',
    engineSize: vehicle.engineSize ? `${vehicle.engineSize}L` : 'N/A',
    horsepower: vehicle.horsepower ? `${vehicle.horsepower} HP` : 'N/A',
    fuel: vehicle.fuel || 'N/A',
    transmission: vehicle.transmission || 'N/A',
    condition: vehicle.condition || 'Usado'
  };
}
```

### `/lib/translations.ts`
```typescript
export const translations = {
  common: {
    search: 'Buscar',
    filter: 'Filtrar',
    clear: 'Limpiar',
    viewMore: 'Ver más',
    contact: 'Contactar',
    back: 'Volver',
    loading: 'Cargando...',
    error: 'Error',
    tryAgain: 'Intentar de nuevo'
  },
  vehicle: {
    brand: 'Marca',
    model: 'Modelo',
    year: 'Año',
    price: 'Precio',
    mileage: 'Kilometraje',
    fuel: 'Combustible',
    transmission: 'Transmisión',
    condition: 'Estado',
    color: 'Color',
    engine: 'Motor',
    horsepower: 'Potencia',
    features: 'Características',
    description: 'Descripción',
    images: 'Imágenes',
    location: 'Ubicación',
    seller: 'Vendedor',
    opportunity: 'Oportunidad',
    featured: 'Destacado'
  },
  filters: {
    title: 'Filtros',
    priceRange: 'Rango de Precio',
    location: 'Ubicación',
    province: 'Provincia', 
    city: 'Ciudad',
    brand: 'Marca',
    model: 'Modelo',
    yearRange: 'Años',
    maxMileage: 'Kilometraje Máximo',
    fuelType: 'Tipo de Combustible',
    transmissionType: 'Transmisión',
    onlyOpportunities: 'Solo oportunidades AI',
    allBrands: 'Todas las marcas',
    selectProvince: 'Seleccionar provincia',
    selectCity: 'Seleccionar ciudad'
  },
  dealership: {
    name: 'Concesionaria',
    officialBrand: 'Marca Oficial',
    type: 'Tipo',
    location: 'Ubicación', 
    contact: 'Contacto',
    phone: 'Teléfono',
    whatsapp: 'WhatsApp',
    email: 'Email',
    website: 'Sitio Web',
    address: 'Dirección',
    hours: 'Horarios',
    inventory: 'Inventario',
    vehicleCount: 'vehículos disponibles',
    rating: 'Calificación'
  },
  actions: {
    viewDetails: 'Ver detalles',
    contactDealer: 'Contactar concesionaria',
    sendWhatsApp: 'Enviar WhatsApp',
    callDealer: 'Llamar',
    sendEmail: 'Enviar email',
    viewDealership: 'Ver concesionaria',
    showPhone: 'Ver teléfono',
    shareVehicle: 'Compartir vehículo'
  },
  navigation: {
    home: 'Inicio',
    vehicles: 'Vehículos', 
    dealerships: 'Concesionarias',
    about: 'Acerca de',
    contact: 'Contacto'
  }
} as const;

export type TranslationKey = keyof typeof translations;
```

## 6. Esquemas de Validación

### `/lib/validation-schemas.ts`
```typescript
import { z } from 'zod';

export const VehicleFiltersSchema = z.object({
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  brandId: z.string().optional(),
  modelId: z.string().optional(),
  provinceId: z.string().optional(),
  cityId: z.string().optional(),
  yearMin: z.number().min(1950).max(new Date().getFullYear()).optional(),
  yearMax: z.number().min(1950).max(new Date().getFullYear()).optional(),
  mileageMax: z.number().min(0).optional(),
  onlyOpportunities: z.boolean().optional(),
  fuelType: z.string().optional(),
  transmissionType: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

export const ContactDealerSchema = z.object({
  vehicleId: z.string().uuid(),
  dealershipId: z.string().uuid(),
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().min(10).max(20),
  customerEmail: z.string().email().optional(),
  message: z.string().max(500).optional()
});

export type VehicleFilters = z.infer<typeof VehicleFiltersSchema>;
export type ContactDealerForm = z.infer<typeof ContactDealerSchema>;
```

## 7. Páginas Next.js

### `/app/marketplace/page.tsx`
```typescript
import { Suspense } from 'react';
import { Metadata } from 'next';
import VehicleGrid from '@/components/vehicles/VehicleGrid';
import FilterPanel from '@/components/vehicles/FilterPanel';
import { getFilterOptions } from '@/lib/vehicle-queries';

export const metadata: Metadata = {
  title: 'Mercado de Vehículos Usados - Argentina',
  description: 'Encuentra el vehículo usado perfecto en Argentina. Amplia selección de autos, filtros avanzados y contacto directo con concesionarias.',
  keywords: ['autos usados', 'vehículos', 'Argentina', 'concesionarias', 'comprar auto']
};

export default async function MarketplacePage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Obtener opciones de filtros en el servidor
  const filterOptions = await getFilterOptions();
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          Mercado de Vehículos Usados
        </h1>
        <p className="text-muted-foreground">
          Encuentra el vehículo perfecto entre miles de opciones verificadas
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de Filtros - Desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <Suspense fallback={<FilterPanelSkeleton />}>
              <FilterPanel options={filterOptions} />
            </Suspense>
          </div>
        </aside>
        
        {/* Contenido Principal */}
        <main className="lg:col-span-3">
          <Suspense fallback={<VehicleGridSkeleton />}>
            <VehicleGrid 
              initialFilters={searchParams}
              filterOptions={filterOptions}
            />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
```

### `/app/vehiculos/[id]/page.tsx`
```typescript
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getVehicleDetails } from '@/lib/vehicle-queries';
import VehicleGallery from '@/components/vehicles/VehicleGallery';
import VehicleSpecs from '@/components/vehicles/VehicleSpecs';
import ContactDealer from '@/components/vehicles/ContactDealer';
import { formatPrice } from '@/lib/format-utils';

interface VehiclePageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: VehiclePageProps): Promise<Metadata> {
  const vehicle = await getVehicleDetails(params.id);
  
  if (!vehicle) {
    return { title: 'Vehículo no encontrado' };
  }

  return {
    title: `${vehicle.vehicle.title} - ${formatPrice(vehicle.vehicle.price)}`,
    description: vehicle.vehicle.description || `${vehicle.vehicle.title} en venta`,
    openGraph: {
      title: vehicle.vehicle.title,
      description: vehicle.vehicle.description || undefined,
      images: vehicle.images.filter(img => img.isPrimary).map(img => img.url)
    }
  };
}

export default async function VehiclePage({ params }: VehiclePageProps) {
  const vehicleData = await getVehicleDetails(params.id);
  
  if (!vehicleData) {
    notFound();
  }

  const { vehicle, brand, model, dealership, location, images } = vehicleData;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <Link href="/marketplace">Vehículos</Link>
        <span className="mx-2">/</span>
        <span>{vehicle.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Galería e Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          <VehicleGallery images={images} title={vehicle.title} />
          
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{vehicle.title}</h1>
              <p className="text-2xl font-bold text-primary">
                {formatPrice(vehicle.price)}
              </p>
            </div>
            
            {vehicle.description && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Descripción</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {vehicle.description}
                </p>
              </div>
            )}
            
            <VehicleSpecs vehicle={vehicle} brand={brand} model={model} />
          </div>
        </div>

        {/* Sidebar de Contacto */}
        <div className="space-y-6">
          <ContactDealer 
            vehicle={vehicle}
            dealership={dealership}
            location={location}
          />
          
          {/* Información de Ubicación */}
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold mb-2">Ubicación</h3>
            <p className="text-muted-foreground">
              {location.city}, {location.province}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 8. Estrategia de Implementación

### Fase 1: Fundación (Semana 1)
**Objetivo**: Establecer la base técnica y componentes core

1. **Actualizar layout principal** (`app/layout.tsx`)
   - Configurar idioma español
   - Integrar theme provider
   - Configurar meta tags base

2. **Crear utilidades de base** 
   - `lib/translations.ts` - Sistema i18n
   - `lib/format-utils.ts` - Formateo ARS y fechas
   - `lib/validation-schemas.ts` - Esquemas Zod
   - `lib/constants.ts` - Constantes de la app

3. **Componentes de layout**
   - `components/layout/Header.tsx` - Navegación principal
   - `components/layout/Footer.tsx` - Footer informativo
   - `components/common/SearchBar.tsx` - Búsqueda rápida

4. **Queries base de vehículos**
   - `lib/vehicle-queries.ts` - Queries optimizadas
   - Extensión de `lib/queries.ts` existente
   - Testing con datos reales de NeonDB

### Fase 2: Marketplace Core (Semana 2)
**Objetivo**: Dashboard funcional con filtros básicos

1. **Página principal de marketplace**
   - `app/marketplace/page.tsx` - Layout principal
   - `app/marketplace/loading.tsx` - Estados de carga
   - Server-side rendering con datos reales

2. **Componentes de vehículos**
   - `components/vehicles/VehicleCard.tsx` - Tarjeta individual
   - `components/vehicles/VehicleGrid.tsx` - Grid responsivo
   - `components/vehicles/FilterPanel.tsx` - Panel de filtros

3. **API Routes**
   - `app/api/vehicles/search/route.ts` - Búsqueda con filtros
   - `app/api/filters/options/route.ts` - Opciones de filtros
   - Validación con Zod schemas

4. **Sistema de filtros**
   - Estado con React hooks
   - URL search params persistence
   - Filtros por precio, ubicación, marca, año

### Fase 3: Páginas de Detalle (Semana 3)  
**Objetivo**: Experiencia completa de vehículo individual

1. **Página de vehículo**
   - `app/vehiculos/[id]/page.tsx` - Detalle completo
   - `app/vehiculos/[id]/loading.tsx` - Loading states
   - Dynamic metadata generation

2. **Componentes avanzados**
   - `components/vehicles/VehicleGallery.tsx` - Galería de imágenes
   - `components/vehicles/VehicleSpecs.tsx` - Especificaciones
   - `components/vehicles/ContactDealer.tsx` - Formulario contacto

3. **Integración con concesionarias**
   - Queries para datos de dealer
   - Información de contacto
   - Enlaces WhatsApp y teléfono

4. **SEO y Performance**
   - OpenGraph meta tags
   - Image optimization
   - Structured data (JSON-LD)

### Fase 4: Directorio de Concesionarias (Semana 4)
**Objetivo**: Funcionalidad completa de concesionarias

1. **Páginas de concesionarias**
   - `app/concesionarias/page.tsx` - Directorio
   - `app/concesionarias/[id]/page.tsx` - Perfil individual
   - Loading y error states

2. **Componentes de concesionarias**
   - `components/dealerships/DealerCard.tsx` - Tarjeta
   - `components/dealerships/DealerProfile.tsx` - Perfil completo
   - `components/dealerships/LocationMap.tsx` - Mapa (opcional)

3. **API Routes de concesionarias**
   - `app/api/dealerships/route.ts` - Lista con filtros
   - `app/api/dealerships/[id]/route.ts` - Perfil individual
   - Integración con inventory queries

4. **Features avanzadas**
   - Filtrado por provincia/ciudad
   - Búsqueda por marca oficial
   - Rating y reviews (si disponible)

### Fase 5: Testing y Optimización (Semana 5)
**Objetivo**: Pulir experiencia y performance

1. **Testing integral**
   - Unit tests para utilities
   - Integration tests para API routes
   - E2E tests para flujos críticos
   - Testing en dispositivos reales

2. **Optimización de performance**
   - Image lazy loading
   - Component code splitting
   - Database query optimization
   - Caching strategies

3. **Refinamiento UX**
   - Microinteracciones
   - Error handling mejorado
   - Loading states pulidos
   - Accessibility testing

4. **SEO y Analytics**
   - Sitemap generation
   - Robots.txt optimization
   - Google Analytics setup
   - Core Web Vitals optimization

## 9. Consideraciones Técnicas

### Performance
- **Server-side rendering** para SEO y velocidad inicial
- **Incremental Static Regeneration** para páginas de vehículos populares  
- **Image optimization** con Next.js Image component
- **Database indexing** optimizado para queries de filtros

### Escalabilidad
- **Component composition** para reutilización máxima
- **API pagination** para grandes datasets
- **Query optimization** con joins eficientes
- **Caching layer** con Redis (futuro)

### Seguridad
- **Input validation** con Zod en todas las rutas
- **SQL injection prevention** con Drizzle ORM
- **XSS protection** con Next.js defaults
- **CSRF tokens** para formularios críticos

### Monitoring
- **Error tracking** con console.error structured logging
- **Performance monitoring** con Next.js analytics
- **Database monitoring** con Neon dashboard
- **User analytics** con privacy-first approach

## Conclusión

Esta arquitectura técnica proporciona una base sólida para implementar el mercado de vehículos argentino, priorizando performance, escalabilidad y mantenibilidad. La implementación incremental asegura entregables funcionales en cada fase mientras construye hacia una solución completa y robusta.