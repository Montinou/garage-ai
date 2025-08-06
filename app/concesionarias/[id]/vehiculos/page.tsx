import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Building } from 'lucide-react';
import { DealerInventory } from '@/components/dealerships/DealerInventory';
import { 
  getDealershipByIdOrSlug,
  getDealershipVehicles
} from '@/lib/dealership-queries';

interface DealershipInventoryPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: DealershipInventoryPageProps): Promise<Metadata> {
  const { id } = await params;
  const dealership = await getDealershipByIdOrSlug(id);
  
  if (!dealership) {
    return {
      title: 'Concesionaria no encontrada',
    };
  }

  const location = [dealership.cityName, dealership.provinceName].filter(Boolean).join(', ');
  
  return {
    title: `Inventario de ${dealership.name} - ${location}`,
    description: `Explora todos los ${dealership.vehicleCount} vehículos disponibles en ${dealership.name}, concesionaria ${dealership.dealershipType} en ${location}.`,
    openGraph: {
      title: `Inventario de ${dealership.name}`,
      description: `${dealership.vehicleCount} vehículos disponibles en ${location}`,
      type: 'website',
    },
  };
}

// Loading component (reserved for future use)
// function InventorySkeleton() {
//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-7xl mx-auto px-4 py-8">
//         {/* Breadcrumb */}
//         <div className="mb-6">
//           <div className="h-6 bg-gray-200 rounded w-96 animate-pulse"></div>
//         </div>
//
//         {/* Header */}
//         <div className="mb-8">
//           <div className="h-8 bg-gray-200 rounded w-80 mb-2 animate-pulse"></div>
//           <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
//         </div>
//
//         {/* Inventory Skeleton */}
//         <VehicleGridSkeleton count={12} />
//       </div>
//     </div>
//   );
// }

export default async function DealershipInventoryPage({ params }: DealershipInventoryPageProps) {
  // Fetch dealership data
  const { id } = await params;
  const dealership = await getDealershipByIdOrSlug(id);
  
  if (!dealership) {
    notFound();
  }

  // Fetch initial inventory
  const inventoryResult = await getDealershipVehicles(dealership.id, { 
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

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
          <Link 
            href={`/concesionarias/${dealership.slug}`}
            className="hover:text-blue-600 transition-colors truncate"
          >
            {dealership.name}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            Vehículos
          </span>
        </nav>

        {/* Back Button (Mobile) */}
        <div className="md:hidden mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/concesionarias/${dealership.slug}`}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Volver a {dealership.name}
            </Link>
          </Button>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Inventario de {dealership.name}
              </h1>
              <p className="text-gray-600 flex items-center gap-2">
                <Building className="h-4 w-4" />
                {location}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {dealership.dealershipType === 'official' ? 'Oficial' : 'Multimarca'}
              </Badge>
              {dealership.officialBrand && (
                <Badge variant="secondary">
                  {dealership.officialBrand}
                </Badge>
              )}
              {dealership.isVerified && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Verificada
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>
              <strong className="text-gray-900">{dealership.vehicleCount}</strong> vehículos disponibles
            </span>
            {dealership.rating && (
              <span>
                <strong className="text-gray-900">{dealership.rating}</strong> estrellas promedio
              </span>
            )}
            <span>
              Actualizado {new Date(dealership.updatedAt).toLocaleDateString('es-AR')}
            </span>
          </div>
        </div>

        {/* Main Inventory Component */}
        <DealerInventory 
          dealership={dealership}
          initialVehicles={inventoryResult.vehicles}
          initialTotal={inventoryResult.total}
          initialHasMore={inventoryResult.hasMore}
        />

        {/* Bottom Actions */}
        <div className="mt-12 text-center">
          <div className="space-y-4">
            <p className="text-gray-600">
              ¿No encontraste lo que buscabas? Contacta directamente con {dealership.name}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild>
                <Link href={`/concesionarias/${dealership.slug}`}>
                  Ver perfil completo
                </Link>
              </Button>
              
              <Button variant="outline" asChild>
                <Link href="/concesionarias">
                  <Building className="h-4 w-4 mr-2" />
                  Explorar otras concesionarias
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}