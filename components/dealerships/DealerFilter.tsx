'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Filter, Search } from 'lucide-react';
import { translations } from '@/lib/translations';
import { DealershipFilters } from '@/lib/validation-schemas';

interface Province {
  id: number;
  name: string;
  dealershipCount: number;
}

interface City {
  id: number;
  name: string;
  dealershipCount: number;
}

interface Brand {
  brand: string;
  count: number;
}

interface DealerFilterProps {
  provinces?: Province[];
  brands?: Brand[];
  initialFilters?: Partial<DealershipFilters>;
  onFiltersChange?: (filters: Partial<DealershipFilters>) => void;
  className?: string;
  isCollapsible?: boolean;
}

export function DealerFilter({
  provinces = [],
  brands = [],
  initialFilters = {},
  onFiltersChange,
  className,
  isCollapsible = false
}: DealerFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState<Partial<DealershipFilters>>({
    searchQuery: '',
    provinceId: '',
    cityId: '',
    dealershipType: '',
    officialBrand: '',
    isVerified: undefined,
    hasVehicles: undefined,
    sortBy: 'name',
    sortOrder: 'asc',
    ...initialFilters
  });
  
  const [cities, setCities] = useState<City[]>([]);
  const [isExpanded, setIsExpanded] = useState(!isCollapsible);

  // Load cities when province changes
  useEffect(() => {
    const loadCities = async () => {
      if (filters.provinceId) {
        try {
          // TODO: Implement API call to get cities for province
          // For now, clear cities when province changes
          setCities([]);
        } catch (error) {
          console.error('Error loading cities:', error);
          setCities([]);
        }
      } else {
        setCities([]);
      }
    };

    loadCities();
  }, [filters.provinceId]);

  // Initialize filters from URL params
  useEffect(() => {
    const urlFilters: Partial<DealershipFilters> = {};
    
    searchParams.forEach((value, key) => {
      switch (key) {
        case 'q':
          urlFilters.searchQuery = value;
          break;
        case 'provincia':
          urlFilters.provinceId = value;
          break;
        case 'ciudad':
          urlFilters.cityId = value;
          break;
        case 'tipo':
          urlFilters.dealershipType = value as 'official' | 'multimarca';
          break;
        case 'marca':
          urlFilters.officialBrand = value;
          break;
        case 'verificadas':
          urlFilters.isVerified = value === 'true';
          break;
        case 'con_vehiculos':
          urlFilters.hasVehicles = value === 'true';
          break;
        case 'orden':
          const [sortBy, sortOrder] = value.split('_');
          urlFilters.sortBy = sortBy as 'name' | 'rating' | 'vehicleCount' | 'createdAt';
          urlFilters.sortOrder = (sortOrder as 'asc' | 'desc') || 'asc';
          break;
      }
    });

    setFilters(prev => ({ ...prev, ...urlFilters }));
  }, [searchParams]);

  const updateFilters = (newFilters: Partial<DealershipFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    
    // Update URL
    const params = new URLSearchParams();
    
    if (updatedFilters.searchQuery) {
      params.set('q', updatedFilters.searchQuery);
    }
    if (updatedFilters.provinceId) {
      params.set('provincia', updatedFilters.provinceId);
    }
    if (updatedFilters.cityId) {
      params.set('ciudad', updatedFilters.cityId);
    }
    if (updatedFilters.dealershipType) {
      params.set('tipo', updatedFilters.dealershipType);
    }
    if (updatedFilters.officialBrand) {
      params.set('marca', updatedFilters.officialBrand);
    }
    if (updatedFilters.isVerified !== undefined) {
      params.set('verificadas', updatedFilters.isVerified.toString());
    }
    if (updatedFilters.hasVehicles !== undefined) {
      params.set('con_vehiculos', updatedFilters.hasVehicles.toString());
    }
    if (updatedFilters.sortBy && updatedFilters.sortOrder) {
      params.set('orden', `${updatedFilters.sortBy}_${updatedFilters.sortOrder}`);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.push(`/concesionarias${newUrl}`, { scroll: false });
    
    // Notify parent component
    if (onFiltersChange) {
      onFiltersChange(updatedFilters);
    }
  };

  const clearFilters = () => {
    const clearedFilters = {
      searchQuery: '',
      provinceId: '',
      cityId: '',
      dealershipType: '',
      officialBrand: '',
      isVerified: undefined,
      hasVehicles: undefined,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const
    };
    
    setFilters(clearedFilters);
    setCities([]);
    router.push('/concesionarias', { scroll: false });
    
    if (onFiltersChange) {
      onFiltersChange(clearedFilters);
    }
  };

  const hasActiveFilters = () => {
    return !!(
      filters.searchQuery ||
      filters.provinceId ||
      filters.cityId ||
      filters.dealershipType ||
      filters.officialBrand ||
      filters.isVerified !== undefined ||
      filters.hasVehicles !== undefined
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.provinceId) count++;
    if (filters.cityId) count++;
    if (filters.dealershipType) count++;
    if (filters.officialBrand) count++;
    if (filters.isVerified !== undefined) count++;
    if (filters.hasVehicles !== undefined) count++;
    return count;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {translations.dealership.filterDealerships}
            {hasActiveFilters() && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFilterCount()}
              </Badge>
            )}
          </CardTitle>
          
          {isCollapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Ocultar' : 'Mostrar'}
            </Button>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">{translations.common.search}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                id="search"
                placeholder="Buscar concesionarias por nombre..."
                value={filters.searchQuery || ''}
                onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          {/* Location Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Province */}
            <div className="space-y-2">
              <Label>{translations.location.province}</Label>
              <Select
                value={filters.provinceId || ''}
                onValueChange={(value) => updateFilters({ 
                  provinceId: value || undefined,
                  cityId: undefined // Reset city when province changes
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar provincia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{translations.common.all}</SelectItem>
                  {provinces.map((province) => (
                    <SelectItem key={province.id} value={province.id.toString()}>
                      {province.name} ({province.dealershipCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label>{translations.location.city}</Label>
              <Select
                value={filters.cityId || ''}
                onValueChange={(value) => updateFilters({ cityId: value || undefined })}
                disabled={!filters.provinceId || cities.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ciudad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{translations.common.all}</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id.toString()}>
                      {city.name} ({city.dealershipCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Business Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dealership Type */}
            <div className="space-y-2">
              <Label>{translations.dealership.type}</Label>
              <Select
                value={filters.dealershipType || ''}
                onValueChange={(value) => updateFilters({ dealershipType: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de concesionaria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{translations.common.all}</SelectItem>
                  <SelectItem value="official">{translations.dealership.types.official}</SelectItem>
                  <SelectItem value="multimarca">{translations.dealership.types.multimarca}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Official Brand */}
            <div className="space-y-2">
              <Label>{translations.dealership.officialBrand}</Label>
              <Select
                value={filters.officialBrand || ''}
                onValueChange={(value) => updateFilters({ officialBrand: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Marca oficial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{translations.common.all}</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.brand} value={brand.brand}>
                      {brand.brand} ({brand.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status Filters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="verified">{translations.dealership.verifiedOnly}</Label>
              <Switch
                id="verified"
                checked={filters.isVerified === true}
                onCheckedChange={(checked) => updateFilters({ 
                  isVerified: checked ? true : undefined 
                })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="hasVehicles">{translations.dealership.withInventory}</Label>
              <Switch
                id="hasVehicles"
                checked={filters.hasVehicles === true}
                onCheckedChange={(checked) => updateFilters({ 
                  hasVehicles: checked ? true : undefined 
                })}
              />
            </div>
          </div>

          {/* Sorting */}
          <div className="space-y-2">
            <Label>{translations.dealership.sortBy}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={filters.sortBy || 'name'}
                onValueChange={(value) => updateFilters({ 
                  sortBy: value as 'name' | 'rating' | 'vehicleCount' | 'createdAt'
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">{translations.dealership.sortByName}</SelectItem>
                  <SelectItem value="rating">{translations.dealership.sortByRating}</SelectItem>
                  <SelectItem value="vehicleCount">{translations.dealership.sortByVehicleCount}</SelectItem>
                  <SelectItem value="createdAt">{translations.dealership.sortByNewest}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.sortOrder || 'asc'}
                onValueChange={(value) => updateFilters({ 
                  sortOrder: value as 'asc' | 'desc'
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">{translations.dealership.sortAscending}</SelectItem>
                  <SelectItem value="desc">{translations.dealership.sortDescending}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters() && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                {translations.dealership.clearFilters}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}