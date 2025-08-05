/**
 * Vercel + Neon Integration (2025 Best Practices)
 * Handles preview branches, environment management, and deployment hooks
 */

import { getBranchInfo, getConnectionInfo, checkNeonHealth } from './neon-config';

// Vercel environment detection
export const getVercelEnvironment = () => {
  return {
    env: process.env.VERCEL_ENV || 'development',
    url: process.env.VERCEL_URL || 'localhost:3000',
    region: process.env.VERCEL_REGION || 'local',
    deployment: {
      id: process.env.VERCEL_DEPLOYMENT_ID,
      url: process.env.VERCEL_URL
    },
    git: {
      branch: process.env.VERCEL_GIT_COMMIT_REF || 'main',
      commit: process.env.VERCEL_GIT_COMMIT_SHA,
      repo: process.env.VERCEL_GIT_REPO_SLUG,
      owner: process.env.VERCEL_GIT_REPO_OWNER
    }
  };
};

// Preview branch detection and configuration
export const isPreviewDeployment = () => {
  return process.env.VERCEL_ENV === 'preview';
};

export const isProductionDeployment = () => {
  return process.env.VERCEL_ENV === 'production';
};

// Database branch management for preview deployments
export const getDatabaseBranch = async () => {
  const vercelEnv = getVercelEnvironment();
  const branchInfo = await getBranchInfo();
  
  return {
    isPreview: isPreviewDeployment(),
    isProduction: isProductionDeployment(),
    vercel: vercelEnv,
    database: branchInfo,
    connection: getConnectionInfo()
  };
};

// Health check with Vercel context
export const getDeploymentHealth = async () => {
  const [dbHealth, branchInfo] = await Promise.all([
    checkNeonHealth(),
    getDatabaseBranch()
  ]);
  
  return {
    deployment: {
      environment: process.env.VERCEL_ENV,
      region: process.env.VERCEL_REGION,
      url: process.env.VERCEL_URL
    },
    database: dbHealth,
    branch: branchInfo,
    timestamp: new Date().toISOString()
  };
};

// Environment variable validation for Vercel deployment
export const validateVercelEnvironment = () => {
  const requiredVars = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'BLOB_READ_WRITE_TOKEN',
    'EDGE_CONFIG',
    'GOOGLE_AI_API_KEY'
  ];
  
  const missing = requiredVars.filter(envVar => !process.env[envVar]);
  const warnings = [];
  
  // Check for missing variables
  if (missing.length > 0) {
    warnings.push(`Missing environment variables: ${missing.join(', ')}`);
  }
  
  // Check for preview-specific configuration
  if (isPreviewDeployment()) {
    if (!process.env.POSTGRES_URL) {
      warnings.push('POSTGRES_URL should be set for preview deployments');
    }
  }
  
  // Check for production-specific configuration
  if (isProductionDeployment()) {
    const productionVars = ['VERCEL_OIDC_TOKEN', 'NEON_PROJECT_ID'];
    const missingProd = productionVars.filter(envVar => !process.env[envVar]);
    
    if (missingProd.length > 0) {
      warnings.push(`Missing production variables: ${missingProd.join(', ')}`);
    }
  }
  
  return {
    valid: missing.length === 0,
    warnings,
    environment: getVercelEnvironment()
  };
};

// Deployment hook for database operations
export const onDeploymentStart = async () => {
  console.log('🚀 Deployment starting...');
  
  const validation = validateVercelEnvironment();
  if (!validation.valid) {
    console.warn('⚠️  Environment validation warnings:', validation.warnings);
  }
  
  const health = await getDeploymentHealth();
  console.log('📊 Deployment health:', {
    environment: health.deployment.environment,
    database: health.database.status,
    branch: health.branch.database?.branch || 'main'
  });
  
  return health;
};

// Preview deployment cleanup (if needed)
export const onPreviewCleanup = async () => {
  if (!isPreviewDeployment()) {
    return { message: 'Not a preview deployment' };
  }
  
  console.log('🧹 Preview deployment cleanup...');
  // Add any cleanup logic here if needed
  
  return { 
    message: 'Preview cleanup completed',
    branch: process.env.VERCEL_GIT_COMMIT_REF 
  };
};

// Production deployment hooks
export const onProductionDeploy = async () => {
  if (!isProductionDeployment()) {
    return { message: 'Not a production deployment' };
  }
  
  console.log('🎯 Production deployment detected');
  
  // Run production-specific checks
  const health = await checkNeonHealth();
  
  if (health.status !== 'healthy') {
    throw new Error(`Database health check failed: ${health.error}`);
  }
  
  return {
    message: 'Production deployment ready',
    database: health,
    timestamp: new Date().toISOString()
  };
};

// Deployment info for debugging
export const getDeploymentInfo = () => {
  return {
    vercel: getVercelEnvironment(),
    database: getConnectionInfo(),
    preview: isPreviewDeployment(),
    production: isProductionDeployment(),
    timestamp: new Date().toISOString()
  };
};