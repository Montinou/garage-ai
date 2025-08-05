#!/usr/bin/env tsx

/**
 * Test Script for Neon Database Integration
 * Verifies that all agent system operations work with Neon
 */

// Load environment variables first
import 'dotenv/config';

import { checkDatabaseHealth, getDatabaseInfo } from '../lib/neon';
import { 
  createAgentJob, 
  getAgentJobs, 
  setAgentMemory, 
  getAgentMemory, 
  recordAgentMetric,
  sendAgentMessage,
  getAgentMessages,
  getSystemHealth
} from '../lib/queries';
import { NeonAgentAdapter } from '../lib/neon-agent-adapter';

async function testNeonIntegration() {
  console.log('🧪 Testing Neon Database Integration...\n');

  try {
    // Test 1: Database Health Check
    console.log('1️⃣ Testing database health...');
    const health = await checkDatabaseHealth();
    console.log('   ✅ Health status:', health.status);
    
    const dbInfo = getDatabaseInfo();
    console.log('   📊 Database info:', {
      host: dbInfo.host,
      database: dbInfo.database,
      pooled: dbInfo.pooled,
      ssl: dbInfo.ssl
    });

    // Test 2: Agent Job Operations
    console.log('\n2️⃣ Testing agent job operations...');
    const testJob = await createAgentJob({
      agentId: 'test-agent-001',
      agentType: 'orchestrator',
      jobType: 'test_job',
      status: 'pending',
      priority: 'normal',
      payload: { test: true, timestamp: new Date().toISOString() }
    });
    console.log('   ✅ Created job:', testJob.id);

    const jobs = await getAgentJobs('test-agent-001');
    console.log('   ✅ Retrieved jobs:', jobs.length);

    // Test 3: Agent Memory Operations
    console.log('\n3️⃣ Testing agent memory operations...');
    await setAgentMemory({
      agentId: 'test-agent-001',
      agentType: 'orchestrator',
      key: 'test_memory',
      value: { testData: 'hello from neon', timestamp: new Date() },
      tags: { category: 'test', environment: 'development' }
    });
    console.log('   ✅ Set agent memory');

    const memory = await getAgentMemory('test-agent-001', 'test_memory');
    console.log('   ✅ Retrieved memory:', memory?.value);

    // Test 4: Agent Metrics
    console.log('\n4️⃣ Testing agent metrics...');
    await recordAgentMetric('test-agent-001', 'orchestrator', 'test_metric', 42.5, 'units');
    console.log('   ✅ Recorded metric');

    // Test 5: Agent Messages
    console.log('\n5️⃣ Testing agent messaging...');
    const message = await sendAgentMessage(
      'test-agent-001',
      'test-agent-002',
      'test_message',
      { content: 'Hello from Neon!', timestamp: new Date() },
      'test.topic'
    );
    console.log('   ✅ Sent message:', message.id);

    const messages = await getAgentMessages('test-agent-002');
    console.log('   ✅ Retrieved messages:', messages.length);

    // Test 6: Adapter Operations
    console.log('\n6️⃣ Testing NeonAgentAdapter...');
    await NeonAgentAdapter.registerAgent(
      'test-adapter-001',
      'validator',
      'running',
      { testConfig: true },
      new Date()
    );
    console.log('   ✅ Registered agent via adapter');

    await NeonAgentAdapter.recordMetric(
      'test-adapter-001',
      'validator',
      'adapter_test',
      99.9,
      'percentage'
    );
    console.log('   ✅ Recorded metric via adapter');

    // Test 7: System Health
    console.log('\n7️⃣ Testing system health...');
    const systemHealth = await getSystemHealth();
    console.log('   ✅ System health:', {
      totalJobs: systemHealth.jobs.total,
      pendingJobs: systemHealth.jobs.pending,
      totalMessages: systemHealth.messages.total,
      totalVehicles: systemHealth.vehicles.total
    });

    console.log('\n🎉 All tests passed! Neon integration is working correctly.');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Database connection: OK');
    console.log('   ✅ Agent jobs: OK');
    console.log('   ✅ Agent memory: OK');
    console.log('   ✅ Agent metrics: OK');
    console.log('   ✅ Agent messages: OK');
    console.log('   ✅ Adapter functions: OK');
    console.log('   ✅ System health: OK');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testNeonIntegration();
}

export { testNeonIntegration };