'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Car, 
  Search, 
  Filter,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import { VehicleGridSkeleton } from '@/components/vehicles/VehicleGridSkeleton';
import { Vehicle } from '@/lib/schema';
import { PublicDealership } from '@/lib/dealership-queries';
import { DealershipInventoryFilters } from '@/lib/validation-schemas';
import { cn } from '@/lib/utils';

interface DealerInventoryProps {
  dealership: PublicDealership;
  initialVehicles?: Vehicle[];
  initialTotal?: number;
  initialHasMore?: boolean;
  className?: string;
}

interface InventoryData {
  vehicles: Vehicle[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
}

export function DealerInventory({ 
  dealership, 
  initialVehicles = [],
  initialTotal = 0,
  initialHasMore = false,
  className 
}: DealerInventoryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<Partial<DealershipInventoryFilters>>({
    searchQuery: '',
    priceMin: undefined,
    priceMax: undefined,
    yearMin: undefined,
    yearMax: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 12
  });

  const [inventoryData, setInventoryData] = useState<InventoryData>({
    vehicles: initialVehicles,
    total: initialTotal,
    hasMore: initialHasMore,
    loading: false,
    error: null
  });

  // Fetch vehicles data
  const fetchVehicles = async (newFilters: Partial<DealershipInventoryFilters>) => {
    setInventoryData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams();
      
      if (newFilters.searchQuery) params.set('searchQuery', newFilters.searchQuery);
      if (newFilters.priceMin) params.set('priceMin', newFilters.priceMin.toString());
      if (newFilters.priceMax) params.set('priceMax', newFilters.priceMax.toString());
      if (newFilters.yearMin) params.set('yearMin', newFilters.yearMin.toString());
      if (newFilters.yearMax) params.set('yearMax', newFilters.yearMax.toString());
      if (newFilters.brandId) params.set('brandId', newFilters.brandId);
      if (newFilters.condition) params.set('condition', newFilters.condition);
      if (newFilters.fuelType) params.set('fuelType', newFilters.fuelType);
      if (newFilters.transmissionType) params.set('transmissionType', newFilters.transmissionType);
      if (newFilters.sortBy) params.set('sortBy', newFilters.sortBy);
      if (newFilters.sortOrder) params.set('sortOrder', newFilters.sortOrder);
      if (newFilters.page) params.set('page', newFilters.page.toString());
      if (newFilters.limit) params.set('limit', newFilters.limit.toString());

      const response = await fetch(`/api/dealerships/${dealership.id}/vehicles?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar vehículos');
      }

      const data = await response.json();
      
      setInventoryData({
        vehicles: data.data.vehicles,
        total: data.data.total,
        hasMore: data.data.hasMore,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setInventoryData(prev => ({
        ...prev,
        loading: false,
        error: 'Error al cargar vehículos. Por favor, intente nuevamente.'
      }));
    }
  };

  // Update filters and fetch data
  const updateFilters = (newFilters: Partial<DealershipInventoryFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 }; // Reset page when filters change
    setFilters(updatedFilters);
    fetchVehicles(updatedFilters);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const updatedFilters = { ...filters, page: newPage };
    setFilters(updatedFilters);
    fetchVehicles(updatedFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters: Partial<DealershipInventoryFilters> = {
      searchQuery: '',
      priceMin: undefined,
      priceMax: undefined,
      yearMin: undefined,
      yearMax: undefined,
      brandId: undefined,
      condition: undefined,
      fuelType: undefined,
      transmissionType: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 12
    };
    
    setFilters(clearedFilters);
    fetchVehicles(clearedFilters);
  };

  const hasActiveFilters = () => {
    return !!(
      filters.searchQuery ||
      filters.priceMin ||
      filters.priceMax ||
      filters.yearMin ||
      filters.yearMax ||
      filters.brandId ||
      filters.condition ||
      filters.fuelType ||
      filters.transmissionType
    );
  };

  const totalPages = Math.ceil(inventoryData.total / (filters.limit || 12));
  const currentPage = filters.page || 1;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Dealership Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Inventario de {dealership.name}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {inventoryData.total} vehículos disponibles
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
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search and Primary Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar vehículos..."
                  value={filters.searchQuery || ''}
                  onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                  className="pl-10"
                />
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Precio mín"
                  value={filters.priceMin || ''}
                  onChange={(e) => updateFilters({ 
                    priceMin: e.target.value ? Number(e.target.value) : undefined 
                  })}
                />
                <Input
                  type="number"
                  placeholder="Precio máx"
                  value={filters.priceMax || ''}
                  onChange={(e) => updateFilters({ 
                    priceMax: e.target.value ? Number(e.target.value) : undefined 
                  })}
                />
              </div>

              {/* Year Range */}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Año mín"
                  value={filters.yearMin || ''}
                  onChange={(e) => updateFilters({ 
                    yearMin: e.target.value ? Number(e.target.value) : undefined 
                  })}
                />
                <Input
                  type="number"
                  placeholder="Año máx"
                  value={filters.yearMax || ''}
                  onChange={(e) => updateFilters({ 
                    yearMax: e.target.value ? Number(e.target.value) : undefined 
                  })}
                />
              </div>

              {/* Sort */}
              <Select
                value={`${filters.sortBy}_${filters.sortOrder}`}
                onValueChange={(value) => {
                  const [sortBy, sortOrder] = value.split('_');
                  updateFilters({ 
                    sortBy: sortBy as 'price' | 'year' | 'mileage' | 'createdAt',
                    sortOrder: sortOrder as 'asc' | 'desc'
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt_desc">Más recientes</SelectItem>
                  <SelectItem value="createdAt_asc">Más antiguos</SelectItem>
                  <SelectItem value="price_asc">Precio: menor a mayor</SelectItem>
                  <SelectItem value="price_desc">Precio: mayor a menor</SelectItem>
                  <SelectItem value="year_desc">Año: más nuevo</SelectItem>
                  <SelectItem value="year_asc">Año: más antiguo</SelectItem>
                  <SelectItem value="mileage_asc">Menor kilometraje</SelectItem>
                  <SelectItem value="mileage_desc">Mayor kilometraje</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Advanced Filters - Collapsible */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                value={filters.condition || ''}
                onValueChange={(value) => updateFilters({ condition: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="nuevo">Nuevo</SelectItem>
                  <SelectItem value="usado">Usado</SelectItem>
                  <SelectItem value="certificado">Certificado</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.fuelType || ''}
                onValueChange={(value) => updateFilters({ fuelType: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Combustible" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="nafta">Nafta</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="gnc">GNC</SelectItem>
                  <SelectItem value="hibrido">Híbrido</SelectItem>
                  <SelectItem value="electrico">Eléctrico</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.transmissionType || ''}
                onValueChange={(value) => updateFilters({ transmissionType: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Transmisión" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatica">Automática</SelectItem>
                  <SelectItem value="cvt">CVT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters and View Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {hasActiveFilters() && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <Filter className="h-4 w-4 mr-2" />
                    Limpiar filtros
                  </Button>
                )}
                
                <span className="text-sm text-gray-600">
                  {inventoryData.total} vehículos encontrados
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <div>
        {inventoryData.loading && (
          <VehicleGridSkeleton count={12} />
        )}

        {inventoryData.error && (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error al cargar vehículos
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {inventoryData.error}
              </p>
              <Button onClick={() => fetchVehicles(filters)}>
                Intentar nuevamente
              </Button>
            </CardContent>
          </Card>
        )}

        {!inventoryData.loading && !inventoryData.error && inventoryData.vehicles.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No se encontraron vehículos
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {hasActiveFilters() 
                  ? 'No hay vehículos que coincidan con los filtros aplicados.'
                  : 'Esta concesionaria no tiene vehículos disponibles en este momento.'
                }
              </p>
              {hasActiveFilters() && (
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {!inventoryData.loading && !inventoryData.error && inventoryData.vehicles.length > 0 && (
          <>
            {/* Vehicle Grid */}
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            )}>
              {inventoryData.vehicles.map((vehicle) => (
                <VehicleCard 
                  key={vehicle.id} 
                  vehicle={vehicle} 
                  layout={viewMode}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    const isActive = page === currentPage;
                    
                    return (
                      <Button
                        key={page}
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    );
                  })}
                  
                  {totalPages > 5 && (
                    <>
                      <span className="px-2">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        className="w-10"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}