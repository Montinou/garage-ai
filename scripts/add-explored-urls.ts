#!/usr/bin/env tsx
/**
 * Add missing explored_urls table to Neon database
 */

import { db } from '../lib/neon';
import { sql } from 'drizzle-orm';

async function addExploredUrlsTable() {
  console.log('🔧 Adding explored_urls table for URL tracking...\n');

  try {
    // 0. Enable UUID extension first
    console.log('0. Enabling UUID extension...');
    try {
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    } catch (error) {
      // Extension might already exist, that's ok
      console.log('   UUID extension already exists or cannot be created');
    }

    // 1. Create the table
    console.log('1. Creating explored_urls table...');
    await db.execute(sql`
      CREATE TABLE explored_urls (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          url TEXT NOT NULL UNIQUE,
          dealership_id UUID REFERENCES dealerships(id) ON DELETE CASCADE,
          url_type VARCHAR(50) NOT NULL,
          
          -- Discovery info
          discovered_by_agent VARCHAR(100),
          parent_url TEXT,
          discovery_method VARCHAR(50),
          
          -- Processing status  
          status VARCHAR(50) NOT NULL DEFAULT 'discovered',
          last_processed_at TIMESTAMPTZ,
          processing_attempts INTEGER DEFAULT 0,
          
          -- Content analysis
          content_type VARCHAR(100),
          has_vehicle_data BOOLEAN DEFAULT FALSE,
          vehicle_count INTEGER DEFAULT 0,
          
          -- Success tracking
          vehicles_extracted INTEGER DEFAULT 0,
          last_successful_extraction TIMESTAMPTZ,
          
          -- Error tracking
          last_error TEXT,
          consecutive_failures INTEGER DEFAULT 0,
          
          -- Lifecycle management
          is_active BOOLEAN DEFAULT TRUE,
          deprecated_at TIMESTAMPTZ,
          expires_at TIMESTAMPTZ,
          
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 2. Add indexes
    console.log('2. Adding indexes...');
    const indexes = [
      'CREATE INDEX idx_explored_urls_dealership ON explored_urls(dealership_id)',
      'CREATE INDEX idx_explored_urls_status ON explored_urls(status)',
      'CREATE INDEX idx_explored_urls_type ON explored_urls(url_type)',
      'CREATE INDEX idx_explored_urls_active ON explored_urls(is_active)',
      'CREATE INDEX idx_explored_urls_last_processed ON explored_urls(last_processed_at)',
      'CREATE INDEX idx_explored_urls_has_vehicle_data ON explored_urls(has_vehicle_data)',
      'CREATE INDEX idx_explored_urls_agent ON explored_urls(discovered_by_agent)',
      'CREATE INDEX idx_explored_urls_created ON explored_urls(created_at)'
    ];

    for (const indexSql of indexes) {
      await db.execute(sql.raw(indexSql));
    }

    // 3. Skip RLS for plain Neon database (no Supabase auth schema)
    console.log('3. Skipping RLS policies (not needed for plain Neon)...');

    // 4. Add update trigger (if the function exists)
    console.log('4. Adding update trigger...');
    try {
      await db.execute(sql`
        CREATE TRIGGER update_explored_urls_updated_at BEFORE UPDATE ON explored_urls
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
    } catch (error) {
      console.log('   Trigger not added (update function may not exist)');
    }

    // 5. Add utility functions
    console.log('5. Adding utility functions...');
    
    // Function to get dealership exploration stats
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION get_dealership_exploration_stats(dealership_uuid UUID)
      RETURNS TABLE (
          total_urls_discovered BIGINT,
          active_urls BIGINT,
          processed_urls BIGINT,
          vehicles_found BIGINT,
          last_exploration TIMESTAMPTZ,
          exploration_success_rate NUMERIC
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              COUNT(*) as total_urls_discovered,
              COUNT(CASE WHEN is_active = true THEN 1 END) as active_urls,
              COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed_urls,
              COALESCE(SUM(vehicles_extracted), 0) as vehicles_found,
              MAX(last_processed_at) as last_exploration,
              CASE 
                  WHEN COUNT(*) = 0 THEN 0
                  ELSE ROUND(COUNT(CASE WHEN status = 'processed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC, 4)
              END as exploration_success_rate
          FROM explored_urls
          WHERE dealership_id = dealership_uuid;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Function to cleanup deprecated URLs
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION cleanup_deprecated_urls()
      RETURNS INTEGER AS $$
      DECLARE
          cleaned_count INTEGER;
      BEGIN
          -- Mark URLs as deprecated if they have too many consecutive failures
          UPDATE explored_urls 
          SET is_active = FALSE, deprecated_at = NOW()
          WHERE consecutive_failures >= 5 
          AND is_active = TRUE
          AND deprecated_at IS NULL;

          -- Remove very old deprecated URLs
          DELETE FROM explored_urls 
          WHERE deprecated_at IS NOT NULL 
          AND deprecated_at < NOW() - INTERVAL '30 days';
          
          GET DIAGNOSTICS cleaned_count = ROW_COUNT;
          RETURN cleaned_count;
      END;
      $$ LANGUAGE plpgsql
    `);

    console.log('\n✅ Successfully added explored_urls table and all related components!');
    console.log('\n📊 URL tracking is now ready for AI scraping agents.');

  } catch (error) {
    console.error('❌ Error adding explored_urls table:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  addExploredUrlsTable()
    .then(() => {
      console.log('\n🎉 Database schema is now complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { addExploredUrlsTable };