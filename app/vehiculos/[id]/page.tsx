import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getVehicleDetails, getRelatedVehicles } from '@/lib/car-queries';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/format-utils';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { ComponentErrorBoundary, WidgetErrorBoundary } from '@/components/ErrorBoundary';
import VehicleGalleryEnhanced from '@/components/vehicles/VehicleGalleryEnhanced';
import VehicleHeader from '@/components/vehicles/VehicleHeader';
import VehicleSpecs from '@/components/vehicles/VehicleSpecs';
import VehicleActions from '@/components/vehicles/VehicleActions';
import RelatedVehicles from '@/components/vehicles/RelatedVehicles';
import SocialShare from '@/components/vehicles/SocialShare';

interface VehiclePageProps {
  params: Promise<{ id: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: VehiclePageProps): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const vehicle = await getVehicleDetails(id);
    
    if (!vehicle) {
      return {
        title: 'Vehículo no encontrado - GarageAI',
        description: 'El vehículo que buscas no está disponible.'
      };
    }

    const title = `${vehicle.brand} ${vehicle.model} ${vehicle.year} - ${formatPrice(vehicle.price, vehicle.currency)} - GarageAI`;
    const description = `${vehicle.brand} ${vehicle.model} ${vehicle.year} en ${vehicle.location}. ${vehicle.description ? vehicle.description.substring(0, 150) + '...' : 'Excelente oportunidad de compra.'}`;
    
    return {
      title,
      description,
      keywords: [
        `${vehicle.brand}`,
        `${vehicle.model}`,
        `${vehicle.year}`,
        'auto usado',
        'vehículo Argentina',
        vehicle.location,
        vehicle.condition || '',
        vehicle.fuel || '',
        vehicle.transmission || ''
      ].filter(Boolean),
      openGraph: {
        title,
        description,
        type: 'website',
        locale: 'es_AR',
        images: vehicle.primaryImage ? [
          {
            url: vehicle.primaryImage,
            width: 1200,
            height: 630,
            alt: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`
          }
        ] : []
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: vehicle.primaryImage ? [vehicle.primaryImage] : []
      },
      alternates: {
        canonical: `/vehiculos/${id}`
      }
    };
  } catch (error) {
    console.error('Error generating metadata for vehicle:', error);
    return {
      title: 'Vehículo - GarageAI',
      description: 'Información del vehículo en GarageAI'
    };
  }
}

export default async function VehiclePage({ params }: VehiclePageProps) {
  const { id } = await params;
  
  // Fetch vehicle details and related vehicles in parallel
  const [vehicle, relatedVehicles] = await Promise.all([
    getVehicleDetails(id).catch(() => null),
    getRelatedVehicles(id, 4).catch(() => [])
  ]);

  // Return 404 if vehicle not found
  if (!vehicle) {
    notFound();
  }

  // Generate structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
    description: vehicle.description || `${vehicle.brand} ${vehicle.model} ${vehicle.year} en excelente condición`,
    brand: {
      '@type': 'Brand',
      name: vehicle.brand
    },
    model: vehicle.model,
    vehicleModelDate: vehicle.year,
    vehicleIdentificationNumber: vehicle.vin || undefined,
    color: vehicle.color || undefined,
    fuelType: vehicle.fuel || undefined,
    vehicleTransmission: vehicle.transmission || undefined,
    mileageFromOdometer: vehicle.mileage ? {
      '@type': 'QuantitativeValue',
      value: vehicle.mileage,
      unitCode: 'KMT'
    } : undefined,
    offers: {
      '@type': 'Offer',
      price: vehicle.price ? parseFloat(vehicle.price) : undefined,
      priceCurrency: vehicle.currency || 'ARS',
      availability: 'https://schema.org/InStock',
      seller: vehicle.dealershipInfo ? {
        '@type': 'AutoDealer',
        name: vehicle.dealershipInfo.name,
        telephone: vehicle.dealershipInfo.phone || undefined,
        address: vehicle.dealershipInfo.address || undefined
      } : undefined
    },
    image: vehicle.images.map(img => img.url),
    url: `https://garageai.vercel.app/vehiculos/${id}`
  };

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />

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
                  <BreadcrumbLink href="/marketplace">
                    {translations.navigation.breadcrumb.marketplace}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {vehicle.brand} {vehicle.model} {vehicle.year}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Vehicle Header */}
          <ComponentErrorBoundary>
            <VehicleHeader vehicle={vehicle} />
          </ComponentErrorBoundary>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Left Column - Gallery and Description */}
            <div className="lg:col-span-2 space-y-8">
              {/* Enhanced Image Gallery with Touch Support */}
              <ComponentErrorBoundary>
                <VehicleGalleryEnhanced 
                  images={vehicle.images}
                  vehicleTitle={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
                />
              </ComponentErrorBoundary>

              {/* Vehicle Description */}
              {vehicle.description && (
                <div className="bg-card p-6 rounded-lg border">
                  <h2 className="text-xl font-semibold mb-4">Descripción</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-muted-foreground leading-relaxed">
                      {vehicle.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Technical Specifications */}
              <ComponentErrorBoundary>
                <VehicleSpecs vehicle={vehicle} />
              </ComponentErrorBoundary>
            </div>

            {/* Right Column - Actions and Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Vehicle Actions - View on Original Site */}
              <ComponentErrorBoundary>
                <VehicleActions vehicle={vehicle} />
              </ComponentErrorBoundary>

              {/* Vehicle Highlights */}
              <div className="bg-card p-6 rounded-lg border">
                <h3 className="font-semibold mb-4">Destacados</h3>
                <div className="space-y-3">
                  {vehicle.isOpportunity && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        🤖 Oportunidad AI
                      </Badge>
                      {vehicle.opportunityScore && (
                        <span className="text-sm text-muted-foreground">
                          Puntuación: {vehicle.opportunityScore}/100
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {vehicle.year && (
                      <div>
                        <span className="text-muted-foreground">Año:</span>
                        <span className="ml-1 font-medium">{vehicle.year}</span>
                      </div>
                    )}
                    {vehicle.mileage && (
                      <div>
                        <span className="text-muted-foreground">KM:</span>
                        <span className="ml-1 font-medium">{vehicle.mileage.toLocaleString()}</span>
                      </div>
                    )}
                    {vehicle.fuel && (
                      <div>
                        <span className="text-muted-foreground">Combustible:</span>
                        <span className="ml-1 font-medium">{vehicle.fuel}</span>
                      </div>
                    )}
                    {vehicle.transmission && (
                      <div>
                        <span className="text-muted-foreground">Transmisión:</span>
                        <span className="ml-1 font-medium">{vehicle.transmission}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Social Share */}
              <ComponentErrorBoundary>
                <SocialShare vehicle={vehicle} />
              </ComponentErrorBoundary>
            </div>
          </div>

          {/* Related Vehicles */}
          <div className="mt-16">
            <Suspense fallback={
              <div>
                <h2 className="text-2xl font-bold mb-8">Vehículos relacionados</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-card p-4 rounded-lg border animate-pulse">
                      <div className="h-48 bg-muted rounded-lg mb-4" />
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </div>
                  ))}
                </div>
              </div>
            }>
              <WidgetErrorBoundary>
                <RelatedVehicles 
                  relatedVehicles={relatedVehicles}
                  currentVehicleId={id}
                />
              </WidgetErrorBoundary>
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}