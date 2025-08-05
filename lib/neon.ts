/**
 * Neon Database Connection (2025 Best Practices)
 * Following official Neon documentation patterns
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

// Initialize environment variables if needed
if (typeof window === 'undefined' && !process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  // Only load dotenv in server-side contexts and if no connection string exists
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (e) {
    // Dotenv not available or file doesn't exist - continue with system env vars
  }
}

// Get connection string following 2025 Neon practices
function getConnectionString(): string {
  // Priority: DATABASE_URL (Neon standard) -> POSTGRES_URL (Vercel standard)
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!connectionString) {
    throw new Error(
      'No database connection string found. ' +
      'Set DATABASE_URL or POSTGRES_URL environment variable. ' +
      'For local development, create .env.local with your Neon connection string.'
    );
  }
  
  return connectionString;
}

// Create Neon connection using serverless driver (2025 recommended)
const sql = neon(getConnectionString());

// Create Drizzle database instance with Neon HTTP driver
export const db = drizzle(sql, {
  logger: process.env.NODE_ENV === 'development'
});

// Health check function
export const checkDatabaseHealth = async () => {
  try {
    const startTime = Date.now();
    const result = await sql`
      SELECT 
        1 as health,
        current_database() as database,
        current_user as user,
        now() as server_time
    `;
    const responseTime = Date.now() - startTime;
    
    return { 
      status: 'healthy', 
      responseTime,
      database: result[0],
      timestamp: new Date().toISOString() 
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString() 
    };
  }
};

// Connection info for debugging
export const getDatabaseInfo = () => {
  const url = new URL(getConnectionString());
  return {
    host: url.hostname,
    database: url.pathname.slice(1),
    user: url.username,
    ssl: url.searchParams.get('sslmode') === 'require',
    pooled: url.hostname.includes('pooler'),
    environment: process.env.NODE_ENV,
    vercel: process.env.VERCEL_ENV
  };
};

// Vercel integration helpers (2025 features)
export const getBranchInfo = () => {
  return {
    branch: process.env.VERCEL_GIT_COMMIT_REF || 'main',
    commit: process.env.VERCEL_GIT_COMMIT_SHA,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    preview: process.env.VERCEL_ENV === 'preview',
    production: process.env.VERCEL_ENV === 'production'
  };
};

// Default export
export default db;