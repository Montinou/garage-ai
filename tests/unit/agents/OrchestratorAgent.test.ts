import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OrchestratorAgent } from '../../../agents/OrchestratorAgent';
import { 
  AgentJob, 
  AgentResult, 
  AgentConfig, 
  JobStatus, 
  JobPriority, 
  AgentType,
  OrchestrationRequest 
} from '../../../agents/types/AgentTypes';
import { MockMessageBus, MockSharedMemory, mockSupabase, mockConfig } from '../../utils/test-utils';
import { 
  orchestratorConfig,
  vehicleScrapingRequest,
  urgentScrapingRequest,
  pendingOrchestrationResult,
  completedOrchestrationResult
} from '../../fixtures/agent-fixtures';

// Mock external dependencies
vi.mock('../../../lib/supabase', () => ({
  supabase: mockSupabase
}));

vi.mock('../../../lib/config', () => ({
  config: mockConfig
}));

// Mock Vercel Edge Config
vi.mock('@vercel/edge-config', () => ({
  get: vi.fn().mockImplementation((key: string) => {
    if (key === 'orchestratorConfig') {
      return Promise.resolve({
        maxConcurrentWorkflows: 10,
        workflowTimeout: 900000
      });
    }
    if (key === 'workflowDefinitions') {
      return Promise.resolve([
        {
          id: 'test-workflow',
          name: 'Test Workflow',
          steps: [
            {
              id: 'step1',
              name: 'Test Step',
              type: 'agent',
              agentType: AgentType.SCRAPER,
              inputs: { test: 'input' },
              outputs: ['result'],
              dependencies: [],
              optional: false
            }
          ]
        }
      ]);
    }
    return Promise.resolve(null);
  })
}));

describe('OrchestratorAgent', () => {
  let orchestrator: OrchestratorAgent;
  let mockMessageBus: MockMessageBus;
  let mockMemory: MockSharedMemory;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: pendingOrchestrationResult, 
            error: null 
          })
        })
      })
    });
    
    mockConfig.initialize.mockResolvedValue(undefined);
    mockConfig.getAgentConfig.mockReturnValue(orchestratorConfig);
    
    // Create fresh instances
    mockMessageBus = new MockMessageBus();
    mockMemory = new MockSharedMemory();
    
    orchestrator = new OrchestratorAgent(orchestratorConfig);
    
    // Replace with mocks after construction
    (orchestrator as any).messageBus = mockMessageBus;
    (orchestrator as any).memory = mockMemory;
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  afterEach(async () => {
    if (orchestrator) {
      await orchestrator.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should initialize with orchestrator-specific configuration', () => {
      const config = orchestrator.getConfig();
      
      expect(config).toMatchObject({
        maxRetries: 3,
        timeout: 600000,
        enableLogging: true,
        enableMetrics: true
      });
    });

    it('should load dynamic configuration from Edge Config', async () => {
      // Configuration should be loaded during initialization
      const stats = await orchestrator.getStats();
      
      expect(stats).toMatchObject({
        activeWorkflows: 0,
        queuedJobs: 0,
        availableAgents: expect.any(Number),
        workflowDefinitions: expect.any(Number)
      });
    });

    it('should discover and register available agents', async () => {
      const stats = await orchestrator.getStats();
      
      expect(stats.availableAgents).toBeGreaterThan(0);
      expect(stats.healthyAgents).toBeGreaterThanOrEqual(0);
    });

    it('should handle Edge Config loading failures gracefully', async () => {
      const { get } = await import('@vercel/edge-config');
      vi.mocked(get).mockRejectedValue(new Error('Edge Config unavailable'));
      
      const agent = new OrchestratorAgent();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should still initialize with defaults
      expect(agent.getStatus()).not.toBe('error');
    });
  });

  describe('Job Execution - Orchestrate Workflow', () => {
    it('should orchestrate a workflow successfully', async () => {
      const job: AgentJob = {
        id: 'orchestrate-job-1',
        type: 'orchestrate_workflow',
        priority: JobPriority.NORMAL,
        payload: vehicleScrapingRequest,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await orchestrator.execute(job);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        workflowId: expect.any(String),
        status: expect.any(String),
        steps: expect.any(Array)
      });
      expect(result.agentId).toBe(orchestrator.agentId);
    });

    it('should handle unknown workflow gracefully', async () => {
      const job: AgentJob = {
        id: 'unknown-workflow-job',
        type: 'orchestrate_workflow',
        priority: JobPriority.NORMAL,
        payload: {
          ...vehicleScrapingRequest,
          workflow: 'unknown-workflow'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await orchestrator.execute(job);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Workflow definition not found');
    });

    it('should prioritize urgent workflows', async () => {
      const normalJob: AgentJob = {
        id: 'normal-job',
        type: 'schedule_job',
        priority: JobPriority.NORMAL,
        payload: vehicleScrapingRequest,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const urgentJob: AgentJob = {
        id: 'urgent-job',
        type: 'schedule_job',
        priority: JobPriority.URGENT,
        payload: urgentScrapingRequest,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Schedule both jobs
      await orchestrator.execute(normalJob);
      await orchestrator.execute(urgentJob);

      const stats = await orchestrator.getStats();
      expect(stats.queuedJobs).toBe(2);
    });

    it('should limit concurrent workflows', async () => {
      const maxConcurrent = (orchestrator as any).orchestratorConfig.maxConcurrentWorkflows || 5;
      
      // Try to start more workflows than the limit
      const jobs = Array.from({ length: maxConcurrent + 2 }, (_, i) => ({
        id: `workflow-job-${i}`,
        type: 'orchestrate_workflow',
        priority: JobPriority.NORMAL,
        payload: vehicleScrapingRequest,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Process jobs concurrently
      const results = await Promise.all(
        jobs.map(job => orchestrator.execute(job))
      );

      // All should be accepted (queued), but limited concurrent execution
      const successfulResults = results.filter(r => r.success);
      expect(successfulResults.length).toBeGreaterThan(0);
    });
  });

  describe('Job Execution - Other Job Types', () => {
    it('should schedule jobs for later execution', async () => {
      const job: AgentJob = {
        id: 'schedule-job-1',
        type: 'schedule_job',
        priority: JobPriority.NORMAL,
        payload: vehicleScrapingRequest,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await orchestrator.execute(job);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        jobId: job.id,
        queuePosition: expect.any(Number)
      });
    });

    it('should monitor workflow execution', async () => {
      const job: AgentJob = {
        id: 'monitor-job-1',
        type: 'monitor_workflow',
        priority: JobPriority.NORMAL,
        payload: {
          workflowId: 'workflow-123'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // First add a workflow to the active workflows
      const activeWorkflows = (orchestrator as any).activeWorkflows;
      activeWorkflows.set('workflow-123', {
        workflowId: 'workflow-123',
        request: vehicleScrapingRequest,
        steps: [],
        currentStepIndex: 0,
        startTime: new Date(),
        context: {},
        retryCount: 0
      });

      const result = await orchestrator.execute(job);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        workflowId: 'workflow-123',
        status: 'running',
        currentStep: expect.any(Number),
        totalSteps: expect.any(Number)
      });
    });

    it('should cancel workflow execution', async () => {
      const job: AgentJob = {
        id: 'cancel-job-1',
        type: 'cancel_workflow',
        priority: JobPriority.NORMAL,
        payload: {
          workflowId: 'workflow-123'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add workflow to active workflows
      const activeWorkflows = (orchestrator as any).activeWorkflows;
      activeWorkflows.set('workflow-123', {
        workflowId: 'workflow-123',
        steps: []
      });

      const result = await orchestrator.execute(job);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        workflowId: 'workflow-123',
        status: 'cancelled'
      });
      expect(activeWorkflows.has('workflow-123')).toBe(false);
    });

    it('should get agent status', async () => {
      const job: AgentJob = {
        id: 'status-job-1',
        type: 'get_agent_status',
        priority: JobPriority.NORMAL,
        payload: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await orchestrator.execute(job);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        totalAgents: expect.any(Number),
        healthyAgents: expect.any(Number),
        activeWorkflows: expect.any(Number),
        queuedJobs: expect.any(Number),
        agents: expect.any(Array)
      });
    });

    it('should handle unknown job types', async () => {
      const job: AgentJob = {
        id: 'unknown-job-1',
        type: 'unknown_job_type',
        priority: JobPriority.NORMAL,
        payload: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await orchestrator.execute(job);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown job type');
    });
  });

  describe('Agent Discovery and Management', () => {
    it('should handle agent status updates', async () => {
      const statusUpdate = {
        payload: {
          agentId: 'test-agent-123',
          agentType: AgentType.SCRAPER,
          status: 'idle'
        }
      };

      await (orchestrator as any).handleAgentStatusUpdate(statusUpdate);

      // Should update available agents
      const availableAgents = (orchestrator as any).availableAgents;
      const scraperAgent = availableAgents.get(AgentType.SCRAPER);
      expect(scraperAgent?.healthStatus).toBe('healthy');
    });

    it('should map agent statuses to health statuses correctly', () => {
      const mapStatus = (orchestrator as any).mapStatusToHealth;

      expect(mapStatus('idle')).toBe('healthy');
      expect(mapStatus('busy')).toBe('healthy');
      expect(mapStatus('error')).toBe('unhealthy');
      expect(mapStatus('unknown')).toBe('degraded');
    });

    it('should get agent capabilities correctly', async () => {
      const getCapabilities = (orchestrator as any).getAgentCapabilities;

      const scraperCapabilities = await getCapabilities(AgentType.SCRAPER);
      expect(scraperCapabilities).toContain('web_scraping');
      expect(scraperCapabilities).toContain('data_extraction');

      const analyzerCapabilities = await getCapabilities(AgentType.ANALYZER);
      expect(analyzerCapabilities).toContain('structure_analysis');
      expect(analyzerCapabilities).toContain('ai_processing');
    });
  });

  describe('Workflow Step Execution', () => {
    it('should select best available agent for a step', () => {
      const selectBestAgent = (orchestrator as any).selectBestAgent;
      
      // Add a healthy scraper agent
      const availableAgents = (orchestrator as any).availableAgents;
      availableAgents.set(AgentType.SCRAPER, {
        agentType: AgentType.SCRAPER,
        currentLoad: 2,
        maxLoad: 10,
        healthStatus: 'healthy'
      });

      const agent = selectBestAgent(AgentType.SCRAPER);
      expect(agent).toBeDefined();
      expect(agent.agentType).toBe(AgentType.SCRAPER);
    });

    it('should not select unhealthy agents', () => {
      const selectBestAgent = (orchestrator as any).selectBestAgent;
      
      // Add an unhealthy agent
      const availableAgents = (orchestrator as any).availableAgents;
      availableAgents.set(AgentType.SCRAPER, {
        agentType: AgentType.SCRAPER,
        currentLoad: 2,
        maxLoad: 10,
        healthStatus: 'unhealthy'
      });

      const agent = selectBestAgent(AgentType.SCRAPER);
      expect(agent).toBeNull();
    });

    it('should not select overloaded agents', () => {
      const selectBestAgent = (orchestrator as any).selectBestAgent;
      
      // Add an overloaded agent
      const availableAgents = (orchestrator as any).availableAgents;
      availableAgents.set(AgentType.SCRAPER, {
        agentType: AgentType.SCRAPER,
        currentLoad: 15,
        maxLoad: 10,
        healthStatus: 'healthy'
      });

      const agent = selectBestAgent(AgentType.SCRAPER);
      expect(agent).toBeNull();
    });

    it('should check dependencies correctly', () => {
      const areDependenciesMet = (orchestrator as any).areDependenciesMet;
      
      const stepDef = {
        dependencies: ['step1', 'step2']
      };
      
      const completedSteps = [
        { id: 'step1', status: JobStatus.COMPLETED },
        { id: 'step2', status: JobStatus.COMPLETED },
        { id: 'step3', status: JobStatus.PENDING }
      ];

      expect(areDependenciesMet(stepDef, completedSteps)).toBe(true);
      
      const incompleteSteps = [
        { id: 'step1', status: JobStatus.COMPLETED },
        { id: 'step2', status: JobStatus.PENDING }
      ];

      expect(areDependenciesMet(stepDef, incompleteSteps)).toBe(false);
    });

    it('should resolve step inputs from context', () => {
      const resolveStepInputs = (orchestrator as any).resolveStepInputs;
      
      const stepDef = {
        inputs: {
          url: '${input.url}',
          data: '${step1.output}',
          constant: 'fixed-value'
        }
      };
      
      const parameters = { url: 'https://example.com' };
      const context = { 'step1.output': { processed: true } };

      const resolved = resolveStepInputs(stepDef, parameters, context);

      expect(resolved).toEqual({
        url: 'https://example.com',
        data: { processed: true },
        constant: 'fixed-value'
      });
    });
  });

  describe('Message Handling', () => {
    it('should handle direct orchestration messages', async () => {
      const message = {
        message: {
          type: 'orchestrate_workflow',
          payload: vehicleScrapingRequest
        }
      };

      const processJobSpy = vi.spyOn(orchestrator, 'processJob');
      
      await (orchestrator as any).handleDirectMessage(message);

      expect(processJobSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'orchestrate_workflow',
          payload: vehicleScrapingRequest
        })
      );
    });

    it('should handle agent registration messages', async () => {
      const message = {
        message: {
          type: 'agent_registration',
          payload: {
            agentType: AgentType.SCRAPER,
            capabilities: ['custom_scraping'],
            maxLoad: 15
          }
        }
      };

      await (orchestrator as any).handleDirectMessage(message);

      const availableAgents = (orchestrator as any).availableAgents;
      const scraperAgent = availableAgents.get(AgentType.SCRAPER);
      
      expect(scraperAgent.capabilities).toContain('custom_scraping');
      expect(scraperAgent.maxLoad).toBe(15);
    });

    it('should handle unknown message types gracefully', async () => {
      const message = {
        message: {
          type: 'unknown_message_type',
          payload: {}
        }
      };

      // Should not throw error
      await expect(
        (orchestrator as any).handleDirectMessage(message)
      ).resolves.toBeUndefined();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide comprehensive statistics', async () => {
      const stats = await orchestrator.getStats();

      expect(stats).toMatchObject({
        activeWorkflows: expect.any(Number),
        queuedJobs: expect.any(Number),
        availableAgents: expect.any(Number),
        healthyAgents: expect.any(Number),
        workflowDefinitions: expect.any(Number),
        averageWorkflowTime: expect.any(Number),
        configuration: expect.any(Object)
      });
    });

    it('should track workflow execution metrics', async () => {
      // Add some mock workflows
      const activeWorkflows = (orchestrator as any).activeWorkflows;
      activeWorkflows.set('workflow-1', { startTime: new Date() });
      activeWorkflows.set('workflow-2', { startTime: new Date() });

      const stats = await orchestrator.getStats();

      expect(stats.activeWorkflows).toBe(2);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Mock console methods to avoid test output noise
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should handle workflow execution errors gracefully', async () => {
      const job: AgentJob = {
        id: 'error-job-1',
        type: 'orchestrate_workflow',
        priority: JobPriority.NORMAL,
        payload: {
          workflow: 'non-existent-workflow',
          parameters: {},
          priority: JobPriority.NORMAL
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await orchestrator.execute(job);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle database errors during orchestration storage', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ 
          error: { message: 'Database connection failed' } 
        })
      });

      const job: AgentJob = {
        id: 'db-error-job',
        type: 'orchestrate_workflow',
        priority: JobPriority.NORMAL,
        payload: vehicleScrapingRequest,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await orchestrator.execute(job);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to store orchestration');
    });

    it('should handle message handling errors gracefully', async () => {
      const badMessage = {
        message: {
          type: 'orchestrate_workflow',
          payload: null // Invalid payload
        }
      };

      // Should not throw error
      await expect(
        (orchestrator as any).handleDirectMessage(badMessage)
      ).resolves.toBeUndefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent orchestration requests', async () => {
      const jobs = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-job-${i}`,
        type: 'schedule_job',
        priority: JobPriority.NORMAL,
        payload: vehicleScrapingRequest,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const results = await Promise.all(
        jobs.map(job => orchestrator.execute(job))
      );

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should maintain performance with large job queues', async () => {
      const startTime = performance.now();
      
      // Add many jobs to queue
      const jobs = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-job-${i}`,
        type: 'schedule_job',
        priority: JobPriority.NORMAL,
        payload: vehicleScrapingRequest,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await Promise.all(jobs.map(job => orchestrator.execute(job)));

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(executionTime).toBeLessThan(5000); // 5 seconds
    });
  });
});