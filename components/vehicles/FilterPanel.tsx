'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Star, RotateCcw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format-utils';
import { translations } from '@/lib/translations';
import type { FilterOptions } from '@/lib/car-queries';
import type { VehicleFilters } from '@/lib/validation-schemas';

interface FilterPanelProps {
  options: FilterOptions;
  initialFilters: Partial<VehicleFilters>;
  onFiltersChange?: (filters: Partial<VehicleFilters>) => void;
  isMobile?: boolean;
  className?: string;
}

export default function FilterPanel({
  options,
  initialFilters,
  onFiltersChange,
  className
}: FilterPanelProps) {
  // Local state for filters
  const [filters, setFilters] = useState<Partial<VehicleFilters>>(initialFilters);
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery || '');
  
  // Collapsible sections state
  const [openSections, setOpenSections] = useState({
    search: true,
    price: true,
    location: false,
    brand: false,
    year: false,
    features: false
  });

  // Update local state when initialFilters change
  useEffect(() => {
    setFilters(initialFilters);
    setSearchQuery(initialFilters.searchQuery || '');
  }, [initialFilters]);

  // Apply filters (call parent callback)
  const applyFilters = (newFilters: Partial<VehicleFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange?.(updatedFilters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    const clearedFilters = {
      page: 1,
      limit: 20,
      offset: 0,
      sortBy: 'relevance' as const
    };
    setFilters(clearedFilters);
    setSearchQuery('');
    onFiltersChange?.(clearedFilters);
  };

  // Handle search input
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ searchQuery: searchQuery.trim() || undefined });
  };

  // Price range with sensible defaults
  const priceMin = filters.priceMin || options.priceRange.min || 0;
  const priceMax = filters.priceMax || options.priceRange.max || 50000000;
  const priceRangeMin = options.priceRange.min || 0;
  const priceRangeMax = Math.max(options.priceRange.max || 50000000, priceMax);

  // Year range
  const currentYear = new Date().getFullYear();
  const yearMin = filters.yearMin || options.yearRange.min || 1990;
  const yearMax = filters.yearMax || options.yearRange.max || currentYear;

  // Get cities for selected province
  const availableCities = useMemo(() => {
    if (!filters.provinceId) return [];
    const province = options.provinces.find(p => p.id === filters.provinceId);
    return province?.cities || [];
  }, [filters.provinceId, options.provinces]);

  // Count active filters
  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== undefined && value !== null && value !== '' && value !== 0
  ).length - 4; // Subtract default pagination/sorting params

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const FilterSection = ({ 
    id, 
    title, 
    children, 
 
  }: { 
    id: keyof typeof openSections; 
    title: string; 
    children: React.ReactNode; 
    defaultOpen?: boolean;
  }) => (
    <Collapsible open={openSections[id]} onOpenChange={() => toggleSection(id)}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 hover:text-foreground transition-colors [&[data-state=open]>svg]:rotate-180">
        <h3 className="text-sm font-medium">{title}</h3>
        <ChevronDown className="h-4 w-4 transition-transform" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {translations.filters.title}
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Section */}
        <FilterSection id="search" title="Búsqueda" defaultOpen>
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={translations.forms.placeholders.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" size="sm" className="w-full">
              {translations.common.search}
            </Button>
          </form>
        </FilterSection>

        <Separator />

        {/* Price Filter */}
        <FilterSection id="price" title={translations.filters.priceRange} defaultOpen>
          <div className="space-y-4">
            <div className="px-2">
              <Slider
                range
                min={priceRangeMin}
                max={priceRangeMax}
                step={100000}
                value={[priceMin, priceMax]}
                onValueChange={([min, max]) => {
                  applyFilters({ 
                    priceMin: min > priceRangeMin ? min : undefined,
                    priceMax: max < priceRangeMax ? max : undefined
                  });
                }}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatPrice(priceMin)}</span>
              <span>{formatPrice(priceMax)}</span>
            </div>
            
            {/* Custom Price Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="price-min" className="text-xs">
                  {translations.filters.minPrice}
                </Label>
                <Input
                  id="price-min"
                  type="number"
                  placeholder="Mínimo"
                  value={priceMin || ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || undefined;
                    applyFilters({ priceMin: value });
                  }}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="price-max" className="text-xs">
                  {translations.filters.maxPrice}
                </Label>
                <Input
                  id="price-max"
                  type="number"
                  placeholder="Máximo"
                  value={priceMax || ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || undefined;
                    applyFilters({ priceMax: value });
                  }}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </FilterSection>

        <Separator />

        {/* Location Filter */}
        <FilterSection id="location" title={translations.filters.location}>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{translations.filters.province}</Label>
              <Select
                value={filters.provinceId || ''}
                onValueChange={(value) =>
                  applyFilters({ 
                    provinceId: value || undefined,
                    cityId: undefined // Clear city when province changes
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={translations.filters.selectProvince} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    {translations.filters.allProvinces}
                  </SelectItem>
                  {options.provinces.map((province) => (
                    <SelectItem key={province.id} value={province.id}>
                      {province.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {availableCities.length > 0 && (
              <div>
                <Label className="text-xs">{translations.filters.city}</Label>
                <Select
                  value={filters.cityId || ''}
                  onValueChange={(value) =>
                    applyFilters({ cityId: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={translations.filters.selectCity} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      {translations.filters.allCities}
                    </SelectItem>
                    {availableCities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </FilterSection>

        <Separator />

        {/* Brand Filter */}
        <FilterSection id="brand" title={translations.filters.brand}>
          <div>
            <Label className="text-xs">{translations.filters.brand}</Label>
            <Select
              value={filters.brandId || ''}
              onValueChange={(value) =>
                applyFilters({ 
                  brandId: value || undefined,
                  modelId: undefined // Clear model when brand changes
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={translations.filters.selectBrand} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  {translations.filters.allBrands}
                </SelectItem>
                {options.brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name} ({brand.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FilterSection>

        <Separator />

        {/* Year Filter */}
        <FilterSection id="year" title={translations.filters.yearRange}>
          <div className="space-y-4">
            <div className="px-2">
              <Slider
                range
                min={options.yearRange.min || 1990}
                max={options.yearRange.max || currentYear}
                step={1}
                value={[yearMin, yearMax]}
                onValueChange={([min, max]) => {
                  applyFilters({ 
                    yearMin: min > (options.yearRange.min || 1990) ? min : undefined,
                    yearMax: max < (options.yearRange.max || currentYear) ? max : undefined
                  });
                }}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{yearMin}</span>
              <span>{yearMax}</span>
            </div>
          </div>
        </FilterSection>

        <Separator />

        {/* Additional Features */}
        <FilterSection id="features" title="Características">
          <div className="space-y-3">
            {/* Fuel Type */}
            {options.fuelTypes.length > 0 && (
              <div>
                <Label className="text-xs">{translations.vehicle.fuelType}</Label>
                <Select
                  value={filters.fuelType || ''}
                  onValueChange={(value) =>
                    applyFilters({ fuelType: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cualquier combustible" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {options.fuelTypes.map((fuel) => (
                      <SelectItem key={fuel.value} value={fuel.value}>
                        {fuel.value} ({fuel.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Transmission Type */}
            {options.transmissionTypes.length > 0 && (
              <div>
                <Label className="text-xs">{translations.vehicle.transmissionType}</Label>
                <Select
                  value={filters.transmissionType || ''}
                  onValueChange={(value) =>
                    applyFilters({ transmissionType: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cualquier transmisión" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {options.transmissionTypes.map((transmission) => (
                      <SelectItem key={transmission.value} value={transmission.value}>
                        {transmission.value} ({transmission.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Special Filters */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="opportunities"
                  checked={filters.onlyOpportunities || false}
                  onCheckedChange={(checked) =>
                    applyFilters({ onlyOpportunities: checked || undefined })
                  }
                />
                <Label htmlFor="opportunities" className="text-sm flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  {translations.filters.onlyOpportunities}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={filters.onlyFeatured || false}
                  onCheckedChange={(checked) =>
                    applyFilters({ onlyFeatured: checked || undefined })
                  }
                />
                <Label htmlFor="featured" className="text-sm">
                  {translations.filters.featuredOnly}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="with-photos"
                  checked={filters.withPhotos || false}
                  onCheckedChange={(checked) =>
                    applyFilters({ withPhotos: checked || undefined })
                  }
                />
                <Label htmlFor="with-photos" className="text-sm">
                  {translations.filters.withPhotos}
                </Label>
              </div>
            </div>
          </div>
        </FilterSection>

        {/* Clear All Button */}
        {activeFiltersCount > 0 && (
          <>
            <Separator />
            <Button
              variant="outline"
              onClick={clearAllFilters}
              className="w-full"
              size="sm"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {translations.filters.clearFilters}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}