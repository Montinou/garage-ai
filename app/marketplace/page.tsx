import { Suspense } from 'react';
import { Metadata } from 'next';
import { searchVehicles, getFilterOptions } from '@/lib/car-queries';
import { parseSearchParams, searchParamsToFilters } from '@/lib/validation-schemas';
import { translations } from '@/lib/translations';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import VehicleGrid from '@/components/vehicles/VehicleGrid';
import FilterPanel from '@/components/vehicles/FilterPanel';
import MarketplaceStats from '@/components/vehicles/MarketplaceStats';
import VehicleGridSkeleton from '@/components/vehicles/VehicleGridSkeleton';
import FilterPanelSkeleton from '@/components/vehicles/FilterPanelSkeleton';
import { ComponentErrorBoundary, WidgetErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: translations.meta.titles.marketplace,
  description: translations.meta.descriptions.marketplace,
  keywords: [
    'autos usados',
    'vehículos Argentina',
    'marketplace automotor',
    'concesionarias',
    'oportunidades AI',
    'filtros avanzados',
    'comprar auto usado'
  ],
  openGraph: {
    title: translations.meta.titles.marketplace,
    description: translations.meta.descriptions.marketplace,
    type: 'website',
    locale: 'es_AR'
  }
};

interface MarketplacePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  // Await searchParams in Next.js 15
  const params = await searchParams;
  // Parse and validate search parameters
  const parsedParams = parseSearchParams(params);
  const filters = searchParamsToFilters(parsedParams);
  
  // Fetch initial data and filter options in parallel
  const [initialResults, filterOptions] = await Promise.all([
    searchVehicles(filters).catch(() => ({ vehicles: [], total: 0, hasMore: false })),
    getFilterOptions().catch(() => ({
      brands: [],
      provinces: [],
      priceRange: { min: 0, max: 0, avg: 0 },
      yearRange: { min: 1950, max: new Date().getFullYear() },
      fuelTypes: [],
      transmissionTypes: []
    }))
  ]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">
                  {translations.navigation.breadcrumb.home}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {translations.navigation.breadcrumb.marketplace}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                {translations.meta.titles.marketplace}
              </h1>
              <p className="mt-2 text-lg text-muted-foreground">
                {translations.meta.descriptions.marketplace}
              </p>
            </div>
            
            {/* Quick Stats */}
            <Suspense fallback={
              <div className="flex items-center gap-4">
                <div className="h-16 w-32 bg-muted animate-pulse rounded-lg" />
                <div className="h-16 w-32 bg-muted animate-pulse rounded-lg" />
              </div>
            }>
              <WidgetErrorBoundary>
                <MarketplaceStats />
              </WidgetErrorBoundary>
            </Suspense>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filter Sidebar - Desktop */}
          <aside className="lg:col-span-1 order-2 lg:order-1">
            <div className="sticky top-20">
              <Suspense fallback={<FilterPanelSkeleton />}>
                <ComponentErrorBoundary>
                  <FilterPanel 
                    options={filterOptions}
                    initialFilters={filters}
                  />
                </ComponentErrorBoundary>
              </Suspense>
            </div>
          </aside>

          {/* Vehicle Grid - Main Content */}
          <main className="lg:col-span-3 order-1 lg:order-2">
            <Suspense fallback={<VehicleGridSkeleton />}>
              <ComponentErrorBoundary>
                <VehicleGrid
                  initialData={initialResults}
                  initialFilters={filters}
                  filterOptions={filterOptions}
                />
              </ComponentErrorBoundary>
            </Suspense>
          </main>
        </div>

        {/* Bottom Content - Popular Searches/Categories */}
        <div className="mt-16 pt-12 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Popular Brands */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Marcas Populares</h2>
              <div className="flex flex-wrap gap-2">
                {filterOptions.brands.slice(0, 8).map((brand) => (
                  <a
                    key={brand.id}
                    href={`/marketplace?marca=${brand.id}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-muted hover:bg-muted/80 transition-colors"
                  >
                    {brand.name}
                    <span className="ml-1 text-xs text-muted-foreground">({brand.count})</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Popular Locations */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Ubicaciones Populares</h2>
              <div className="flex flex-wrap gap-2">
                {filterOptions.provinces.slice(0, 6).map((province) => (
                  <a
                    key={province.id}
                    href={`/marketplace?provincia=${province.id}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-muted hover:bg-muted/80 transition-colors"
                  >
                    {province.name}
                  </a>
                ))}
              </div>
            </div>

            {/* Price Ranges */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Rangos de Precio</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Hasta $5M', max: 5000000 },
                  { label: '$5M - $10M', min: 5000000, max: 10000000 },
                  { label: '$10M - $20M', min: 10000000, max: 20000000 },
                  { label: 'Más de $20M', min: 20000000 }
                ].map((range, index) => (
                  <a
                    key={index}
                    href={`/marketplace?${range.min ? `precio_min=${range.min}&` : ''}${range.max ? `precio_max=${range.max}` : ''}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-muted hover:bg-muted/80 transition-colors"
                  >
                    {range.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SEO Footer Content */}
        <div className="mt-12 pt-8 border-t">
          <div className="prose prose-gray max-w-4xl">
            <h2 className="text-xl font-semibold mb-4">
              ¿Por qué elegir GarageAI para comprar tu próximo vehículo?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
              <div>
                <h3 className="font-medium text-foreground mb-2">Tecnología de IA Avanzada</h3>
                <p>
                  Nuestro sistema de inteligencia artificial analiza miles de vehículos para identificar 
                  las mejores oportunidades del mercado. Obtén insights únicos sobre precios, 
                  condición del vehículo y valor de reventa.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">Concesionarias Verificadas</h3>
                <p>
                  Trabajamos únicamente con concesionarias certificadas y de confianza en toda Argentina. 
                  Cada vehículo pasa por un proceso de validación para garantizar calidad y transparencia.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">Filtros Inteligentes</h3>
                <p>
                  Encuentra exactamente lo que buscas con nuestros filtros avanzados. Busca por marca, 
                  modelo, precio, ubicación, y características específicas para ahorrar tiempo.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">Contacto Directo</h3>
                <p>
                  Comunícate directamente con las concesionarias a través de WhatsApp, teléfono o email. 
                  Sin intermediarios, sin comisiones ocultas, solo conexiones genuinas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}