/**
 * Database queries for dealership scheduling and exploration
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
  rating: string | null;
  provinceName: string;
  provinceRegion: string | null;
  cityName: string;
  priorityScore: number;
  hoursSinceLastExploration: number;
  shouldExploreNow: boolean;
}

/**
 * Get all active dealerships that should be explored now
 */
export async function getDealershipsForExploration(): Promise<DealershipForExploration[]> {
  try {
    console.log('🔍 Fetching active dealerships for exploration...');

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
        rating: dealerships.rating,
        provinceName: provinces.name,
        provinceRegion: provinces.region,
        cityName: cities.name,
        // Priority calculation
        priorityScore: sql<number>`
          CASE 
            WHEN ${dealerships.explorationFrequency} = 'hourly' THEN 4
            WHEN ${dealerships.explorationFrequency} = 'daily' THEN 3
            WHEN ${dealerships.explorationFrequency} = 'weekly' THEN 2
            ELSE 1
          END
        `,
        // Hours since last exploration
        hoursSinceLastExploration: sql<number>`
          CASE 
            WHEN ${dealerships.lastExploredAt} IS NULL THEN 9999
            ELSE EXTRACT(EPOCH FROM (NOW() - ${dealerships.lastExploredAt}))/3600
          END
        `,
        // Should explore now
        shouldExploreNow: sql<boolean>`
          CASE
            WHEN ${dealerships.lastExploredAt} IS NULL THEN true
            WHEN ${dealerships.explorationFrequency} = 'hourly' AND ${dealerships.lastExploredAt} < NOW() - INTERVAL '1 hour' THEN true
            WHEN ${dealerships.explorationFrequency} = 'daily' AND ${dealerships.lastExploredAt} < NOW() - INTERVAL '1 day' THEN true
            WHEN ${dealerships.explorationFrequency} = 'weekly' AND ${dealerships.lastExploredAt} < NOW() - INTERVAL '1 week' THEN true
            ELSE false
          END
        `
      })
      .from(dealerships)
      .leftJoin(cities, eq(dealerships.cityId, cities.id))
      .leftJoin(provinces, eq(dealerships.provinceId, provinces.id))
      .where(
        and(
          eq(dealerships.isActive, true),
          eq(dealerships.explorationEnabled, true),
          or(
            isNotNull(dealerships.baseUrl),
            isNotNull(dealerships.usedVehiclesUrl),
            isNotNull(dealerships.websiteUrl)
          )
        )
      )
      .orderBy(
        sql`CASE 
          WHEN ${dealerships.explorationFrequency} = 'hourly' THEN 4
          WHEN ${dealerships.explorationFrequency} = 'daily' THEN 3
          WHEN ${dealerships.explorationFrequency} = 'weekly' THEN 2
          ELSE 1
        END DESC`,
        dealerships.scraperOrder,
        sql`CASE 
          WHEN ${dealerships.lastExploredAt} IS NULL THEN 9999
          ELSE EXTRACT(EPOCH FROM (NOW() - ${dealerships.lastExploredAt}))/3600
        END DESC`
      );

    // Filter only those that should be explored now
    const readyForExploration = result.filter(d => d.shouldExploreNow);

    console.log(`📊 Found ${result.length} active dealerships, ${readyForExploration.length} ready for exploration`);

    return readyForExploration.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      baseUrl: row.baseUrl,
      usedVehiclesUrl: row.usedVehiclesUrl,
      websiteUrl: row.websiteUrl,
      explorationConfig: row.explorationConfig || {
        explorationDepth: 'shallow',
        maxUrlsToProcess: 15,
        opportunityThreshold: 'medium',
        qualityThreshold: 75
      },
      explorationFrequency: row.explorationFrequency || 'daily',
      scraperOrder: row.scraperOrder,
      lastExploredAt: row.lastExploredAt,
      officialBrand: row.officialBrand,
      dealershipType: row.dealershipType || 'multimarca',
      rating: row.rating,
      provinceName: row.provinceName || 'Unknown',
      provinceRegion: row.provinceRegion,
      cityName: row.cityName || 'Unknown',
      priorityScore: row.priorityScore,
      hoursSinceLastExploration: row.hoursSinceLastExploration,
      shouldExploreNow: row.shouldExploreNow
    }));

  } catch (error) {
    console.error('❌ Error fetching dealerships for exploration:', error);
    throw error;
  }
}

/**
 * Get dealerships by frequency for targeted scheduling
 */
export async function getDealershipsByFrequency(frequency: 'hourly' | 'daily' | 'weekly'): Promise<DealershipForExploration[]> {
  try {
    console.log(`🕐 Fetching ${frequency} dealerships...`);

    const allDealerships = await getDealershipsForExploration();
    const filtered = allDealerships.filter(d => d.explorationFrequency === frequency);

    console.log(`📊 Found ${filtered.length} dealerships with ${frequency} frequency`);
    return filtered;

  } catch (error) {
    console.error(`❌ Error fetching ${frequency} dealerships:`, error);
    throw error;
  }
}

/**
 * Get high-priority dealerships (never explored or long overdue)
 */
export async function getHighPriorityDealerships(): Promise<DealershipForExploration[]> {
  try {
    console.log('🚨 Fetching high-priority dealerships...');

    const allDealerships = await getDealershipsForExploration();
    const highPriority = allDealerships.filter(d => 
      d.lastExploredAt === null || d.hoursSinceLastExploration >= 48 // Never explored or >48h old
    );

    console.log(`📊 Found ${highPriority.length} high-priority dealerships`);
    return highPriority;

  } catch (error) {
    console.error('❌ Error fetching high-priority dealerships:', error);
    throw error;
  }
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

    console.log(`✅ Updated last explored timestamp for dealership ${dealershipId}`);

  } catch (error) {
    console.error(`❌ Error updating dealership timestamp:`, error);
    throw error;
  }
}

/**
 * Get dealership statistics for monitoring
 */
export async function getDealershipStats() {
  try {
    const stats = await db
      .select({
        totalActive: sql<number>`COUNT(*) FILTER (WHERE is_active = true)`,
        explorationEnabled: sql<number>`COUNT(*) FILTER (WHERE exploration_enabled = true AND is_active = true)`,
        neverExplored: sql<number>`COUNT(*) FILTER (WHERE last_explored_at IS NULL AND exploration_enabled = true AND is_active = true)`,
        hourlyFreq: sql<number>`COUNT(*) FILTER (WHERE exploration_frequency = 'hourly' AND exploration_enabled = true AND is_active = true)`,
        dailyFreq: sql<number>`COUNT(*) FILTER (WHERE exploration_frequency = 'daily' AND exploration_enabled = true AND is_active = true)`,
        weeklyFreq: sql<number>`COUNT(*) FILTER (WHERE exploration_frequency = 'weekly' AND exploration_enabled = true AND is_active = true)`,
        withUrls: sql<number>`COUNT(*) FILTER (WHERE (base_url IS NOT NULL OR used_vehicles_url IS NOT NULL OR website_url IS NOT NULL) AND exploration_enabled = true AND is_active = true)`
      })
      .from(dealerships);

    return stats[0];

  } catch (error) {
    console.error('❌ Error fetching dealership stats:', error);
    throw error;
  }
}

/**
 * Get dealerships by scraper order for batch processing
 */
export async function getDealershipsByScraperOrder(order: number, limit?: number): Promise<DealershipForExploration[]> {
  try {
    console.log(`🔢 Fetching dealerships with scraper order ${order}...`);

    const allDealerships = await getDealershipsForExploration();
    let filtered = allDealerships.filter(d => d.scraperOrder === order);
    
    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    console.log(`📊 Found ${filtered.length} dealerships with scraper order ${order}`);
    return filtered;

  } catch (error) {
    console.error(`❌ Error fetching dealerships by scraper order ${order}:`, error);
    throw error;
  }
}

/**
 * Get current hour's dealership batch (1-24)
 */
export async function getCurrentHourDealerships(limit?: number): Promise<DealershipForExploration[]> {
  const currentHour = new Date().getHours() + 1; // 1-24 instead of 0-23
  return getDealershipsByScraperOrder(currentHour, limit);
}

/**
 * Assign scraper orders to all dealerships evenly distributed across 24 hours
 */
export async function assignScraperOrders(): Promise<void> {
  try {
    console.log('🔄 Assigning scraper orders to dealerships...');

    // Get all active dealerships
    const allDealerships = await db
      .select({ id: dealerships.id })
      .from(dealerships)
      .where(
        and(
          eq(dealerships.isActive, true),
          eq(dealerships.explorationEnabled, true)
        )
      );

    console.log(`📊 Found ${allDealerships.length} active dealerships to assign orders`);

    // Distribute evenly across 24 hours
    for (let i = 0; i < allDealerships.length; i++) {
      const scraperOrder = (i % 24) + 1; // 1-24 hours
      
      await db
        .update(dealerships)
        .set({ 
          scraperOrder,
          updatedAt: new Date()
        })
        .where(eq(dealerships.id, allDealerships[i].id));
    }

    console.log('✅ Scraper orders assigned successfully');

  } catch (error) {
    console.error('❌ Error assigning scraper orders:', error);
    throw error;
  }
}

/**
 * Get best exploration URL for a dealership
 */
export function getBestExplorationUrl(dealership: DealershipForExploration): string | null {
  // Priority: used_vehicles_url > base_url > website_url
  return dealership.usedVehiclesUrl || dealership.baseUrl || dealership.websiteUrl;
}