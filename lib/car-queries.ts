/**
 * Extended database queries for the Argentine car marketplace
 * Optimized queries for vehicle search, filtering, and marketplace functionality
 */

import { db } from './neon';
import { 
  vehicles, 
  brands, 
  models, 
  images,
  vehicleImages,
  dealerships, 
  cities, 
  provinces,
  type Vehicle
} from './schema';
import { 
  eq, 
  desc, 
  asc,
  and, 
  or,
  ilike,
  isNotNull,
  gte,
  lte,
  sql, 
  count
} from 'drizzle-orm';
import type { VehicleFilters } from './validation-schemas';

// Types for query results
export interface VehicleSearchResult {
  id: string;
  title: string;
  price: string | null;
  currency: string;
  year: number | null;
  mileage: number | null;
  brand: string | null;
  model: string | null;
  location: string;
  dealership: string | null;
  dealershipSlug: string | null;
  primaryImage: string | null;
  isOpportunity: boolean | null;
  opportunityScore: number | null;
  condition: string | null;
  fuel: string | null;
  transmission: string | null;
  createdAt: Date;
}

export interface VehicleDetails extends VehicleSearchResult {
  description: string | null;
  engineSize: string | null;
  horsepower: number | null;
  color: string | null;
  vin: string | null;
  sourceUrl: string | null;
  dealershipInfo: {
    id: string;
    name: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    address: string | null;
    officialBrand: string | null;
    dealershipType: string;
    rating: string | null;
  } | null;
  images: Array<{
    id: string;
    url: string;
    order: number;
    type: string;
    isPrimary: boolean;
  }>;
  specs: {
    year: number | null;
    mileage: number | null;
    engineSize: string | null;
    horsepower: number | null;
    fuel: string | null;
    transmission: string | null;
    condition: string | null;
    color: string | null;
  };
}

export interface FilterOptions {
  brands: Array<{ id: string; name: string; count: number }>;
  provinces: Array<{
    id: string;
    name: string;
    region: string | null;
    cities: Array<{ id: string; name: string }>;
  }>;
  priceRange: {
    min: number;
    max: number;
    avg: number;
  };
  yearRange: {
    min: number;
    max: number;
  };
  fuelTypes: Array<{ value: string; count: number }>;
  transmissionTypes: Array<{ value: string; count: number }>;
}

/**
 * Build dynamic WHERE conditions based on filters
 */
function buildFilterConditions(filters: Partial<VehicleFilters>) {
  const conditions = [];

  // Base condition: only active/available vehicles
  conditions.push(eq(vehicles.status, 'available'));

  // Price filters
  if (filters.priceMin) {
    conditions.push(gte(vehicles.price, filters.priceMin.toString()));
  }
  if (filters.priceMax) {
    conditions.push(lte(vehicles.price, filters.priceMax.toString()));
  }

  // Location filters
  if (filters.provinceId) {
    conditions.push(eq(vehicles.provinceId, parseInt(filters.provinceId)));
  }
  if (filters.cityId) {
    conditions.push(eq(vehicles.cityId, parseInt(filters.cityId)));
  }

  // Brand and model filters
  if (filters.brandId) {
    conditions.push(eq(vehicles.brandId, parseInt(filters.brandId)));
  }
  if (filters.modelId) {
    conditions.push(eq(vehicles.modelId, parseInt(filters.modelId)));
  }

  // Year filters
  if (filters.yearMin) {
    conditions.push(gte(vehicles.year, filters.yearMin));
  }
  if (filters.yearMax) {
    conditions.push(lte(vehicles.year, filters.yearMax));
  }

  // Mileage filter
  if (filters.mileageMax) {
    conditions.push(lte(vehicles.mileage, filters.mileageMax));
  }

  // Vehicle characteristics
  if (filters.fuelType) {
    conditions.push(ilike(vehicles.fuel, filters.fuelType));
  }
  if (filters.transmissionType) {
    conditions.push(ilike(vehicles.transmission, filters.transmissionType));
  }
  if (filters.condition) {
    conditions.push(ilike(vehicles.condition, filters.condition));
  }
  if (filters.color) {
    conditions.push(ilike(vehicles.color, filters.color));
  }

  // Special filters
  if (filters.onlyOpportunities) {
    conditions.push(eq(vehicles.isOpportunityAi, true));
  }
  if (filters.onlyFeatured) {
    conditions.push(eq(vehicles.featured, true));
  }
  if (filters.withPhotos) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${images} WHERE ${images.vehicleId} = ${vehicles.id})`
    );
  }

  // Dealership filters
  if (filters.dealershipId) {
    conditions.push(eq(vehicles.dealershipId, filters.dealershipId));
  }
  if (filters.dealershipType) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${dealerships} WHERE ${dealerships.id} = ${vehicles.dealershipId} AND ${dealerships.dealershipType} = ${filters.dealershipType})`
    );
  }
  if (filters.officialBrand) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${dealerships} WHERE ${dealerships.id} = ${vehicles.dealershipId} AND ${dealerships.officialBrand} ILIKE ${`%${filters.officialBrand}%`})`
    );
  }

  // Search query
  if (filters.searchQuery) {
    const searchTerm = `%${filters.searchQuery}%`;
    conditions.push(
      or(
        ilike(vehicles.title, searchTerm),
        ilike(vehicles.description, searchTerm),
        sql`EXISTS (SELECT 1 FROM ${brands} WHERE ${brands.id} = ${vehicles.brandId} AND ${brands.name} ILIKE ${searchTerm})`,
        sql`EXISTS (SELECT 1 FROM ${models} WHERE ${models.id} = ${vehicles.modelId} AND ${models.name} ILIKE ${searchTerm})`
      )
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Build ORDER BY clause based on sort option
 */
function buildSortOrder(sortBy: VehicleFilters['sortBy']) {
  switch (sortBy) {
    case 'price_asc':
      return [asc(vehicles.price)];
    case 'price_desc':
      return [desc(vehicles.price)];
    case 'year_desc':
      return [desc(vehicles.year)];
    case 'year_asc':
      return [asc(vehicles.year)];
    case 'mileage_asc':
      return [asc(vehicles.mileage)];
    case 'mileage_desc':
      return [desc(vehicles.mileage)];
    case 'date_desc':
      return [desc(vehicles.createdAt)];
    case 'date_asc':
      return [asc(vehicles.createdAt)];
    case 'opportunity_score_desc':
      return [desc(vehicles.opportunityScore), desc(vehicles.createdAt)];
    case 'relevance':
    default:
      // Relevance: featured first, then opportunities, then by date
      return [
        desc(vehicles.featured),
        desc(vehicles.isOpportunityAi),
        desc(vehicles.opportunityScore),
        desc(vehicles.createdAt)
      ];
  }
}

/**
 * Search vehicles with advanced filtering
 */
export async function searchVehicles(filters: Partial<VehicleFilters> = {}): Promise<{
  vehicles: VehicleSearchResult[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const whereConditions = buildFilterConditions(filters);
    const orderBy = buildSortOrder(filters.sortBy || 'relevance');
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    // Main query for vehicles
    const vehiclesQuery = db
      .select({
        id: vehicles.id,
        title: vehicles.title,
        price: vehicles.price,
        currency: vehicles.currency,
        year: vehicles.year,
        mileage: vehicles.mileage,
        brand: brands.name,
        model: models.name,
        location: sql<string>`COALESCE(${cities.name} || ', ' || ${provinces.name}, ${vehicles.locationCity} || ', ' || ${vehicles.locationState}, 'Ubicación no especificada')`,
        dealership: dealerships.name,
        dealershipSlug: dealerships.slug,
        primaryImage: sql<string>`(
          SELECT COALESCE(${vehicleImages.gcsUrl}, ${images.imageUrl}) 
          FROM ${images} 
          LEFT JOIN ${vehicleImages} ON ${images.vehicleId} = ${vehicleImages.vehicleId} AND ${vehicleImages.isPrimary} = true
          WHERE ${images.vehicleId} = ${vehicles.id} 
          AND ${images.isPrimary} = true 
          LIMIT 1
        )`,
        isOpportunity: vehicles.isOpportunityAi,
        opportunityScore: vehicles.opportunityScore,
        condition: vehicles.condition,
        fuel: vehicles.fuel,
        transmission: vehicles.transmission,
        createdAt: vehicles.createdAt
      })
      .from(vehicles)
      .leftJoin(brands, eq(vehicles.brandId, brands.id))
      .leftJoin(models, eq(vehicles.modelId, models.id))
      .leftJoin(dealerships, eq(vehicles.dealershipId, dealerships.id))
      .leftJoin(cities, eq(vehicles.cityId, cities.id))
      .leftJoin(provinces, eq(vehicles.provinceId, provinces.id))
      .where(whereConditions)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    // Count query for total results
    const countQuery = db
      .select({ count: count() })
      .from(vehicles)
      .leftJoin(brands, eq(vehicles.brandId, brands.id))
      .leftJoin(models, eq(vehicles.modelId, models.id))
      .leftJoin(dealerships, eq(vehicles.dealershipId, dealerships.id))
      .leftJoin(cities, eq(vehicles.cityId, cities.id))
      .leftJoin(provinces, eq(vehicles.provinceId, provinces.id))
      .where(whereConditions);

    // Execute both queries
    const [vehicleResults, countResults] = await Promise.all([
      vehiclesQuery,
      countQuery
    ]);

    const total = countResults[0]?.count || 0;
    const hasMore = offset + vehicleResults.length < total;

    return {
      vehicles: vehicleResults,
      total,
      hasMore
    };

  } catch (error) {
    console.error('Error searching vehicles:', error);
    throw new Error('Error al buscar vehículos');
  }
}

/**
 * Get vehicle details by ID
 */
export async function getVehicleDetails(id: string): Promise<VehicleDetails | null> {
  try {
    const [vehicleResult] = await db
      .select({
        // Vehicle info
        id: vehicles.id,
        title: vehicles.title,
        description: vehicles.description,
        price: vehicles.price,
        currency: vehicles.currency,
        year: vehicles.year,
        mileage: vehicles.mileage,
        engineSize: vehicles.engineSize,
        horsepower: vehicles.horsepower,
        color: vehicles.color,
        condition: vehicles.condition,
        fuel: vehicles.fuel,
        transmission: vehicles.transmission,
        vin: vehicles.vin,
        sourceUrl: vehicles.sourceUrl,
        isOpportunity: vehicles.isOpportunityAi,
        opportunityScore: vehicles.opportunityScore,
        createdAt: vehicles.createdAt,
        
        // Brand and model
        brand: brands.name,
        model: models.name,
        
        // Location
        location: sql<string>`COALESCE(${cities.name} || ', ' || ${provinces.name}, ${vehicles.locationCity} || ', ' || ${vehicles.locationState}, 'Ubicación no especificada')`,
        
        // Dealership info
        dealership: dealerships.name,
        dealershipSlug: dealerships.slug,
        dealershipInfo: sql<{
          id: string;
          name: string;
          phone?: string;
          whatsapp?: string;
          email?: string;
          address?: string;
          officialBrand?: string;
          dealershipType?: string;
          rating?: number;
        }>`
          CASE 
            WHEN ${dealerships.id} IS NOT NULL THEN
              json_build_object(
                'id', ${dealerships.id},
                'name', ${dealerships.name},
                'phone', ${dealerships.phone},
                'whatsapp', ${dealerships.whatsapp},
                'email', ${dealerships.email},
                'address', ${dealerships.address},
                'officialBrand', ${dealerships.officialBrand},
                'dealershipType', ${dealerships.dealershipType},
                'rating', ${dealerships.rating}
              )
            ELSE NULL
          END
        `
      })
      .from(vehicles)
      .leftJoin(brands, eq(vehicles.brandId, brands.id))
      .leftJoin(models, eq(vehicles.modelId, models.id))
      .leftJoin(dealerships, eq(vehicles.dealershipId, dealerships.id))
      .leftJoin(cities, eq(vehicles.cityId, cities.id))
      .leftJoin(provinces, eq(vehicles.provinceId, provinces.id))
      .where(eq(vehicles.id, id))
      .limit(1);

    if (!vehicleResult) {
      return null;
    }

    // Get vehicle images
    const vehicleImages = await db
      .select({
        id: images.id,
        url: sql<string>`COALESCE(${vehicleImages.gcsUrl}, ${images.imageUrl})`,
        order: images.imageOrder,
        type: images.imageType,
        isPrimary: images.isPrimary
      })
      .from(images)
      .leftJoin(vehicleImages, and(
        eq(images.vehicleId, vehicleImages.vehicleId),
        eq(images.isPrimary, vehicleImages.isPrimary)
      ))
      .where(eq(images.vehicleId, id))
      .orderBy(desc(images.isPrimary), asc(images.imageOrder));

    // Construct the detailed result
    const result: VehicleDetails = {
      ...vehicleResult,
      primaryImage: vehicleImages.find(img => img.isPrimary)?.url || vehicleImages[0]?.url || null,
      images: vehicleImages,
      specs: {
        year: vehicleResult.year,
        mileage: vehicleResult.mileage,
        engineSize: vehicleResult.engineSize,
        horsepower: vehicleResult.horsepower,
        fuel: vehicleResult.fuel,
        transmission: vehicleResult.transmission,
        condition: vehicleResult.condition,
        color: vehicleResult.color
      }
    };

    return result;

  } catch (error) {
    console.error('Error getting vehicle details:', error);
    throw new Error('Error al obtener detalles del vehículo');
  }
}

/**
 * Get featured/opportunity vehicles
 */
export async function getFeaturedVehicles(limit = 6): Promise<VehicleSearchResult[]> {
  try {
    return await db
      .select({
        id: vehicles.id,
        title: vehicles.title,
        price: vehicles.price,
        currency: vehicles.currency,
        year: vehicles.year,
        mileage: vehicles.mileage,
        brand: brands.name,
        model: models.name,
        location: sql<string>`COALESCE(${cities.name} || ', ' || ${provinces.name}, ${vehicles.locationCity} || ', ' || ${vehicles.locationState}, 'Ubicación no especificada')`,
        dealership: dealerships.name,
        dealershipSlug: dealerships.slug,
        primaryImage: sql<string>`(
          SELECT COALESCE(${vehicleImages.gcsUrl}, ${images.imageUrl}) 
          FROM ${images} 
          LEFT JOIN ${vehicleImages} ON ${images.vehicleId} = ${vehicleImages.vehicleId} AND ${vehicleImages.isPrimary} = true
          WHERE ${images.vehicleId} = ${vehicles.id} 
          AND ${images.isPrimary} = true 
          LIMIT 1
        )`,
        isOpportunity: vehicles.isOpportunityAi,
        opportunityScore: vehicles.opportunityScore,
        condition: vehicles.condition,
        fuel: vehicles.fuel,
        transmission: vehicles.transmission,
        createdAt: vehicles.createdAt
      })
      .from(vehicles)
      .leftJoin(brands, eq(vehicles.brandId, brands.id))
      .leftJoin(models, eq(vehicles.modelId, models.id))
      .leftJoin(dealerships, eq(vehicles.dealershipId, dealerships.id))
      .leftJoin(cities, eq(vehicles.cityId, cities.id))
      .leftJoin(provinces, eq(vehicles.provinceId, provinces.id))
      .where(
        and(
          eq(vehicles.status, 'available'),
          or(
            eq(vehicles.featured, true),
            and(
              eq(vehicles.isOpportunityAi, true),
              gte(vehicles.opportunityScore, 70)
            )
          )
        )
      )
      .orderBy(
        desc(vehicles.featured),
        desc(vehicles.opportunityScore),
        desc(vehicles.createdAt)
      )
      .limit(limit);

  } catch (error) {
    console.error('Error getting featured vehicles:', error);
    return [];
  }
}

/**
 * Get filter options (brands, locations, price ranges, etc.)
 */
export async function getFilterOptions(): Promise<FilterOptions> {
  try {
    const [brandOptions, locationOptions, priceStats, yearStats, fuelTypes, transmissionTypes] = await Promise.all([
      // Brands with vehicle count
      db
        .select({
          id: sql<string>`${brands.id}::text`,
          name: brands.name,
          count: sql<number>`COUNT(${vehicles.id})::int`
        })
        .from(brands)
        .leftJoin(vehicles, and(
          eq(brands.id, vehicles.brandId),
          eq(vehicles.status, 'available')
        ))
        .groupBy(brands.id, brands.name)
        .having(sql`COUNT(${vehicles.id}) > 0`)
        .orderBy(brands.name),

      // Provinces with cities
      db
        .select({
          id: sql<string>`${provinces.id}::text`,
          name: provinces.name,
          region: provinces.region,
          cities: sql<Array<{ id: string; name: string }>>`
            COALESCE(
              json_agg(
                json_build_object(
                  'id', ${cities.id}::text,
                  'name', ${cities.name}
                )
                ORDER BY ${cities.name}
              ) FILTER (WHERE ${cities.id} IS NOT NULL),
              '[]'
            )
          `
        })
        .from(provinces)
        .leftJoin(cities, eq(provinces.id, cities.provinceId))
        .groupBy(provinces.id, provinces.name, provinces.region)
        .orderBy(provinces.name),

      // Price statistics
      db
        .select({
          min: sql<number>`COALESCE(MIN(${vehicles.price}::numeric), 0)`,
          max: sql<number>`COALESCE(MAX(${vehicles.price}::numeric), 0)`,
          avg: sql<number>`COALESCE(AVG(${vehicles.price}::numeric), 0)`
        })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.status, 'available'),
            isNotNull(vehicles.price),
            sql`${vehicles.price}::numeric > 0`
          )
        ),

      // Year range
      db
        .select({
          min: sql<number>`COALESCE(MIN(${vehicles.year}), 1950)`,
          max: sql<number>`COALESCE(MAX(${vehicles.year}), ${new Date().getFullYear()})`
        })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.status, 'available'),
            isNotNull(vehicles.year)
          )
        ),

      // Fuel types
      db
        .select({
          value: vehicles.fuel,
          count: sql<number>`COUNT(*)::int`
        })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.status, 'available'),
            isNotNull(vehicles.fuel)
          )
        )
        .groupBy(vehicles.fuel)
        .orderBy(desc(sql`COUNT(*)`)),

      // Transmission types
      db
        .select({
          value: vehicles.transmission,
          count: sql<number>`COUNT(*)::int`
        })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.status, 'available'),
            isNotNull(vehicles.transmission)
          )
        )
        .groupBy(vehicles.transmission)
        .orderBy(desc(sql`COUNT(*)`))
    ]);

    return {
      brands: brandOptions,
      provinces: locationOptions,
      priceRange: priceStats[0] || { min: 0, max: 0, avg: 0 },
      yearRange: yearStats[0] || { min: 1950, max: new Date().getFullYear() },
      fuelTypes: fuelTypes.filter(ft => ft.value),
      transmissionTypes: transmissionTypes.filter(tt => tt.value)
    };

  } catch (error) {
    console.error('Error getting filter options:', error);
    return {
      brands: [],
      provinces: [],
      priceRange: { min: 0, max: 0, avg: 0 },
      yearRange: { min: 1950, max: new Date().getFullYear() },
      fuelTypes: [],
      transmissionTypes: []
    };
  }
}

/**
 * Get related vehicles (same brand/model or similar price range)
 */
export async function getRelatedVehicles(vehicleId: string, limit = 4): Promise<VehicleSearchResult[]> {
  try {
    // First get the current vehicle info
    const [currentVehicle] = await db
      .select({
        brandId: vehicles.brandId,
        modelId: vehicles.modelId,
        price: vehicles.price
      })
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);

    if (!currentVehicle) {
      return [];
    }

    const currentPrice = currentVehicle.price ? parseFloat(currentVehicle.price) : 0;
    const priceMin = currentPrice * 0.8; // 20% below
    const priceMax = currentPrice * 1.2; // 20% above

    return await db
      .select({
        id: vehicles.id,
        title: vehicles.title,
        price: vehicles.price,
        currency: vehicles.currency,
        year: vehicles.year,
        mileage: vehicles.mileage,
        brand: brands.name,
        model: models.name,
        location: sql<string>`COALESCE(${cities.name} || ', ' || ${provinces.name}, ${vehicles.locationCity} || ', ' || ${vehicles.locationState}, 'Ubicación no especificada')`,
        dealership: dealerships.name,
        dealershipSlug: dealerships.slug,
        primaryImage: sql<string>`(
          SELECT COALESCE(${vehicleImages.gcsUrl}, ${images.imageUrl}) 
          FROM ${images} 
          LEFT JOIN ${vehicleImages} ON ${images.vehicleId} = ${vehicleImages.vehicleId} AND ${vehicleImages.isPrimary} = true
          WHERE ${images.vehicleId} = ${vehicles.id} 
          AND ${images.isPrimary} = true 
          LIMIT 1
        )`,
        isOpportunity: vehicles.isOpportunityAi,
        opportunityScore: vehicles.opportunityScore,
        condition: vehicles.condition,
        fuel: vehicles.fuel,
        transmission: vehicles.transmission,
        createdAt: vehicles.createdAt
      })
      .from(vehicles)
      .leftJoin(brands, eq(vehicles.brandId, brands.id))
      .leftJoin(models, eq(vehicles.modelId, models.id))
      .leftJoin(dealerships, eq(vehicles.dealershipId, dealerships.id))
      .leftJoin(cities, eq(vehicles.cityId, cities.id))
      .leftJoin(provinces, eq(vehicles.provinceId, provinces.id))
      .where(
        and(
          sql`${vehicles.id} != ${vehicleId}`,
          eq(vehicles.status, 'available'),
          or(
            // Same brand/model
            and(
              eq(vehicles.brandId, currentVehicle.brandId),
              eq(vehicles.modelId, currentVehicle.modelId)
            ),
            // Similar price range
            currentPrice > 0 ? and(
              sql`${vehicles.price}::numeric >= ${priceMin}`,
              sql`${vehicles.price}::numeric <= ${priceMax}`
            ) : sql`true`
          )
        )
      )
      .orderBy(
        // Prioritize same brand/model
        sql`CASE WHEN ${vehicles.brandId} = ${currentVehicle.brandId} AND ${vehicles.modelId} = ${currentVehicle.modelId} THEN 0 ELSE 1 END`,
        desc(vehicles.opportunityScore),
        desc(vehicles.createdAt)
      )
      .limit(limit);

  } catch (error) {
    console.error('Error getting related vehicles:', error);
    return [];
  }
}

/**
 * Get vehicles by dealership
 */
export async function getVehiclesByDealership(dealershipId: string, limit = 20): Promise<VehicleSearchResult[]> {
  try {
    return await db
      .select({
        id: vehicles.id,
        title: vehicles.title,
        price: vehicles.price,
        currency: vehicles.currency,
        year: vehicles.year,
        mileage: vehicles.mileage,
        brand: brands.name,
        model: models.name,
        location: sql<string>`COALESCE(${cities.name} || ', ' || ${provinces.name}, ${vehicles.locationCity} || ', ' || ${vehicles.locationState}, 'Ubicación no especificada')`,
        dealership: dealerships.name,
        dealershipSlug: dealerships.slug,
        primaryImage: sql<string>`(
          SELECT COALESCE(${vehicleImages.gcsUrl}, ${images.imageUrl}) 
          FROM ${images} 
          LEFT JOIN ${vehicleImages} ON ${images.vehicleId} = ${vehicleImages.vehicleId} AND ${vehicleImages.isPrimary} = true
          WHERE ${images.vehicleId} = ${vehicles.id} 
          AND ${images.isPrimary} = true 
          LIMIT 1
        )`,
        isOpportunity: vehicles.isOpportunityAi,
        opportunityScore: vehicles.opportunityScore,
        condition: vehicles.condition,
        fuel: vehicles.fuel,
        transmission: vehicles.transmission,
        createdAt: vehicles.createdAt
      })
      .from(vehicles)
      .leftJoin(brands, eq(vehicles.brandId, brands.id))
      .leftJoin(models, eq(vehicles.modelId, models.id))
      .leftJoin(dealerships, eq(vehicles.dealershipId, dealerships.id))
      .leftJoin(cities, eq(vehicles.cityId, cities.id))
      .leftJoin(provinces, eq(vehicles.provinceId, provinces.id))
      .where(
        and(
          eq(vehicles.dealershipId, dealershipId),
          eq(vehicles.status, 'available')
        )
      )
      .orderBy(desc(vehicles.createdAt))
      .limit(limit);

  } catch (error) {
    console.error('Error getting vehicles by dealership:', error);
    return [];
  }
}

/**
 * Get marketplace statistics
 */
export async function getMarketplaceStats() {
  try {
    const [stats] = await db
      .select({
        totalVehicles: sql<number>`COUNT(*)::int`,
        totalDealerships: sql<number>`COUNT(DISTINCT ${vehicles.dealershipId})::int`,
        averagePrice: sql<number>`AVG(${vehicles.price}::numeric)`,
        opportunities: sql<number>`COUNT(*) FILTER (WHERE ${vehicles.isOpportunityAi} = true)::int`,
        featuredVehicles: sql<number>`COUNT(*) FILTER (WHERE ${vehicles.featured} = true)::int`
      })
      .from(vehicles)
      .where(eq(vehicles.status, 'available'));

    return stats || {
      totalVehicles: 0,
      totalDealerships: 0,
      averagePrice: 0,
      opportunities: 0,
      featuredVehicles: 0
    };

  } catch (error) {
    console.error('Error getting marketplace stats:', error);
    return {
      totalVehicles: 0,
      totalDealerships: 0,
      averagePrice: 0,
      opportunities: 0,
      featuredVehicles: 0
    };
  }
}

const carQueries = {
  searchVehicles,
  getVehicleDetails,
  getFeaturedVehicles,
  getFilterOptions,
  getRelatedVehicles,
  getVehiclesByDealership,
  getMarketplaceStats
};

export default carQueries;