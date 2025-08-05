/**
 * Manual refresh endpoint for dealership materialized view
 * Can be called to refresh the view when dealerships are updated
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/neon';
import { sql } from 'drizzle-orm';

export async function POST() {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Refreshing dealership materialized view...');

    // Create the materialized view if it doesn't exist
    await db.execute(sql`
      CREATE MATERIALIZED VIEW IF NOT EXISTS active_dealerships_for_exploration AS
      SELECT 
        d.id,
        d.name,
        d.slug,
        d.base_url,
        d.used_vehicles_url,
        d.website_url,
        d.exploration_config,
        d.exploration_frequency,
        d.last_explored_at,
        d.official_brand,
        d.dealership_type,
        d.rating,
        p.name as province_name,
        p.region as province_region,
        c.name as city_name,
        -- Calculate priority based on various factors
        CASE 
          WHEN d.exploration_frequency = 'hourly' THEN 4
          WHEN d.exploration_frequency = 'daily' THEN 3
          WHEN d.exploration_frequency = 'weekly' THEN 2
          ELSE 1
        END as priority_score,
        -- Calculate staleness (hours since last exploration)
        CASE 
          WHEN d.last_explored_at IS NULL THEN 9999
          ELSE EXTRACT(EPOCH FROM (NOW() - d.last_explored_at))/3600
        END as hours_since_last_exploration,
        -- Determine if dealership should be explored based on frequency
        CASE
          WHEN d.last_explored_at IS NULL THEN true
          WHEN d.exploration_frequency = 'hourly' AND d.last_explored_at < NOW() - INTERVAL '1 hour' THEN true
          WHEN d.exploration_frequency = 'daily' AND d.last_explored_at < NOW() - INTERVAL '1 day' THEN true
          WHEN d.exploration_frequency = 'weekly' AND d.last_explored_at < NOW() - INTERVAL '1 week' THEN true
          ELSE false
        END as should_explore_now
      FROM dealerships d
      LEFT JOIN cities c ON d.city_id = c.id
      LEFT JOIN provinces p ON d.province_id = p.id
      WHERE 
        d.is_active = true 
        AND d.exploration_enabled = true
        AND (d.base_url IS NOT NULL OR d.used_vehicles_url IS NOT NULL OR d.website_url IS NOT NULL)
    `);

    // Refresh the materialized view
    await db.execute(sql`REFRESH MATERIALIZED VIEW active_dealerships_for_exploration`);

    // Create indexes if they don't exist
    try {
      await db.execute(sql`CREATE INDEX IF NOT EXISTS mv_dealerships_should_explore_idx ON active_dealerships_for_exploration (should_explore_now)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS mv_dealerships_frequency_idx ON active_dealerships_for_exploration (exploration_frequency)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS mv_dealerships_priority_idx ON active_dealerships_for_exploration (priority_score DESC)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS mv_dealerships_staleness_idx ON active_dealerships_for_exploration (hours_since_last_exploration DESC)`);
    } catch (indexError) {
      console.log('Indexes already exist or creation failed:', indexError);
    }

    const processingTime = Date.now() - startTime;

    console.log(`✅ Materialized view refreshed successfully in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      message: 'Dealership materialized view refreshed successfully',
      processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Failed to refresh materialized view:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh view',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get current view stats
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(*) FILTER (WHERE should_explore_now = true) as ready_for_exploration,
        COUNT(*) FILTER (WHERE exploration_frequency = 'hourly') as hourly_frequency,
        COUNT(*) FILTER (WHERE exploration_frequency = 'daily') as daily_frequency,
        COUNT(*) FILTER (WHERE exploration_frequency = 'weekly') as weekly_frequency,
        AVG(hours_since_last_exploration) as avg_hours_since_exploration,
        MAX(hours_since_last_exploration) as max_hours_since_exploration
      FROM active_dealerships_for_exploration
    `);

    return NextResponse.json({
      success: true,
      materializedViewStats: stats.rows[0] || {},
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get view stats',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}