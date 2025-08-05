#!/usr/bin/env tsx

/**
 * Comprehensive Health Check Script (2025)
 * Validates Neon + Vercel integration and system readiness
 */

// Load environment variables first
import 'dotenv/config';

import { checkDatabaseHealth, getDatabaseInfo, getBranchInfo } from '../lib/neon';

async function runHealthCheck() {
  console.log('🔍 Running comprehensive health check...\n');

  try {
    // 1. Environment Check
    console.log('1️⃣ Checking environment variables...');
    const hasDbUrl = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
    console.log('   📊 Database URL:', hasDbUrl ? '✅ Set' : '❌ Missing');
    console.log('   🏗️  Environment:', process.env.NODE_ENV || 'development');
    console.log('   ☁️  Vercel Environment:', process.env.VERCEL_ENV || 'local');

    if (!hasDbUrl) {
      console.log('   ⚠️  No database connection string found');
      console.log('   💡 Run: vercel env pull .env.local');
      return;
    }

    // 2. Database Health
    console.log('\n2️⃣ Checking database health...');
    const dbHealth = await checkDatabaseHealth();
    
    if (dbHealth.status === 'healthy') {
      console.log('   ✅ Database connection is healthy');
      console.log('   📊 Response time:', `${dbHealth.responseTime}ms`);
      console.log('   🗄️  Database:', dbHealth.database?.database);
      console.log('   👤 User:', dbHealth.database?.user);
    } else {
      console.log('   ❌ Database health check failed:', dbHealth.error);
    }

    // 3. Connection Info
    console.log('\n3️⃣ Checking connection details...');
    const dbInfo = getDatabaseInfo();
    console.log('   🌐 Host:', dbInfo.host);
    console.log('   🗄️  Database:', dbInfo.database);
    console.log('   🔗 Pooled:', dbInfo.pooled ? '✅ Yes' : '❌ No');
    console.log('   🔒 SSL:', dbInfo.ssl ? '✅ Enabled' : '❌ Disabled');

    // 4. Branch Information
    console.log('\n4️⃣ Checking deployment info...');
    const branchInfo = getBranchInfo();
    console.log('   🌿 Branch:', branchInfo.branch);
    console.log('   🏗️  Environment:', branchInfo.environment);
    console.log('   🎯 Preview:', branchInfo.preview ? '✅ Yes' : '❌ No');
    console.log('   🚀 Production:', branchInfo.production ? '✅ Yes' : '❌ No');

    // Overall Status
    const overallHealthy = dbHealth.status === 'healthy';

    console.log('\n🎉 Health check completed!');
    console.log(`📊 Overall status: ${overallHealthy ? '✅ HEALTHY' : '⚠️  NEEDS ATTENTION'}`);
    
    if (!overallHealthy && dbHealth.error) {
      console.log('\n⚠️  Issues found:');
      console.log(`   - Database: ${dbHealth.error}`);
    }

    console.log(`\n📅 Check completed at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runHealthCheck();
}

export { runHealthCheck };