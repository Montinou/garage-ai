#!/usr/bin/env tsx
/**
 * Check for missing tables from updated schema
 */

import { db } from '../lib/neon';
import { sql } from 'drizzle-orm';

async function checkMissingTables() {
  console.log('🔍 Checking for missing tables from updated schema...\n');

  try {
    // Get all current tables
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const currentTables = result.rows.map(row => row.table_name);
    console.log('📋 Current tables:');
    currentTables.forEach(table => console.log(`  - ${table}`));
    console.log('');

    // Check for specific missing tables from our updated schema
    const expectedTables = [
      'explored_urls',  // URL tracking table we added
      'provinces',      // Should exist
      'cities',         // Should exist  
      'dealerships',    // Should exist
      'vehicle_images', // Enhanced images table
      'vehicles',       // Should exist
      'brands',         // Should exist
      'models',         // Should exist
      'agent_jobs',     // Should exist
      'agent_memory',   // Should exist
      'agent_metrics',  // Should exist
      'agent_messages', // Should exist
      'agent_orchestrations' // Should exist
    ];
    
    const missingTables = [];
    const existingTables = [];
    
    for (const table of expectedTables) {
      if (currentTables.includes(table)) {
        existingTables.push(table);
      } else {
        missingTables.push(table);
      }
    }
    
    console.log('✅ Existing tables from our schema:');
    existingTables.forEach(table => console.log(`  - ${table}`));
    console.log('');
    
    if (missingTables.length > 0) {
      console.log('❌ Missing tables from updated schema:');
      missingTables.forEach(table => console.log(`  - ${table}`));
      console.log('');
      console.log('🔧 You need to run the missing parts of schema.sql to add:');
      
      if (missingTables.includes('explored_urls')) {
        console.log('  - explored_urls table (URL tracking for scraping)');
      }
      
      return false;
    } else {
      console.log('✅ All expected tables exist!');
      return true;
    }

  } catch (error) {
    console.error('❌ Error checking tables:', error);
    return false;
  }
}

// Run the script
if (require.main === module) {
  checkMissingTables()
    .then((allTablesExist) => {
      if (allTablesExist) {
        console.log('\n🎉 Database schema is complete!');
      } else {
        console.log('\n⚠️  Database schema needs updates.');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { checkMissingTables };