import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Building,
  MapPin,
  Star,
  Car,
  Clock,
  Phone,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { DealerProfile } from '@/components/dealerships/DealerProfile';
import { DealerInventory } from '@/components/dealerships/DealerInventory';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import { 
  getDealershipByIdOrSlug,
  getDealershipVehicles,
  getFeaturedDealerships
} from '@/lib/dealership-queries';
import { translations } from '@/lib/translations';

interface DealershipPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: DealershipPageProps): Promise<Metadata> {
  const { id } = await params;
  const dealership = await getDealershipByIdOrSlug(id);
  
  if (!dealership) {
    return {
      title: 'Concesionaria no encontrada',
    };
  }

  const location = [dealership.cityName, dealership.provinceName].filter(Boolean).join(', ');
  
  return {
    title: translations.meta.titles.dealership
      .replace('{name}', dealership.name)
      .replace('{location}', location || 'Argentina'),
    description: translations.meta.descriptions.dealership
      .replace('{name}', dealership.name)
      .replace('{location}', location || 'Argentina'),
    openGraph: {
      title: dealership.name,
      description: `Concesionaria ${dealership.dealershipType} en ${location}. ${dealership.vehicleCount} vehículos disponibles.`,
      type: 'website',
    },
  };
}

// Loading component
function DealershipSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>

        {/* Header */}
        <Card className="mb-8 animate-pulse">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 bg-gray-200 rounded-full"></div>
                <div className="space-y-3">
                  <div className="h-8 bg-gray-200 rounded w-80"></div>
                  <div className="h-5 bg-gray-200 rounded w-48"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
              <div className="md:ml-auto space-y-3">
                <div className="h-10 bg-gray-200 rounded w-48"></div>
                <div className="h-8 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Skeleton */}
        <div className="space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

async function DealershipContent({ params }: DealershipPageProps) {
  // Fetch dealership data
  const { id } = await params;
  const dealership = await getDealershipByIdOrSlug(id);
  
  if (!dealership) {
    notFound();
  }

  // Fetch initial inventory and related dealerships
  const [inventoryResult, relatedDealerships] = await Promise.all([
    getDealershipVehicles(dealership.id, { limit: 6 }),
    getFeaturedDealerships(4)
  ]);

  const location = [dealership.cityName, dealership.provinceName].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link 
            href="/concesionarias" 
            className="hover:text-blue-600 transition-colors"
          >
            Concesionarias
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate">
            {dealership.name}
          </span>
        </nav>

        {/* Back Button (Mobile) */}
        <div className="md:hidden mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/concesionarias">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Volver a concesionarias
            </Link>
          </Button>
        </div>

        {/* Quick Actions Header (Mobile) */}
        <div className="md:hidden mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {dealership.whatsapp && (
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    asChild
                  >
                    <Link
                      href={`https://wa.me/${dealership.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, estoy interesado en ${dealership.name}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Link>
                  </Button>
                )}
                
                {dealership.phone && (
                  <Button variant="outline" asChild>
                    <Link href={`tel:${dealership.phone}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Llamar
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dealership Profile */}
        <DealerProfile dealership={dealership} className="mb-8" />

        {/* Vehicle Preview Section */}
        {inventoryResult.vehicles.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Vehículos Destacados
                </h2>
                <p className="text-gray-600">
                  Una selección de los vehículos disponibles en {dealership.name}
                </p>
              </div>
              
              <Button asChild>
                <Link href={`/concesionarias/${dealership.slug}/vehiculos`}>
                  Ver todos los {dealership.vehicleCount} vehículos
                </Link>
              </Button>
            </div>

            {/* Vehicle Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {inventoryResult.vehicles.slice(0, 6).map((vehicle) => (
                <VehicleCard 
                  key={vehicle.id} 
                  vehicle={vehicle}
                />
              ))}
            </div>

            {/* View All Link */}
            <div className="text-center">
              <Button variant="outline" size="lg" asChild>
                <Link href={`/concesionarias/${dealership.slug}/vehiculos`}>
                  <Car className="h-4 w-4 mr-2" />
                  Explorar todo el inventario ({dealership.vehicleCount} vehículos)
                </Link>
              </Button>
            </div>
          </section>
        )}

        {/* No Inventory Message */}
        {inventoryResult.vehicles.length === 0 && (
          <section className="mb-12">
            <Card>
              <CardContent className="p-12 text-center">
                <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Sin inventario actual
                </h3>
                <p className="text-gray-600 mb-6">
                  {dealership.name} no tiene vehículos disponibles en este momento, 
                  pero puede contactarlos para consultar sobre nuevas llegadas.
                </p>
                <div className="flex justify-center gap-4">
                  {dealership.whatsapp && (
                    <Button asChild>
                      <Link
                        href={`https://wa.me/${dealership.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, quiero consultar sobre vehículos disponibles en ${dealership.name}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Consultar por WhatsApp
                      </Link>
                    </Button>
                  )}
                  {dealership.phone && (
                    <Button variant="outline" asChild>
                      <Link href={`tel:${dealership.phone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Llamar
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        <Separator className="my-12" />

        {/* Related Dealerships */}
        {relatedDealerships.length > 0 && (
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Otras Concesionarias Destacadas
              </h2>
              <p className="text-gray-600">
                Explora otras concesionarias que podrían interesarte
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {relatedDealerships
                .filter(d => d.id !== dealership.id)
                .slice(0, 4)
                .map((relatedDealership) => (
                <Card key={relatedDealership.id} className="group hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          <Link href={`/concesionarias/${relatedDealership.slug}`}>
                            {relatedDealership.name}
                          </Link>
                        </h3>
                        {relatedDealership.isVerified && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                            Verificada
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span className="truncate">
                          {[relatedDealership.cityName, relatedDealership.provinceName]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-600">
                          <Car className="h-3 w-3 mr-1" />
                          <span>{relatedDealership.vehicleCount} vehículos</span>
                        </div>
                        
                        {relatedDealership.rating && (
                          <div className="flex items-center text-yellow-600">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            <span>{relatedDealership.rating}</span>
                          </div>
                        )}
                      </div>

                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors"
                        asChild
                      >
                        <Link href={`/concesionarias/${relatedDealership.slug}`}>
                          Ver detalles
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button variant="ghost" asChild>
                <Link href="/concesionarias">
                  <Building className="h-4 w-4 mr-2" />
                  Ver todas las concesionarias
                </Link>
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function DealershipPage({ params }: DealershipPageProps) {
  return (
    <Suspense fallback={<DealershipSkeleton />}>
      <DealershipContent params={params} />
    </Suspense>
  );
}