/**
 * Environment Variables Loader
 * Ensures .env files are loaded in all contexts (tests, scripts, etc.)
 */

import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Environment files to check (in order of priority)
const ENV_FILES = [
  '.env.local',      // Local overrides (highest priority)
  '.env.development', // Development environment
  '.env.production', // Production environment
  '.env'            // Default environment (lowest priority)
];

/**
 * Load environment variables from .env files
 */
export function loadEnvironment(override = false) {
  const projectRoot = process.cwd();
  let loaded = false;
  
  // Load environment files in reverse order (so higher priority files override)
  for (const envFile of ENV_FILES.reverse()) {
    const envPath = path.join(projectRoot, envFile);
    
    if (fs.existsSync(envPath)) {
      const result = config({ 
        path: envPath, 
        override: override || !loaded // Only override if first file or explicitly requested
      });
      
      if (!result.error) {
        console.log(`📁 Loaded environment from: ${envFile}`);
        loaded = true;
      } else {
        console.warn(`⚠️  Failed to load ${envFile}:`, result.error.message);
      }
    }
  }
  
  if (!loaded) {
    console.warn('⚠️  No .env files found, using system environment variables only');
  }
  
  return loaded;
}

/**
 * Validate required environment variables
 */
export function validateRequiredEnvVars(requiredVars: string[]): { valid: boolean; missing: string[] } {
  const missing = requiredVars.filter(envVar => !process.env[envVar] || process.env[envVar] === '');
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Get database connection strings with fallbacks
 */
export function getDatabaseUrls() {
  return {
    primary: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    pooled: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    unpooled: process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL_UNPOOLED,
    prisma: process.env.POSTGRES_PRISMA_URL,
    noSsl: process.env.POSTGRES_URL_NO_SSL
  };
}

/**
 * Initialize environment for scripts and tests
 */
export function initializeEnvironment() {
  // Don't reload if already initialized (prevents conflicts)
  if (process.env.ENV_LOADED === 'true') {
    return;
  }
  
  console.log('🔧 Initializing environment...');
  
  // Load environment files
  const loaded = loadEnvironment(true);
  
  // Mark as loaded
  process.env.ENV_LOADED = 'true';
  
  // Validate core variables
  const coreVars = ['DATABASE_URL', 'POSTGRES_URL'];
  const validation = validateRequiredEnvVars(coreVars);
  
  if (!validation.valid) {
    console.warn(`⚠️  Missing core environment variables: ${validation.missing.join(', ')}`);
    
    // For development, try to provide helpful guidance
    if (process.env.NODE_ENV !== 'production') {
      console.log('💡 To fix this:');
      console.log('   1. Copy .env.local from your project');
      console.log('   2. Or run: vercel env pull .env.local');
      console.log('   3. Or set DATABASE_URL manually');
    }
  }
  
  return {
    loaded,
    validation,
    urls: getDatabaseUrls()
  };
}

// Auto-initialize when imported (except in production)
if (process.env.NODE_ENV !== 'production' && process.env.ENV_LOADED !== 'true') {
  initializeEnvironment();
}