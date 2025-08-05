/**
 * Neon Database Configuration (2025 Best Practices)
 * Following official Neon + Vercel integration guidelines
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { initializeEnvironment, getDatabaseUrls } from './env-loader';

// Environment validation (flexible for different deployment scenarios)
const coreEnvVars = ['DATABASE_URL', 'POSTGRES_URL'] as const;
const optionalEnvVars = [
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NO_SSL', 
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_USER',
  'POSTGRES_HOST',
  'POSTGRES_PASSWORD',
  'POSTGRES_DATABASE'
] as const;

function validateEnvironment() {
  // Check for at least one core connection string
  const hasConnection = coreEnvVars.some(envVar => process.env[envVar]);
  
  if (!hasConnection) {
    throw new Error('At least one connection string is required: DATABASE_URL or POSTGRES_URL');
  }
  
  // Warn about missing optional variables (but don't fail)
  const missingOptional = optionalEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingOptional.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn(`💡 Optional Neon variables not set: ${missingOptional.join(', ')}`);
    console.warn('Run: vercel env pull .env.local (for full Vercel integration)');
  }
}

// Connection string selection (2025 best practice)
function getConnectionString(): string {
  // Prefer DATABASE_URL as primary connection string
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Fallback to POSTGRES_URL (Vercel standard)
  if (process.env.POSTGRES_URL) {
    return process.env.POSTGRES_URL;
  }
  
  throw new Error('No valid Neon connection string found');
}

// Connection optimization based on environment
function getOptimizedConnectionString(): string {
  const baseUrl = getConnectionString();
  
  // For production: use pooled connection
  if (process.env.NODE_ENV === 'production') {
    return process.env.POSTGRES_URL || baseUrl;
  }
  
  // For development: use non-pooled for better debugging
  if (process.env.NODE_ENV === 'development') {
    return process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL_UNPOOLED || baseUrl;
  }
  
  // For preview deployments: use pooled connection
  if (process.env.VERCEL_ENV === 'preview') {
    return process.env.POSTGRES_URL || baseUrl;
  }
  
  return baseUrl;
}

// Initialize environment validation
validateEnvironment();

// Create optimized connection
const connectionString = getOptimizedConnectionString();
const neonSql = neon(connectionString);

// Create Drizzle instance with Neon HTTP driver (2025 recommended)
export const db = drizzle(neonSql, {
  logger: process.env.NODE_ENV === 'development'
});

// Connection info for debugging
export const getConnectionInfo = () => {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    database: url.pathname.slice(1),
    user: url.username,
    ssl: url.searchParams.get('sslmode') === 'require',
    pooled: url.hostname.includes('pooler'),
    environment: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    region: process.env.VERCEL_REGION,
    branch: process.env.VERCEL_GIT_COMMIT_REF
  };
};

// Enhanced health check with connection pooling info
export const checkNeonHealth = async () => {
  try {
    const startTime = Date.now();
    const result = await db.execute(sql`
      SELECT 
        1 as health,
        current_database() as database,
        current_user as user,
        version() as postgres_version,
        now() as server_time
    `);
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime,
      connection: getConnectionInfo(),
      database: result[0],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Neon health check failed:', error);
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      connection: getConnectionInfo(),
      timestamp: new Date().toISOString()
    };
  }
};

// Branch-aware queries (2025 feature)
export const getBranchInfo = async () => {
  try {
    // Check if we're in a preview branch
    if (process.env.VERCEL_ENV === 'preview') {
      return {
        branch: process.env.VERCEL_GIT_COMMIT_REF,
        commit: process.env.VERCEL_GIT_COMMIT_SHA,
        environment: 'preview',
        database: process.env.POSTGRES_DATABASE
      };
    }
    
    return {
      branch: 'main',
      environment: process.env.NODE_ENV,
      database: process.env.POSTGRES_DATABASE
    };
  } catch (error) {
    console.error('Failed to get branch info:', error);
    return null;
  }
};

// Connection pool management
export const getPoolStatus = async () => {
  try {
    // This would show connection pool status if available
    const result = await db.execute(sql`
      SELECT 
        count(*) as active_connections,
        current_setting('max_connections') as max_connections
      FROM pg_stat_activity 
      WHERE state = 'active'
    `);
    
    return {
      active: parseInt(result[0].active_connections as string),
      max: parseInt(result[0].max_connections as string),
      pooled: getConnectionInfo().pooled
    };
  } catch (error) {
    console.warn('Pool status unavailable:', error);
    return null;
  }
};

// Export default database instance
export default db;