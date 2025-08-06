'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, SlidersHorizontal, X, Grid3X3, LayoutList } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import VehicleCard from './VehicleCard';
import FilterPanel from './FilterPanel';
import VehicleGridSkeleton from './VehicleGridSkeleton';
import { translations } from '@/lib/translations';
import { formatNumber } from '@/lib/format-utils';
import { filtersToSearchParams } from '@/lib/validation-schemas';
import type { VehicleSearchResult, FilterOptions } from '@/lib/car-queries';
import type { VehicleFilters } from '@/lib/validation-schemas';

interface VehicleGridProps {
  initialData: {
    vehicles: VehicleSearchResult[];
    total: number;
    hasMore: boolean;
  };
  initialFilters: Partial<VehicleFilters>;
  filterOptions: FilterOptions;
}

export default function VehicleGrid({
  initialData,
  initialFilters,
  filterOptions
}: VehicleGridProps) {
  const router = useRouter();
  
  // State management
  const [vehicles, setVehicles] = useState(initialData.vehicles);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(initialData.total);
  const [hasMore, setHasMore] = useState(initialData.hasMore);
  const [currentFilters, setCurrentFilters] = useState<Partial<VehicleFilters>>(initialFilters);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const showingFrom = vehicles.length > 0 ? 1 : 0;
  const showingTo = vehicles.length;

  // Active filters for display
  const activeFilters = useMemo(() => {
    const active: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];
    
    if (currentFilters.searchQuery) {
      active.push({
        key: 'search',
        label: 'Búsqueda',
        value: currentFilters.searchQuery,
        onRemove: () => updateFilters({ searchQuery: undefined })
      });
    }
    
    if (currentFilters.brandId) {
      const brand = filterOptions.brands.find(b => b.id === currentFilters.brandId);
      if (brand) {
        active.push({
          key: 'brand',
          label: 'Marca',
          value: brand.name,
          onRemove: () => updateFilters({ brandId: undefined, modelId: undefined })
        });
      }
    }
    
    if (currentFilters.provinceId) {
      const province = filterOptions.provinces.find(p => p.id === currentFilters.provinceId);
      if (province) {
        active.push({
          key: 'province',
          label: 'Provincia',
          value: province.name,
          onRemove: () => updateFilters({ provinceId: undefined, cityId: undefined })
        });
      }
    }
    
    if (currentFilters.priceMin || currentFilters.priceMax) {
      const min = currentFilters.priceMin || 0;
      const max = currentFilters.priceMax || 0;
      active.push({
        key: 'price',
        label: 'Precio',
        value: max ? `${formatNumber(min)} - ${formatNumber(max)}` : `Desde ${formatNumber(min)}`,
        onRemove: () => updateFilters({ priceMin: undefined, priceMax: undefined })
      });
    }
    
    if (currentFilters.yearMin || currentFilters.yearMax) {
      const min = currentFilters.yearMin || 0;
      const max = currentFilters.yearMax || new Date().getFullYear();
      active.push({
        key: 'year',
        label: 'Año',
        value: min && max && min !== max ? `${min} - ${max}` : min ? `Desde ${min}` : `Hasta ${max}`,
        onRemove: () => updateFilters({ yearMin: undefined, yearMax: undefined })
      });
    }
    
    if (currentFilters.onlyOpportunities) {
      active.push({
        key: 'opportunities',
        label: 'Filtro',
        value: 'Solo oportunidades',
        onRemove: () => updateFilters({ onlyOpportunities: undefined })
      });
    }
    
    return active;
  }, [currentFilters, filterOptions, updateFilters]);

  // Update filters and search
  const updateFilters = useCallback(async (newFilters: Partial<VehicleFilters>) => {
    const updatedFilters = {
      ...currentFilters,
      ...newFilters,
      page: 1, // Reset to first page when filters change
      offset: 0
    };
    
    // Remove undefined values
    Object.keys(updatedFilters).forEach(key => {
      if (updatedFilters[key as keyof VehicleFilters] === undefined) {
        delete updatedFilters[key as keyof VehicleFilters];
      }
    });
    
    setCurrentFilters(updatedFilters);
    
    // Update URL
    const params = filtersToSearchParams(updatedFilters);
    const urlParams = new URLSearchParams(params);
    router.push(`/marketplace?${urlParams.toString()}`, { scroll: false });
    
    // Fetch new results
    await searchWithFilters(updatedFilters, false);
  }, [currentFilters, router]);

  // Load more vehicles (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    
    const nextOffset = vehicles.length;
    const loadMoreFilters = {
      ...currentFilters,
      offset: nextOffset
    };
    
    await searchWithFilters(loadMoreFilters, true);
  }, [currentFilters, vehicles.length, hasMore, isLoadingMore]);

  // Search with filters
  const searchWithFilters = async (filters: Partial<VehicleFilters>, loadingMore = false) => {
    try {
      if (loadingMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }
      
      const response = await fetch('/api/cars/search?' + new URLSearchParams(
        Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ));
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (loadingMore) {
        setVehicles(prev => [...prev, ...data.vehicles]);
      } else {
        setVehicles(data.vehicles);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
      
    } catch (err) {
      // Silently handle search errors - they're already displayed to user
      setError(err instanceof Error ? err.message : 'Error al buscar vehículos');
      if (!loadingMore) {
        setVehicles([]);
        setTotal(0);
        setHasMore(false);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    const baseFilters = {
      page: 1,
      limit: 20,
      offset: 0,
      sortBy: 'relevance' as const
    };
    updateFilters(baseFilters);
  };

  return (
    <div className="space-y-6">
      {/* Header with Results Info and Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {total > 0 ? (
                <>
                  {translations.common.showing} <span className="font-medium">{showingFrom}-{showingTo}</span> {translations.common.of} <span className="font-medium">{formatNumber(total)}</span> {translations.common.results}
                </>
              ) : (
                <span>{translations.common.noResults}</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Select */}
            <Select
              value={currentFilters.sortBy || 'relevance'}
              onValueChange={(value) => updateFilters({ sortBy: value as VehicleFilters['sortBy'] })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">{translations.filters.sortOptions.relevance}</SelectItem>
                <SelectItem value="price_asc">{translations.filters.sortOptions.priceAsc}</SelectItem>
                <SelectItem value="price_desc">{translations.filters.sortOptions.priceDesc}</SelectItem>
                <SelectItem value="year_desc">{translations.filters.sortOptions.yearDesc}</SelectItem>
                <SelectItem value="date_desc">{translations.filters.sortOptions.dateDesc}</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="hidden md:flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Filter Button */}
            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  {translations.common.filters}
                  {activeFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                      {activeFilters.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>{translations.filters.title}</SheetTitle>
                </SheetHeader>
                <FilterPanel
                  options={filterOptions}
                  initialFilters={currentFilters}
                  onFiltersChange={(filters) => {
                    updateFilters(filters);
                    setIsFilterSheetOpen(false);
                  }}
                  isMobile
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{translations.filters.activeFilters}:</span>
            {activeFilters.map((filter) => (
              <Badge
                key={filter.key}
                variant="secondary"
                className="gap-1"
              >
                <span className="text-xs text-muted-foreground">{filter.label}:</span>
                {filter.value}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 hover:bg-transparent"
                  onClick={filter.onRemove}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-auto py-1 px-2 text-xs"
            >
              {translations.filters.clearFilters}
            </Button>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={() => searchWithFilters(currentFilters)}
            >
              {translations.common.tryAgain}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && <VehicleGridSkeleton />}

      {/* Vehicle Grid/List */}
      {!isLoading && vehicles.length > 0 && (
        <>
          <div className={
            viewMode === 'grid'
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              : "space-y-4"
          }>
            {vehicles.map((vehicle, index) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                priority={index < 6} // Priority loading for first 6 images
                compact={viewMode === 'list'}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-8">
              <Button
                onClick={loadMore}
                disabled={isLoadingMore}
                size="lg"
                className="min-w-[200px]"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {translations.common.loading}
                  </>
                ) : (
                  `${translations.common.viewMore} (${Math.min((currentFilters.limit || 20), total - vehicles.length)} más)`
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && vehicles.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 mb-4 bg-muted rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {translations.common.noResults}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            No se encontraron vehículos que coincidan con tu búsqueda. 
            Intenta ajustar los filtros o realizar una nueva búsqueda.
          </p>
          <Button onClick={clearAllFilters} variant="outline">
            {translations.filters.clearFilters}
          </Button>
        </div>
      )}
    </div>
  );
}