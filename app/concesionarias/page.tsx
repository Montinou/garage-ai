import { Suspense } from 'react';
import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Building, 
  MapPin, 
  Star, 
  Car,
  Shield,
  TrendingUp,
  Users,
  Search
} from 'lucide-react';
import { DealerCard } from '@/components/dealerships/DealerCard';
import { DealerFilter } from '@/components/dealerships/DealerFilter';
import { DealerMap } from '@/components/dealerships/DealerMap';
import VehicleGridSkeleton from '@/components/vehicles/VehicleGridSkeleton';
import { 
  getDealerships, 
  getFeaturedDealerships,
  getDealershipDirectoryStats,
  getProvincesWithDealershipCounts,
  getDealershipBrands
} from '@/lib/dealership-queries';
import { DealershipFilters } from '@/lib/validation-schemas';
import { translations } from '@/lib/translations';

export const metadata: Metadata = {
  title: translations.meta.titles.dealerships,
  description: translations.meta.descriptions.dealerships,
  openGraph: {
    title: translations.meta.titles.dealerships,
    description: translations.meta.descriptions.dealerships,
    type: 'website',
  },
};

interface SearchParams {
  q?: string;
  provincia?: string;
  ciudad?: string;
  tipo?: 'official' | 'multimarca';
  marca?: string;
  verificadas?: string;
  con_vehiculos?: string;
  orden?: string;
  pagina?: string;
}

interface DealershipDirectoryPageProps {
  searchParams: Promise<SearchParams>;
}

// Loading skeletons
function DealershipGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-3">
            <div className="flex items-start space-x-3">
              <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function DealershipContent({ searchParams }: DealershipDirectoryPageProps) {
  const params = await searchParams;
  
  // Parse search parameters
  const filters: DealershipFilters = {
    searchQuery: params.q,
    provinceId: params.provincia,
    cityId: params.ciudad,
    dealershipType: params.tipo,
    officialBrand: params.marca,
    isVerified: params.verificadas === 'true' ? true : undefined,
    hasVehicles: params.con_vehiculos === 'true' ? true : undefined,
    page: params.pagina ? parseInt(params.pagina) : 1,
    limit: 12,
    sortBy: 'name',
    sortOrder: 'asc'
  };

  // Handle sorting parameter
  if (params.orden) {
    const [sortBy, sortOrder] = params.orden.split('_');
    filters.sortBy = sortBy as 'name' | 'rating' | 'vehicleCount' | 'createdAt';
    filters.sortOrder = (sortOrder as 'asc' | 'desc') || 'asc';
  }

  // Fetch data in parallel
  const [dealershipsResult, featuredDealerships, stats, provinces, brands] = await Promise.all([
    getDealerships(filters),
    getFeaturedDealerships(6),
    getDealershipDirectoryStats(),
    getProvincesWithDealershipCounts(),
    getDealershipBrands()
  ]);

  const hasFilters = !!(
    filters.searchQuery ||
    filters.provinceId ||
    filters.cityId ||
    filters.dealershipType ||
    filters.officialBrand ||
    filters.isVerified !== undefined ||
    filters.hasVehicles !== undefined
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {translations.dealership.directory}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Encuentra la concesionaria perfecta en Argentina. Compara opciones, 
              lee reseñas y contacta directamente con distribuidores oficiales y multimarca.
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <Building className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalDealerships}
                </div>
                <div className="text-sm text-gray-600">
                  Concesionarias activas
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {stats.verifiedDealerships}
                </div>
                <div className="text-sm text-gray-600">
                  Verificadas
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Car className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalVehiclesInDealerships.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  Vehículos disponibles
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {stats.avgRating ? Number(stats.avgRating).toFixed(1) : 'N/A'}
                </div>
                <div className="text-sm text-gray-600">
                  Calificación promedio
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Featured Dealerships (only show when no filters) */}
        {!hasFilters && featuredDealerships.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {translations.dealership.featuredDealerships}
              </h2>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                <TrendingUp className="h-4 w-4 mr-1" />
                {translations.dealership.topRated}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {featuredDealerships.map((dealership) => (
                <DealerCard 
                  key={dealership.id} 
                  dealership={dealership}
                  className="border-2 border-blue-100 bg-gradient-to-br from-white to-blue-50"
                />
              ))}
            </div>
            
            <Separator className="my-8" />
          </section>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              <DealerFilter 
                provinces={provinces}
                brands={brands.filter(b => b.brand !== null).map(b => ({ ...b, brand: b.brand! }))}
                initialFilters={filters}
                isCollapsible={false}
              />

              {/* Map Preview (only show when not many results) */}
              {dealershipsResult.dealerships.length <= 20 && (
                <div className="hidden lg:block">
                  <DealerMap 
                    dealerships={dealershipsResult.dealerships}
                    height={300}
                    className="shadow-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Dealership Grid */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {/* Results Header */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {hasFilters ? 'Resultados de búsqueda' : 'Todas las concesionarias'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {dealershipsResult.total === 0 
                      ? translations.dealership.noResults
                      : `${dealershipsResult.total} ${translations.dealership.totalFound}`
                    }
                  </p>
                </div>

                {/* View Toggle for Mobile Map */}
                {dealershipsResult.dealerships.length > 0 && (
                  <div className="lg:hidden">
                    <Button variant="outline" size="sm">
                      <MapPin className="h-4 w-4 mr-2" />
                      Ver mapa
                    </Button>
                  </div>
                )}
              </div>

              {/* Results */}
              {dealershipsResult.dealerships.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {hasFilters 
                        ? translations.dealership.noResultsFilters
                        : 'No hay concesionarias disponibles'
                      }
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {hasFilters 
                        ? 'Intenta ajustar los filtros para encontrar más resultados.'
                        : 'Las concesionarias se están cargando en el sistema.'
                      }
                    </p>
                    {hasFilters && (
                      <Button variant="outline">
                        {translations.dealership.clearFilters}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Dealership Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dealershipsResult.dealerships.map((dealership) => (
                      <DealerCard 
                        key={dealership.id} 
                        dealership={dealership}
                      />
                    ))}
                  </div>

                  {/* Pagination Info */}
                  {dealershipsResult.hasMore && (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-600 mb-4">
                        Mostrando {dealershipsResult.dealerships.length} de {dealershipsResult.total} concesionarias
                      </p>
                      <Button variant="outline">
                        <Users className="h-4 w-4 mr-2" />
                        Cargar más concesionarias
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Map Section (Mobile/Large datasets) */}
        {dealershipsResult.dealerships.length > 20 && (
          <section className="mt-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Ubicaciones en el mapa
              </h2>
              <p className="text-gray-600">
                Explora las ubicaciones de todas las concesionarias en un mapa interactivo.
              </p>
            </div>
            
            <DealerMap 
              dealerships={dealershipsResult.dealerships}
              height={500}
            />
          </section>
        )}
      </div>
    </div>
  );
}

export default function DealershipDirectoryPage({ searchParams }: DealershipDirectoryPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <div className="h-10 bg-gray-200 rounded mx-auto mb-4 w-96 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded mx-auto w-2/3 animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <Card className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-10 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-3">
              <DealershipGridSkeleton />
            </div>
          </div>
        </div>
      </div>
    }>
      <DealershipContent searchParams={searchParams} />
    </Suspense>
  );
}