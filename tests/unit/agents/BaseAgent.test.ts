import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseAgent } from '../../../agents/base/BaseAgent';
import { AgentJob, AgentResult, AgentConfig, AgentStatus, JobStatus } from '../../../agents/types/AgentTypes';
import { MockMessageBus, MockSharedMemory, mockSupabase, mockConfig } from '../../utils/test-utils';
import { 
  baseAgentConfig, 
  pendingAgentJob, 
  successfulResult, 
  failedResult,
  networkErrorScenario,
  timeoutErrorScenario,
  validationErrorScenario
} from '../../fixtures/agent-fixtures';

// Mock external dependencies
vi.mock('../../../lib/supabase', () => ({
  supabase: mockSupabase
}));

vi.mock('../../../lib/config', () => ({
  config: mockConfig
}));

// Concrete implementation of BaseAgent for testing
class TestAgent extends BaseAgent {
  public shouldFailExecution = false;
  public executionDelay = 0;
  public shouldTimeout = false;

  constructor(config?: AgentConfig) {
    super('test-agent', config);
  }

  async execute(job: AgentJob): Promise<AgentResult> {
    if (this.shouldTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100000)); // Long delay to trigger timeout
    }

    if (this.executionDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.executionDelay));
    }

    if (this.shouldFailExecution) {
      throw new Error('Test execution failure');
    }

    return {
      success: true,
      data: { processed: job.payload },
      executionTime: this.executionDelay,
      agentId: this.agentId
    };
  }
}

describe('BaseAgent', () => {
  let testAgent: TestAgent;
  let mockMessageBus: MockMessageBus;
  let mockMemory: MockSharedMemory;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      }),
      upsert: vi.fn().mockResolvedValue({ error: null })
    });
    
    mockConfig.initialize.mockResolvedValue(undefined);
    mockConfig.getAgentConfig.mockReturnValue(baseAgentConfig);
    
    // Create fresh instances for each test
    mockMessageBus = new MockMessageBus();
    mockMemory = new MockSharedMemory();
    
    testAgent = new TestAgent(baseAgentConfig);
    
    // Replace with mocks after construction
    (testAgent as any).messageBus = mockMessageBus;
    (testAgent as any).memory = mockMemory;
  });

  afterEach(() => {
    if (testAgent) {
      return testAgent.cleanup();
    }
  });

  describe('Construction and Initialization', () => {
    it('should create agent with default configuration', () => {
      const agent = new TestAgent();
      
      expect(agent).toBeDefined();
      expect(agent.getStatus()).toBe(AgentStatus.INITIALIZING);
      expect(agent.getConfig()).toMatchObject({
        maxRetries: 3,
        timeout: 300000,
        concurrency: 1,
        enableLogging: true,
        enableMetrics: true
      });
    });

    it('should create agent with custom configuration', () => {
      const customConfig: AgentConfig = {
        maxRetries: 5,
        timeout: 60000,
        concurrency: 2,
        enableLogging: false,
        customSettings: { testSetting: true }
      };
      
      const agent = new TestAgent(customConfig);
      const config = agent.getConfig();
      
      expect(config.maxRetries).toBe(5);
      expect(config.timeout).toBe(60000);
      expect(config.concurrency).toBe(2);
      expect(config.enableLogging).toBe(false);
      expect(config.customSettings).toEqual({ testSetting: true });
    });

    it('should generate unique agent ID', () => {
      const agent1 = new TestAgent();
      const agent2 = new TestAgent();
      
      expect(agent1.agentId).toBeDefined();
      expect(agent2.agentId).toBeDefined();
      expect(agent1.agentId).not.toBe(agent2.agentId);
    });

    it('should initialize metrics correctly', () => {
      const agent = new TestAgent();
      const metrics = agent.getMetrics();
      
      expect(metrics).toMatchObject({
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        averageExecutionTime: 0,
        errorRate: 0,
        uptime: 0
      });
      expect(metrics.agentId).toBeDefined();
      expect(metrics.createdAt).toBeInstanceOf(Date);
    });

    it('should handle configuration initialization failure gracefully', async () => {
      mockConfig.initialize.mockRejectedValue(new Error('Config initialization failed'));
      
      const agent = new TestAgent();
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Agent should still be created with default config
      expect(agent.getConfig()).toMatchObject({
        maxRetries: 3,
        timeout: 300000,
        enableLogging: true
      });
    });
  });

  describe('Job Processing', () => {
    beforeEach(async () => {
      // Wait for agent initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      testAgent.updateStatus(AgentStatus.IDLE);
    });

    it('should process job successfully', async () => {
      const job = { ...pendingAgentJob };
      
      const result = await testAgent.processJob(job);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ processed: job.payload });
      expect(result.agentId).toBe(testAgent.agentId);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle job execution failure', async () => {
      testAgent.shouldFailExecution = true;
      const job = { ...pendingAgentJob };
      
      const result = await testAgent.processJob(job);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test execution failure');
      expect(result.agentId).toBe(testAgent.agentId);
    });

    it('should respect job timeout constraints', async () => {
      const job = {
        ...pendingAgentJob,
        constraints: { maxExecutionTime: 100 }
      };
      testAgent.shouldTimeout = true;
      
      const result = await testAgent.processJob(job);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should retry failed jobs according to configuration', async () => {
      const job = {
        ...pendingAgentJob,
        constraints: { maxRetries: 2 }
      };
      
      let attemptCount = 0;
      testAgent.shouldFailExecution = true;
      
      // Mock shouldRetry to allow retries
      const originalShouldRetry = (testAgent as any).shouldRetry;
      (testAgent as any).shouldRetry = vi.fn().mockImplementation((error) => {
        attemptCount++;
        return attemptCount <= 2; // Allow 2 retries
      });
      
      const result = await testAgent.processJob(job);
      
      expect(result.success).toBe(false);
      expect((testAgent as any).shouldRetry).toHaveBeenCalledTimes(2);
      expect(result.metadata?.retryCount).toBe(2);
    });

    it('should not retry non-retryable errors', async () => {
      const job = { ...pendingAgentJob };
      
      // Mock execute to throw a validation error (non-retryable)
      testAgent.execute = vi.fn().mockRejectedValue(new TypeError('Validation error'));
      
      const result = await testAgent.processJob(job);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
      expect(testAgent.execute).toHaveBeenCalledTimes(1); // No retries
    });

    it('should update agent status during job processing', async () => {
      const job = { ...pendingAgentJob };
      testAgent.executionDelay = 50;
      
      expect(testAgent.getStatus()).toBe(AgentStatus.IDLE);
      
      const processPromise = testAgent.processJob(job);
      
      // Check status during processing
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(testAgent.getStatus()).toBe(AgentStatus.BUSY);
      
      await processPromise;
      expect(testAgent.getStatus()).toBe(AgentStatus.IDLE);
    });

    it('should update metrics after job completion', async () => {
      const job = { ...pendingAgentJob };
      const initialMetrics = testAgent.getMetrics();
      
      await testAgent.processJob(job);
      
      const updatedMetrics = testAgent.getMetrics();
      expect(updatedMetrics.totalJobs).toBe(initialMetrics.totalJobs + 1);
      expect(updatedMetrics.successfulJobs).toBe(initialMetrics.successfulJobs + 1);
      expect(updatedMetrics.lastJobTime).toBeInstanceOf(Date);
    });

    it('should handle database errors when updating job status', async () => {
      // Mock database error
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Database connection failed' } })
        })
      });
      
      const job = { ...pendingAgentJob };
      
      // Job should still complete despite database error
      const result = await testAgent.processJob(job);
      
      expect(result.success).toBe(true);
      // Database error should be logged but not fail the job
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should subscribe to message topics during initialization', async () => {
      const subscribeSpy = vi.spyOn(mockMessageBus, 'subscribe');
      
      const agent = new TestAgent();
      (agent as any).messageBus = mockMessageBus;
      await (agent as any).setupMessageHandlers();
      
      expect(subscribeSpy).toHaveBeenCalledWith('agent.test-agent', expect.any(Function));
      expect(subscribeSpy).toHaveBeenCalledWith(`agent.${agent.agentId}`, expect.any(Function));
      expect(subscribeSpy).toHaveBeenCalledWith('agent.broadcast', expect.any(Function));
    });

    it('should send messages to other agents', async () => {
      const publishSpy = vi.spyOn(mockMessageBus, 'publish');
      
      await testAgent.sendMessage('target-agent-123', { test: 'message' });
      
      expect(publishSpy).toHaveBeenCalledWith('agent.target-agent-123', {
        from: testAgent.agentId,
        message: { test: 'message' },
        timestamp: expect.any(Date)
      });
    });

    it('should broadcast messages to agent types', async () => {
      const publishSpy = vi.spyOn(mockMessageBus, 'publish');
      
      await testAgent.broadcastToAgentType('scraper', { command: 'pause' });
      
      expect(publishSpy).toHaveBeenCalledWith('agent.scraper', {
        from: testAgent.agentId,
        message: { command: 'pause' },
        timestamp: expect.any(Date)
      });
    });

    it('should broadcast status updates', async () => {
      const publishSpy = vi.spyOn(mockMessageBus, 'publish');
      
      testAgent.updateStatus(AgentStatus.BUSY);
      
      expect(publishSpy).toHaveBeenCalledWith('agent.status.update', {
        agentId: testAgent.agentId,
        agentType: 'test-agent',
        status: AgentStatus.BUSY,
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Memory Operations', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should store data in shared memory', async () => {
      const key = 'test-key';
      const data = { test: 'data' };
      
      await testAgent.storeMemory(key, data);
      
      const stored = await mockMemory.get(key);
      expect(stored).toEqual(data);
    });

    it('should retrieve data from shared memory', async () => {
      const key = 'test-key';
      const data = { test: 'data' };
      
      await mockMemory.set(key, data);
      const retrieved = await testAgent.getMemory(key);
      
      expect(retrieved).toEqual(data);
    });

    it('should handle memory storage with TTL', async () => {
      const key = 'temp-key';
      const data = { temp: 'data' };
      const ttl = 3600;
      
      const setSpy = vi.spyOn(mockMemory, 'set');
      
      await testAgent.storeMemory(key, data, ttl);
      
      expect(setSpy).toHaveBeenCalledWith(key, data, ttl);
    });
  });

  describe('Health Check', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should return healthy status when all components are healthy', async () => {
      const health = await testAgent.healthCheck();
      
      expect(health.healthy).toBe(true);
      expect(health.details).toMatchObject({
        agentId: testAgent.agentId,
        agentType: 'test-agent',
        status: expect.any(String),
        memory: { healthy: true },
        messageBus: { healthy: true }
      });
    });

    it('should return unhealthy status when components fail', async () => {
      // Mock memory health check failure
      mockMemory.healthCheck = vi.fn().mockResolvedValue({ healthy: false });
      
      const health = await testAgent.healthCheck();
      
      expect(health.healthy).toBe(false);
      expect(health.details.memory.healthy).toBe(false);
    });

    it('should handle health check errors gracefully', async () => {
      // Mock memory health check to throw error
      mockMemory.healthCheck = vi.fn().mockRejectedValue(new Error('Health check failed'));
      
      const health = await testAgent.healthCheck();
      
      expect(health.healthy).toBe(false);
      expect(health.details.error).toContain('Health check failed');
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration dynamically', () => {
      const newConfig = { maxRetries: 5, timeout: 120000 };
      
      testAgent.updateConfig(newConfig);
      
      const config = testAgent.getConfig();
      expect(config.maxRetries).toBe(5);
      expect(config.timeout).toBe(120000);
    });

    it('should preserve unmodified configuration values', () => {
      const originalConfig = testAgent.getConfig();
      const newConfig = { maxRetries: 5 };
      
      testAgent.updateConfig(newConfig);
      
      const config = testAgent.getConfig();
      expect(config.maxRetries).toBe(5);
      expect(config.timeout).toBe(originalConfig.timeout);
      expect(config.enableLogging).toBe(originalConfig.enableLogging);
    });
  });

  describe('Error Handling', () => {
    it('should determine retryable vs non-retryable errors correctly', () => {
      const retryableErrors = [
        new Error('Network timeout'),
        { status: 500, message: 'Internal server error' },
        { status: 502, message: 'Bad gateway' }
      ];
      
      const nonRetryableErrors = [
        new TypeError('Invalid type'),
        { name: 'ValidationError', message: 'Validation failed' },
        { status: 400, message: 'Bad request' },
        { status: 404, message: 'Not found' }
      ];
      
      retryableErrors.forEach(error => {
        expect((testAgent as any).shouldRetry(error)).toBe(true);
      });
      
      nonRetryableErrors.forEach(error => {
        expect((testAgent as any).shouldRetry(error)).toBe(false);
      });
    });

    it('should calculate retry delay with exponential backoff', () => {
      const delay1 = (testAgent as any).calculateRetryDelay(1);
      const delay2 = (testAgent as any).calculateRetryDelay(2);
      const delay3 = (testAgent as any).calculateRetryDelay(3);
      
      expect(delay1).toBeGreaterThan(1000);
      expect(delay1).toBeLessThan(3000);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
      
      // Should not exceed max delay
      const delayMax = (testAgent as any).calculateRetryDelay(10);
      expect(delayMax).toBeLessThanOrEqual(30000);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      const unsubscribeSpy = vi.spyOn(mockMessageBus, 'unsubscribeAll');
      const memoryCleanupSpy = vi.spyOn(mockMemory, 'cleanup');
      
      await testAgent.cleanup();
      
      expect(testAgent.getStatus()).toBe(AgentStatus.STOPPED);
      expect(unsubscribeSpy).toHaveBeenCalled();
      expect(memoryCleanupSpy).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockMessageBus.unsubscribeAll = vi.fn().mockRejectedValue(new Error('Cleanup failed'));
      
      // Should not throw error
      await expect(testAgent.cleanup()).resolves.toBeUndefined();
      expect(testAgent.getStatus()).toBe(AgentStatus.STOPPED);
    });
  });

  describe('Logging', () => {
    it('should log messages when logging is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      testAgent.updateConfig({ enableLogging: true });
      (testAgent as any).log('Test message', { data: 'test' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message')
      );
      
      consoleSpy.mockRestore();
    });

    it('should not log messages when logging is disabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      testAgent.updateConfig({ enableLogging: false });
      (testAgent as any).log('Test message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should log errors with stack traces', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const error = new Error('Test error');
      (testAgent as any).logError('Error occurred', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test error')
      );
      
      consoleErrorSpy.mockRestore();
    });
  });
});