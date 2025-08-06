/**
 * Database queries for dealership scheduling, exploration and directory listing
 * Comprehensive dealership management and public directory queries
 */

import { db } from './neon';
import { dealerships, cities, provinces, vehicles } from './schema';
import { eq, and, or, isNotNull, lt, sql, desc, asc, count, avg, ilike } from 'drizzle-orm';

export interface DealershipForExploration {
  id: string;
  name: string;
  slug: string;
  baseUrl: string | null;
  usedVehiclesUrl: string | null;
  websiteUrl: string | null;
  explorationConfig: any;
  explorationFrequency: string | null;
  scraperOrder: number | null;
  lastExploredAt: Date | null;
  officialBrand: string | null;
  dealershipType: string | null;
  provinceName: string | null;
  provinceRegion: string | null;
  cityName: string | null;
  priorityScore: number;
  hoursSinceLastExploration: number;
  shouldExploreNow: boolean;
}

/**
 * Public dealership interface for directory listings
 */
export interface PublicDealership {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  coordinates: any;
  officialBrand: string | null;
  dealershipType: string | null;
  businessHours: any;
  socialMedia: any;
  rating: number | null;
  reviewCount: number;
  isVerified: boolean;
  provinceName: string | null;
  provinceRegion: string | null;
  cityName: string | null;
  vehicleCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dealership filters for directory searches
 */
export interface DealershipFilters {
  searchQuery?: string;
  provinceId?: string;
  cityId?: string;
  dealershipType?: string;
  officialBrand?: string;
  isVerified?: boolean;
  hasVehicles?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'rating' | 'vehicleCount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Dealership search results
 */
export interface DealershipSearchResults {
  dealerships: PublicDealership[];
  total: number;
  hasMore: boolean;
}

/**
 * Get dealerships by scraper order for batch processing
 */
export async function getDealershipsByScraperOrder(order: number, limit = 5): Promise<DealershipForExploration[]> {
  try {

    const result = await db
      .select({
        id: dealerships.id,
        name: dealerships.name,
        slug: dealerships.slug,
        baseUrl: dealerships.baseUrl,
        usedVehiclesUrl: dealerships.usedVehiclesUrl,
        websiteUrl: dealerships.websiteUrl,
        explorationConfig: dealerships.explorationConfig,
        explorationFrequency: dealerships.explorationFrequency,
        scraperOrder: dealerships.scraperOrder,
        lastExploredAt: dealerships.lastExploredAt,
        officialBrand: dealerships.officialBrand,
        dealershipType: dealerships.dealershipType,
        provinceName: provinces.name,
        provinceRegion: provinces.region,
        cityName: cities.name,
        priorityScore: sql<number>`1.0`,
        hoursSinceLastExploration: sql<number>`
          CASE 
            WHEN ${dealerships.lastExploredAt} IS NULL THEN 999
            ELSE EXTRACT(EPOCH FROM (NOW() - ${dealerships.lastExploredAt})) / 3600
          END
        `,
        shouldExploreNow: sql<boolean>`true`
      })
      .from(dealerships)
      .leftJoin(cities, eq(dealerships.cityId, cities.id))
      .leftJoin(provinces, eq(dealerships.provinceId, provinces.id))
      .where(and(
        eq(dealerships.isActive, true),
        eq(dealerships.scraperOrder, order),
        or(
          isNotNull(dealerships.baseUrl),
          isNotNull(dealerships.usedVehiclesUrl),
          isNotNull(dealerships.websiteUrl)
        )
      ))
      .limit(limit);

    return result;
  } catch (error) {
    console.error('❌ Error fetching dealerships by scraper order:', error);
    return [];
  }
}

/**
 * Get dealerships for current hour (1-24)
 */
export async function getCurrentHourDealerships(limit = 5): Promise<DealershipForExploration[]> {
  const currentHour = new Date().getHours() + 1; // 1-24
  return getDealershipsByScraperOrder(currentHour, limit);
}

/**
 * Get best exploration URL for a dealership
 */
export function getBestExplorationUrl(dealership: DealershipForExploration): string | null {
  // Priority: usedVehiclesUrl > baseUrl > websiteUrl
  return dealership.usedVehiclesUrl || 
         dealership.baseUrl || 
         dealership.websiteUrl;
}

/**
 * Update dealership last explored timestamp
 */
export async function updateDealershipLastExplored(dealershipId: string): Promise<void> {
  try {
    await db
      .update(dealerships)
      .set({ 
        lastExploredAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(dealerships.id, dealershipId));
  } catch (error) {
    console.error('❌ Error updating dealership last explored:', error);
  }
}

/**
 * Get dealership statistics
 */
export async function getDealershipStats() {
  try {
    const [stats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        active: sql<number>`COUNT(*) FILTER (WHERE ${dealerships.isActive} = true)`,
        withUrls: sql<number>`COUNT(*) FILTER (WHERE (${dealerships.baseUrl} IS NOT NULL OR ${dealerships.usedVehiclesUrl} IS NOT NULL OR ${dealerships.websiteUrl} IS NOT NULL))`,
        explorationEnabled: sql<number>`COUNT(*) FILTER (WHERE ${dealerships.explorationEnabled} = true)`,
        averageHoursSinceExploration: sql<number>`
          AVG(
            CASE 
              WHEN ${dealerships.lastExploredAt} IS NULL THEN NULL
              ELSE EXTRACT(EPOCH FROM (NOW() - ${dealerships.lastExploredAt})) / 3600
            END
          )
        `
      })
      .from(dealerships);

    return stats;
  } catch (error) {
    console.error('❌ Error getting dealership stats:', error);
    return {
      total: 0,
      active: 0,
      withUrls: 0,
      explorationEnabled: 0,
      averageHoursSinceExploration: 0
    };
  }
}

/**
 * Assign scraper orders to dealerships (distribute 1-24)
 */
export async function assignScraperOrders(): Promise<void> {
  try {
    
    // Get all active dealerships without scraper orders
    const dealershipsToUpdate = await db
      .select({ id: dealerships.id })
      .from(dealerships)
      .where(and(
        eq(dealerships.isActive, true),
        sql`${dealerships.scraperOrder} IS NULL`
      ));

    if (dealershipsToUpdate.length === 0) {
      return;
    }

    // Assign orders 1-24 in rotation
    for (let i = 0; i < dealershipsToUpdate.length; i++) {
      const order = (i % 24) + 1; // 1-24
      
      await db
        .update(dealerships)
        .set({ 
          scraperOrder: order,
          updatedAt: new Date()
        })
        .where(eq(dealerships.id, dealershipsToUpdate[i].id));
    }

  } catch (error) {
    console.error('❌ Error assigning scraper orders:', error);
    throw error;
  }
}

/**
 * Get dealerships for public directory with comprehensive filtering
 */
export async function getDealerships(filters: DealershipFilters = {}): Promise<DealershipSearchResults> {
  try {
    const {
      searchQuery,
      provinceId,
      cityId,
      dealershipType,
      officialBrand,
      isVerified,
      hasVehicles,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc'
    } = filters;

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(dealerships.isActive, true)];

    if (searchQuery) {
      conditions.push(ilike(dealerships.name, `%${searchQuery}%`));
    }

    if (provinceId) {
      conditions.push(eq(dealerships.provinceId, parseInt(provinceId)));
    }

    if (cityId) {
      conditions.push(eq(dealerships.cityId, parseInt(cityId)));
    }

    if (dealershipType) {
      conditions.push(eq(dealerships.dealershipType, dealershipType));
    }

    if (officialBrand) {
      conditions.push(eq(dealerships.officialBrand, officialBrand));
    }

    if (isVerified !== undefined) {
      conditions.push(eq(dealerships.isVerified, isVerified));
    }

    // Build sort condition
    let orderBy;
    const sortDirection = sortOrder === 'desc' ? desc : asc;
    
    switch (sortBy) {
      case 'rating':
        orderBy = sortDirection(dealerships.rating);
        break;
      case 'createdAt':
        orderBy = sortDirection(dealerships.createdAt);
        break;
      case 'vehicleCount':
        // Will be handled by subquery
        orderBy = sortDirection(sql<number>`vehicle_count`);
        break;
      case 'name':
      default:
        orderBy = sortDirection(dealerships.name);
        break;
    }

    // Main query with vehicle count subquery
    const baseQuery = db
      .select({
        id: dealerships.id,
        name: dealerships.name,
        slug: dealerships.slug,
        websiteUrl: dealerships.websiteUrl,
        phone: dealerships.phone,
        email: dealerships.email,
        whatsapp: dealerships.whatsapp,
        address: dealerships.address,
        coordinates: dealerships.coordinates,
        officialBrand: dealerships.officialBrand,
        dealershipType: dealerships.dealershipType,
        businessHours: dealerships.businessHours,
        socialMedia: dealerships.socialMedia,
        rating: sql<number>`CAST(${dealerships.rating} AS DECIMAL)`,
        reviewCount: sql<number>`COALESCE(${dealerships.reviewCount}, 0)`,
        isVerified: sql<boolean>`COALESCE(${dealerships.isVerified}, false)`,
        provinceName: provinces.name,
        provinceRegion: provinces.region,
        cityName: cities.name,
        vehicleCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${vehicles} 
          WHERE ${vehicles.dealershipId} = ${dealerships.id} 
            AND ${vehicles.status} = 'available'
        )`,
        createdAt: dealerships.createdAt,
        updatedAt: dealerships.updatedAt
      })
      .from(dealerships)
      .leftJoin(cities, eq(dealerships.cityId, cities.id))
      .leftJoin(provinces, eq(dealerships.provinceId, provinces.id))
      .where(and(...conditions));

    // Add having condition for hasVehicles filter
    if (hasVehicles) {
      // Need to use a different approach for having clause
      const dealershipsWithVehicles = await db
        .select({ id: dealerships.id })
        .from(dealerships)
        .innerJoin(vehicles, eq(vehicles.dealershipId, dealerships.id))
        .where(and(
          eq(dealerships.isActive, true),
          eq(vehicles.status, 'available')
        ))
        .groupBy(dealerships.id);

      const dealershipIds = dealershipsWithVehicles.map(d => d.id);
      if (dealershipIds.length === 0) {
        return { dealerships: [], total: 0, hasMore: false };
      }
      conditions.push(sql`${dealerships.id} IN (${sql.raw(dealershipIds.map(id => `'${id}'`).join(','))})`);  
    }

    // Execute paginated query
    const result = await baseQuery
      .orderBy(orderBy)
      .limit(limit + 1) // Get one extra to check if there are more
      .offset(offset);

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(dealerships)
      .leftJoin(cities, eq(dealerships.cityId, cities.id))
      .leftJoin(provinces, eq(dealerships.provinceId, provinces.id))
      .where(and(...conditions));

    const total = totalResult?.count || 0;
    const hasMore = result.length > limit;
    const dealerships_list = result.slice(0, limit); // Remove the extra item

    return {
      dealerships: dealerships_list,
      total,
      hasMore
    };

  } catch (error) {
    console.error('❌ Error fetching dealerships:', error);
    return {
      dealerships: [],
      total: 0,
      hasMore: false
    };
  }
}

/**
 * Get single dealership by ID or slug for public view
 */
export async function getDealershipByIdOrSlug(identifier: string): Promise<PublicDealership | null> {
  try {
    // Check if identifier is UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    
    const condition = isUuid 
      ? eq(dealerships.id, identifier)
      : eq(dealerships.slug, identifier);

    const [result] = await db
      .select({
        id: dealerships.id,
        name: dealerships.name,
        slug: dealerships.slug,
        websiteUrl: dealerships.websiteUrl,
        phone: dealerships.phone,
        email: dealerships.email,
        whatsapp: dealerships.whatsapp,
        address: dealerships.address,
        coordinates: dealerships.coordinates,
        officialBrand: dealerships.officialBrand,
        dealershipType: dealerships.dealershipType,
        businessHours: dealerships.businessHours,
        socialMedia: dealerships.socialMedia,
        rating: sql<number>`CAST(${dealerships.rating} AS DECIMAL)`,
        reviewCount: sql<number>`COALESCE(${dealerships.reviewCount}, 0)`,
        isVerified: sql<boolean>`COALESCE(${dealerships.isVerified}, false)`,
        provinceName: provinces.name,
        provinceRegion: provinces.region,
        cityName: cities.name,
        vehicleCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${vehicles} 
          WHERE ${vehicles.dealershipId} = ${dealerships.id} 
            AND ${vehicles.status} = 'available'
        )`,
        createdAt: dealerships.createdAt,
        updatedAt: dealerships.updatedAt
      })
      .from(dealerships)
      .leftJoin(cities, eq(dealerships.cityId, cities.id))
      .leftJoin(provinces, eq(dealerships.provinceId, provinces.id))
      .where(and(
        condition,
        eq(dealerships.isActive, true)
      ))
      .limit(1);

    return result || null;

  } catch (error) {
    console.error('❌ Error fetching dealership by ID/slug:', error);
    return null;
  }
}

/**
 * Get dealership vehicles/inventory
 */
export async function getDealershipVehicles(
  dealershipId: string, 
  options: {
    page?: number;
    limit?: number;
    sortBy?: 'price' | 'year' | 'mileage' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  } = {}
) {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const offset = (page - 1) * limit;
    const sortDirection = sortOrder === 'desc' ? desc : asc;
    
    let orderBy;
    switch (sortBy) {
      case 'price':
        orderBy = sortDirection(vehicles.price);
        break;
      case 'year':
        orderBy = sortDirection(vehicles.year);
        break;
      case 'mileage':
        orderBy = sortDirection(vehicles.mileage);
        break;
      case 'createdAt':
      default:
        orderBy = sortDirection(vehicles.createdAt);
        break;
    }

    // Get vehicles
    const result = await db
      .select()
      .from(vehicles)
      .where(and(
        eq(vehicles.dealershipId, dealershipId),
        eq(vehicles.status, 'available')
      ))
      .orderBy(orderBy)
      .limit(limit + 1) // Get one extra to check if there are more
      .offset(offset);

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(vehicles)
      .where(and(
        eq(vehicles.dealershipId, dealershipId),
        eq(vehicles.status, 'available')
      ));

    const total = totalResult?.count || 0;
    const hasMore = result.length > limit;
    const vehiclesList = result.slice(0, limit); // Remove the extra item

    return {
      vehicles: vehiclesList,
      total,
      hasMore
    };

  } catch (error) {
    console.error('❌ Error fetching dealership vehicles:', error);
    return {
      vehicles: [],
      total: 0,
      hasMore: false
    };
  }
}

/**
 * Get dealership summary statistics for directory
 */
export async function getDealershipDirectoryStats() {
  try {
    const [stats] = await db
      .select({
        totalDealerships: count(dealerships.id),
        verifiedDealerships: sql<number>`COUNT(*) FILTER (WHERE ${dealerships.isVerified} = true)`,
        officialDealerships: sql<number>`COUNT(*) FILTER (WHERE ${dealerships.dealershipType} = 'official')`,
        multimarcaDealerships: sql<number>`COUNT(*) FILTER (WHERE ${dealerships.dealershipType} = 'multimarca')`,
        totalVehiclesInDealerships: sql<number>`(
          SELECT COUNT(*) 
          FROM ${vehicles} v
          INNER JOIN ${dealerships} d ON v.dealership_id = d.id
          WHERE d.is_active = true AND v.status = 'available'
        )`,
        avgRating: avg(dealerships.rating),
        topProvinces: sql<any>`(
          SELECT json_agg(json_build_object(
            'name', p.name,
            'count', province_counts.dealership_count
          ))
          FROM (
            SELECT province_id, COUNT(*) as dealership_count
            FROM ${dealerships}
            WHERE is_active = true
            GROUP BY province_id
            ORDER BY dealership_count DESC
            LIMIT 5
          ) province_counts
          JOIN ${provinces} p ON province_counts.province_id = p.id
        )`
      })
      .from(dealerships)
      .where(eq(dealerships.isActive, true));

    return stats;
  } catch (error) {
    console.error('❌ Error getting dealership directory stats:', error);
    return {
      totalDealerships: 0,
      verifiedDealerships: 0,
      officialDealerships: 0,
      multimarcaDealerships: 0,
      totalVehiclesInDealerships: 0,
      avgRating: 0,
      topProvinces: []
    };
  }
}

/**
 * Get all provinces with dealership counts
 */
export async function getProvincesWithDealershipCounts() {
  try {
    const result = await db
      .select({
        id: provinces.id,
        name: provinces.name,
        code: provinces.code,
        region: provinces.region,
        dealershipCount: sql<number>`COUNT(${dealerships.id})`
      })
      .from(provinces)
      .leftJoin(dealerships, and(
        eq(dealerships.provinceId, provinces.id),
        eq(dealerships.isActive, true)
      ))
      .groupBy(provinces.id, provinces.name, provinces.code, provinces.region)
      .orderBy(provinces.name);

    return result;
  } catch (error) {
    console.error('❌ Error fetching provinces with dealership counts:', error);
    return [];
  }
}

/**
 * Get cities in a province with dealership counts
 */
export async function getCitiesWithDealershipCounts(provinceId: number) {
  try {
    const result = await db
      .select({
        id: cities.id,
        name: cities.name,
        dealershipCount: sql<number>`COUNT(${dealerships.id})`
      })
      .from(cities)
      .leftJoin(dealerships, and(
        eq(dealerships.cityId, cities.id),
        eq(dealerships.isActive, true)
      ))
      .where(eq(cities.provinceId, provinceId))
      .groupBy(cities.id, cities.name)
      .orderBy(cities.name);

    return result;
  } catch (error) {
    console.error('❌ Error fetching cities with dealership counts:', error);
    return [];
  }
}

/**
 * Get unique dealership brands for filtering
 */
export async function getDealershipBrands() {
  try {
    const result = await db
      .select({
        brand: dealerships.officialBrand,
        count: sql<number>`COUNT(*)`
      })
      .from(dealerships)
      .where(and(
        eq(dealerships.isActive, true),
        isNotNull(dealerships.officialBrand)
      ))
      .groupBy(dealerships.officialBrand)
      .orderBy(desc(sql<number>`COUNT(*)`));

    return result.filter(r => r.brand !== null);
  } catch (error) {
    console.error('❌ Error fetching dealership brands:', error);
    return [];
  }
}

/**
 * Get featured/recommended dealerships
 */
export async function getFeaturedDealerships(limit = 6): Promise<PublicDealership[]> {
  try {
    const result = await db
      .select({
        id: dealerships.id,
        name: dealerships.name,
        slug: dealerships.slug,
        websiteUrl: dealerships.websiteUrl,
        phone: dealerships.phone,
        email: dealerships.email,
        whatsapp: dealerships.whatsapp,
        address: dealerships.address,
        coordinates: dealerships.coordinates,
        officialBrand: dealerships.officialBrand,
        dealershipType: dealerships.dealershipType,
        businessHours: dealerships.businessHours,
        socialMedia: dealerships.socialMedia,
        rating: sql<number>`CAST(${dealerships.rating} AS DECIMAL)`,
        reviewCount: sql<number>`COALESCE(${dealerships.reviewCount}, 0)`,
        isVerified: sql<boolean>`COALESCE(${dealerships.isVerified}, false)`,
        provinceName: provinces.name,
        provinceRegion: provinces.region,
        cityName: cities.name,
        vehicleCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${vehicles} 
          WHERE ${vehicles.dealershipId} = ${dealerships.id} 
            AND ${vehicles.status} = 'available'
        )`,
        createdAt: dealerships.createdAt,
        updatedAt: dealerships.updatedAt
      })
      .from(dealerships)
      .leftJoin(cities, eq(dealerships.cityId, cities.id))
      .leftJoin(provinces, eq(dealerships.provinceId, provinces.id))
      .where(and(
        eq(dealerships.isActive, true),
        eq(dealerships.isVerified, true)
      ))
      .orderBy(
        desc(dealerships.rating),
        desc(sql<number>`(
          SELECT COUNT(*) 
          FROM ${vehicles} 
          WHERE ${vehicles.dealershipId} = ${dealerships.id} 
            AND ${vehicles.status} = 'available'
        )`)
      )
      .limit(limit);

    return result;
  } catch (error) {
    console.error('❌ Error fetching featured dealerships:', error);
    return [];
  }
}