/**
 * Test script for validating the AI agents system infrastructure
 * Run with: npm run test:agents (add this script to package.json)
 */

import { initializeAgentSystem, getSystemStatus, cleanupExpiredData } from '../lib/agent-system';
import { config } from '../lib/config';
import { BaseAgent } from '../agents/base/BaseAgent';
import { AgentJob, AgentResult, AgentType, JobPriority } from '../agents/types/AgentTypes';

// Test agent implementation
class TestAgent extends BaseAgent {
  constructor() {
    super('test', {
      maxRetries: 2,
      timeout: 10000,
      enableLogging: true,
      enableMetrics: true
    });
  }

  async execute(job: AgentJob): Promise<AgentResult> {
    this.log(`Executing test job: ${job.id}`, job.payload);
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test different scenarios based on payload
    if (job.payload?.shouldFail) {
      throw new Error('Simulated job failure');
    }
    
    if (job.payload?.shouldTimeout) {
      await new Promise(resolve => setTimeout(resolve, 15000)); // Longer than timeout
    }
    
    return {
      success: true,
      data: {
        message: 'Test job completed successfully',
        input: job.payload,
        executedAt: new Date(),
        agentId: this.agentId
      },
      executionTime: 100,
      agentId: this.agentId
    };
  }
}

async function runTests(): Promise<void> {
  console.log('🚀 Starting AI Agents System Tests\n');
  
  try {
    // Test 1: System Initialization
    console.log('📋 Test 1: System Initialization');
    const initResult = await initializeAgentSystem();
    
    console.log('Initialization Result:', {
      success: initResult.success,
      configLoaded: initResult.configLoaded,
      databaseConnected: initResult.databaseConnected,
      environmentValid: initResult.environmentValid,
      errorsCount: initResult.errors.length,
      warningsCount: initResult.warnings.length
    });
    
    if (initResult.errors.length > 0) {
      console.log('❌ Errors:', initResult.errors);
    }
    
    if (initResult.warnings.length > 0) {
      console.log('⚠️ Warnings:', initResult.warnings);
    }
    
    if (!initResult.success) {
      console.log('❌ System initialization failed. Stopping tests.');
      return;
    }
    
    console.log('✅ System initialization successful\n');

    // Test 2: Configuration
    console.log('📋 Test 2: Configuration Validation');
    try {
      const envConfig = config.getEnvironment();
      const agentConfig = config.getAgentConfig();
      const configSummary = config.getConfigSummary();
      
      console.log('Environment Config Keys:', Object.keys(envConfig));
      console.log('Agent Config:', {
        maxConcurrentJobs: agentConfig.maxConcurrentJobs,
        defaultJobTimeout: agentConfig.defaultJobTimeout,
        maxRetries: agentConfig.maxRetries,
        enableLogging: agentConfig.enableLogging,
        enableMetrics: agentConfig.enableMetrics
      });
      console.log('Config Summary:', configSummary);
      console.log('✅ Configuration validation successful\n');
    } catch (error) {
      console.log('❌ Configuration validation failed:', error);
      return;
    }

    // Test 3: Agent Creation and Basic Operations
    console.log('📋 Test 3: Agent Creation and Basic Operations');
    try {
      const testAgent = new TestAgent();
      
      // Wait a bit for agent to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Agent Status:', testAgent.getStatus());
      console.log('Agent Config:', testAgent.getConfig());
      console.log('Agent Metrics:', testAgent.getMetrics());
      
      // Test health check
      const healthCheck = await testAgent.healthCheck();
      console.log('Agent Health Check:', healthCheck);
      
      console.log('✅ Agent creation and operations successful\n');
    } catch (error) {
      console.log('❌ Agent creation failed:', error);
      return;
    }

    // Test 4: Job Processing
    console.log('📋 Test 4: Job Processing');
    try {
      const testAgent = new TestAgent();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for initialization
      
      // Test successful job
      const successJob: AgentJob = {
        id: `test_job_${Date.now()}`,
        type: 'test_job',
        priority: JobPriority.NORMAL,
        payload: { message: 'Hello from test job' },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Processing successful job...');
      const successResult = await testAgent.processJob(successJob);
      console.log('Success Result:', {
        success: successResult.success,
        executionTime: successResult.executionTime,
        agentId: successResult.agentId,
        hasData: !!successResult.data
      });
      
      // Test failing job
      const failJob: AgentJob = {
        id: `test_fail_job_${Date.now()}`,
        type: 'test_fail_job',
        priority: JobPriority.NORMAL,
        payload: { shouldFail: true },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Processing failing job (should retry and fail)...');
      const failResult = await testAgent.processJob(failJob);
      console.log('Fail Result:', {
        success: failResult.success,
        error: failResult.error,
        retryCount: failResult.metadata?.retryCount,
        warningsCount: failResult.warnings?.length || 0
      });
      
      console.log('✅ Job processing tests successful\n');
      
      // Cleanup
      await testAgent.cleanup();
      
    } catch (error) {
      console.log('❌ Job processing test failed:', error);
    }

    // Test 5: System Status
    console.log('📋 Test 5: System Status');
    try {
      const systemStatus = await getSystemStatus();
      console.log('System Status:', systemStatus);
      console.log('✅ System status check successful\n');
    } catch (error) {
      console.log('❌ System status check failed:', error);
    }

    // Test 6: Cleanup Operations
    console.log('📋 Test 6: Cleanup Operations');
    try {
      const cleanupResult = await cleanupExpiredData();
      console.log('Cleanup Result:', cleanupResult);
      console.log('✅ Cleanup operations successful\n');
    } catch (error) {
      console.log('❌ Cleanup operations failed:', error);
    }

    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('💥 Test suite failed with error:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\n✨ Test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

export { runTests };