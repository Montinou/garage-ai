/**
 * Database queries for dealership scheduling and exploration  
 * Simplified and focused on batch processing
 */

import { db } from './neon';
import { dealerships, cities, provinces } from './schema';
import { eq, and, or, isNotNull, lt, sql } from 'drizzle-orm';

export interface DealershipForExploration {
  id: string;
  name: string;
  slug: string;
  baseUrl: string | null;
  usedVehiclesUrl: string | null;
  websiteUrl: string | null;
  explorationConfig: any;
  explorationFrequency: string;
  scraperOrder: number | null;
  lastExploredAt: Date | null;
  officialBrand: string | null;
  dealershipType: string;
  provinceName: string;
  provinceRegion: string | null;
  cityName: string;
  priorityScore: number;
  hoursSinceLastExploration: number;
  shouldExploreNow: boolean;
}

/**
 * Get dealerships by scraper order for batch processing
 */
export async function getDealershipsByScraperOrder(order: number, limit = 5): Promise<DealershipForExploration[]> {
  try {
    console.log(`🔍 Fetching dealerships with scraper order ${order}...`);

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

    console.log(`✅ Found ${result.length} dealerships for order ${order}`);
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
    console.log('🔄 Assigning scraper orders to dealerships...');
    
    // Get all active dealerships without scraper orders
    const dealershipsToUpdate = await db
      .select({ id: dealerships.id })
      .from(dealerships)
      .where(and(
        eq(dealerships.isActive, true),
        sql`${dealerships.scraperOrder} IS NULL`
      ));

    if (dealershipsToUpdate.length === 0) {
      console.log('ℹ️ All dealerships already have scraper orders assigned');
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

    console.log(`✅ Assigned scraper orders to ${dealershipsToUpdate.length} dealerships`);
  } catch (error) {
    console.error('❌ Error assigning scraper orders:', error);
    throw error;
  }
}