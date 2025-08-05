#!/usr/bin/env tsx

/**
 * Database Migration Script
 * Applies Drizzle migrations to Neon database
 */

// Load environment variables first
import 'dotenv/config';

import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';
import path from 'path';

async function runMigrations() {
  console.log('🚀 Starting database migration...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  try {
    // Create database connection
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);

    // Run migrations
    const migrationsFolder = path.join(process.cwd(), 'drizzle/migrations');
    console.log(`📁 Using migrations folder: ${migrationsFolder}`);
    
    await migrate(db, { migrationsFolder });

    console.log('✅ Migrations completed successfully!');
    
    // Test the connection with a simple query
    const result = await db.execute('SELECT 1 as test');
    console.log('✅ Database connection verified');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };