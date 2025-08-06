import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import VehicleGridSkeleton from '@/components/vehicles/VehicleGridSkeleton';
import FilterPanelSkeleton from '@/components/vehicles/FilterPanelSkeleton';

export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb Skeleton */}
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-12" />
            <span className="text-muted-foreground">/</span>
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        {/* Page Header Skeleton */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <Skeleton className="h-10 w-96 mb-2" />
              <Skeleton className="h-6 w-full max-w-2xl" />
            </div>
            
            {/* Quick Stats Skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="p-2 rounded-lg bg-muted">
                        <Skeleton className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filter Sidebar Skeleton */}
          <aside className="lg:col-span-1 order-2 lg:order-1">
            <div className="sticky top-20">
              <FilterPanelSkeleton />
            </div>
          </aside>

          {/* Vehicle Grid Skeleton */}
          <main className="lg:col-span-3 order-1 lg:order-2">
            {/* Header with controls skeleton */}
            <div className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <Skeleton className="h-5 w-48" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-40" />
                    <div className="hidden md:flex border rounded-md">
                      <Skeleton className="h-10 w-10 rounded-r-none" />
                      <Skeleton className="h-10 w-10 rounded-l-none" />
                    </div>
                  </div>
                </div>
              </div>

              <VehicleGridSkeleton />
            </div>
          </main>
        </div>

        {/* Bottom Content Skeleton */}
        <div className="mt-16 pt-12 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i}>
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 6 }, (_, j) => (
                    <Skeleton key={j} className="h-6 w-20 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SEO Content Skeleton */}
        <div className="mt-12 pt-8 border-t">
          <Skeleton className="h-8 w-96 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i}>
                <Skeleton className="h-5 w-48 mb-2" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}