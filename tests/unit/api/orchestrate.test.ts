import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/agents/orchestrate';
import { 
  OrchestrationRequest, 
  JobStatus, 
  JobPriority,
  ApiResponse,
  OrchestrationResult 
} from '../../../agents/types/AgentTypes';
import { mockSupabase, mockConfig } from '../../utils/test-utils';
import { 
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

// Mock setTimeout to speed up tests
vi.mock('global', () => ({
  setTimeout: (fn: Function, delay: number) => {
    if (delay > 100) {
      // For long delays (like workflow execution), execute immediately
      fn();
      return 1;
    }
    return global.setTimeout(fn, delay);
  }
}));

describe('/api/agents/orchestrate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    mockConfig.initialize.mockResolvedValue(undefined);
    
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: completedOrchestrationResult, 
            error: null 
          })
        })
      })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/agents/orchestrate', () => {
    it('should start orchestration successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: vehicleScrapingRequest
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(202);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse<OrchestrationResult>;
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Orchestration started successfully');
      expect(responseData.data).toMatchObject({
        workflowId: expect.any(String),
        status: JobStatus.PENDING,
        steps: expect.any(Array),
        startedAt: expect.any(String)
      });
      expect(responseData.requestId).toBeDefined();
    });

    it('should validate required workflow field', async () => {
      const invalidRequest = {
        ...vehicleScrapingRequest,
        workflow: undefined
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidRequest
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse;
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Workflow is required');
    });

    it('should validate parameters field', async () => {
      const invalidRequest = {
        ...vehicleScrapingRequest,
        parameters: null
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidRequest
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse;
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Parameters must be an object');
    });

    it('should validate priority field', async () => {
      const invalidRequest = {
        ...vehicleScrapingRequest,
        priority: 'invalid-priority' as any
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidRequest
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse;
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid priority value');
    });

    it('should reject unknown workflow', async () => {
      const unknownWorkflowRequest: OrchestrationRequest = {
        ...vehicleScrapingRequest,
        workflow: 'unknown-workflow'
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: unknownWorkflowRequest
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse;
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Unknown workflow: unknown-workflow');
    });

    it('should handle database errors during orchestration storage', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ 
          error: { message: 'Database connection failed' } 
        })
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: vehicleScrapingRequest
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse;
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Failed to store orchestration');
    });

    it('should handle config initialization failure', async () => {
      mockConfig.initialize.mockRejectedValue(new Error('Config initialization failed'));

      const { req, res } = createMocks({
        method: 'POST',
        body: vehicleScrapingRequest
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse;
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
    });

    it('should create steps correctly for vehicle-data-pipeline workflow', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: vehicleScrapingRequest
      });

      await handler(req, res);

      const responseData = JSON.parse(res._getData()) as ApiResponse<OrchestrationResult>;
      const steps = responseData.data!.steps;

      expect(steps).toHaveLength(4); // scrape, analyze, enrich, validate
      expect(steps[0]).toMatchObject({
        id: 'scrape',
        name: 'Scrape Vehicle Data',
        agentType: 'scraper',
        status: JobStatus.PENDING
      });
      expect(steps[1]).toMatchObject({
        id: 'analyze',
        name: 'Analyze Vehicle Data',
        agentType: 'analyzer',
        status: JobStatus.PENDING
      });
    });

    it('should create steps correctly for single-vehicle-analysis workflow', async () => {
      const singleAnalysisRequest: OrchestrationRequest = {
        workflow: 'single-vehicle-analysis',
        parameters: { vehicle_data: { make: 'Toyota', model: 'Camry' } },
        priority: JobPriority.NORMAL
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: singleAnalysisRequest
      });

      await handler(req, res);

      const responseData = JSON.parse(res._getData()) as ApiResponse<OrchestrationResult>;
      const steps = responseData.data!.steps;

      expect(steps).toHaveLength(1); // Only analyze step
      expect(steps[0]).toMatchObject({
        id: 'analyze',
        name: 'Analyze Vehicle',
        agentType: 'analyzer',
        status: JobStatus.PENDING
      });
    });

    it('should extract step inputs correctly', async () => {
      const requestWithComplexParams: OrchestrationRequest = {
        workflow: 'vehicle-data-pipeline',
        parameters: {
          sources: ['https://dealer1.com', 'https://dealer2.com'],
          filters: { make: 'Toyota', maxPrice: 30000 }
        },
        priority: JobPriority.NORMAL
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: requestWithComplexParams
      });

      await handler(req, res);

      const responseData = JSON.parse(res._getData()) as ApiResponse<OrchestrationResult>;
      const scrapeStep = responseData.data!.steps.find(s => s.id === 'scrape');

      expect(scrapeStep?.input).toMatchObject({
        sources: ['https://dealer1.com', 'https://dealer2.com'],
        filters: { make: 'Toyota', maxPrice: 30000 }
      });
    });
  });

  describe('GET /api/agents/orchestrate', () => {
    it('should get orchestration status successfully', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { workflowId: 'workflow-123' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse<OrchestrationResult>;
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        workflowId: expect.any(String),
        status: expect.any(String),
        steps: expect.any(Array)
      });
    });

    it('should validate workflowId parameter', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {} // Missing workflowId
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse;
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Missing or invalid workflowId parameter');
    });

    it('should handle non-existent orchestration', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Not found' } 
            })
          })
        })
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { workflowId: 'non-existent-workflow' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse;
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Orchestration not found');
    });

    it('should handle database errors when fetching orchestration', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { workflowId: 'workflow-123' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse;
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
    });

    it('should format orchestration result correctly', async () => {
      const mockOrchestration = {
        workflow_id: 'workflow-123',
        status: JobStatus.COMPLETED,
        steps: [
          {
            id: 'scrape',
            status: JobStatus.COMPLETED,
            output: { vehicles: [] }
          }
        ],
        result: { totalVehicles: 5 },
        error_message: null,
        started_at: '2024-01-01T10:00:00Z',
        completed_at: '2024-01-01T10:05:00Z',
        total_execution_time: 300000
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: mockOrchestration, 
              error: null 
            })
          })
        })
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { workflowId: 'workflow-123' }
      });

      await handler(req, res);

      const responseData = JSON.parse(res._getData()) as ApiResponse<OrchestrationResult>;
      
      expect(responseData.data).toMatchObject({
        workflowId: 'workflow-123',
        status: JobStatus.COMPLETED,
        steps: expect.any(Array),
        result: { totalVehicles: 5 },
        error: null,
        totalExecutionTime: 300000
      });
      
      expect(new Date(responseData.data!.startedAt as any)).toBeInstanceOf(Date);
      expect(new Date(responseData.data!.completedAt as any)).toBeInstanceOf(Date);
    });
  });

  describe('DELETE /api/agents/orchestrate', () => {
    it('should cancel orchestration successfully', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        query: { workflowId: 'workflow-123' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse;
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Orchestration cancelled successfully');
    });

    it('should validate workflowId parameter for cancellation', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        query: {} // Missing workflowId
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse;
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Missing or invalid workflowId parameter');
    });

    it('should handle database errors during cancellation', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ 
            error: { message: 'Update failed' } 
          })
        })
      });

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { workflowId: 'workflow-123' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse;
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Failed to cancel orchestration');
    });

    it('should update orchestration status to cancelled', async () => {
      const updateSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      
      mockSupabase.from.mockReturnValue({
        update: updateSpy
      });

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { workflowId: 'workflow-123' }
      });

      await handler(req, res);

      expect(updateSpy).toHaveBeenCalledWith({
        status: JobStatus.CANCELLED,
        completed_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      const methods = ['PUT', 'PATCH', 'HEAD', 'OPTIONS'];

      for (const method of methods) {
        const { req, res } = createMocks({ method });
        
        await handler(req, res);

        expect(res._getStatusCode()).toBe(405);
        
        const responseData = JSON.parse(res._getData()) as ApiResponse;
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('Method not allowed');
      }
    });
  });

  describe('Request Logging and Monitoring', () => {
    it('should log request details', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'user-agent': 'test-agent' },
        body: vehicleScrapingRequest
      });

      await handler(req, res);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Orchestration API POST request'),
        expect.objectContaining({
          requestId: expect.any(String),
          userAgent: 'test-agent'
        })
      );

      consoleSpy.mockRestore();
    });

    it('should include requestId in all responses', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: vehicleScrapingRequest
      });

      await handler(req, res);

      const responseData = JSON.parse(res._getData()) as ApiResponse;
      expect(responseData.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should log errors with context', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockConfig.initialize.mockRejectedValue(new Error('Test error'));

      const { req, res } = createMocks({
        method: 'POST',
        body: vehicleScrapingRequest
      });

      await handler(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Orchestration API error'),
        expect.objectContaining({
          requestId: expect.any(String),
          error: expect.objectContaining({
            message: 'Test error'
          })
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Workflow Execution', () => {
    it('should start workflow execution asynchronously', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: vehicleScrapingRequest
      });

      await handler(req, res);

      // Response should be immediate (202 Accepted)
      expect(res._getStatusCode()).toBe(202);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse<OrchestrationResult>;
      expect(responseData.data!.status).toBe(JobStatus.PENDING);
    });

    it('should store orchestration in database before starting execution', async () => {
      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      
      mockSupabase.from.mockReturnValue({
        insert: insertSpy
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: vehicleScrapingRequest
      });

      await handler(req, res);

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow_id: expect.any(String),
          workflow_name: 'vehicle-data-pipeline',
          status: JobStatus.PENDING,
          parameters: vehicleScrapingRequest.parameters,
          steps: expect.any(Array)
        })
      );
    });

    it('should handle concurrent orchestration requests', async () => {
      const requests = Array.from({ length: 5 }, () => 
        createMocks({
          method: 'POST',
          body: vehicleScrapingRequest
        })
      );

      const responses = await Promise.all(
        requests.map(({ req, res }) => handler(req, res).then(() => res))
      );

      responses.forEach(res => {
        expect(res._getStatusCode()).toBe(202);
        
        const responseData = JSON.parse(res._getData()) as ApiResponse<OrchestrationResult>;
        expect(responseData.success).toBe(true);
        expect(responseData.data!.workflowId).toBeDefined();
      });

      // All workflow IDs should be unique
      const workflowIds = responses.map(res => {
        const data = JSON.parse(res._getData()) as ApiResponse<OrchestrationResult>;
        return data.data!.workflowId;
      });
      
      const uniqueIds = new Set(workflowIds);
      expect(uniqueIds.size).toBe(5);
    });
  });

  describe('Input Sanitization and Security', () => {
    it('should handle malicious input in workflow name', async () => {
      const maliciousRequest = {
        workflow: '<script>alert("xss")</script>',
        parameters: {},
        priority: JobPriority.NORMAL
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: maliciousRequest
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse;
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Unknown workflow');
    });

    it('should handle large payload gracefully', async () => {
      const largeParameters = {
        data: 'x'.repeat(10000), // 10KB string
        array: Array(1000).fill({ key: 'value' })
      };

      const largeRequest: OrchestrationRequest = {
        workflow: 'vehicle-data-pipeline',
        parameters: largeParameters,
        priority: JobPriority.NORMAL
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: largeRequest
      });

      await handler(req, res);

      // Should handle large payload without errors
      expect(res._getStatusCode()).toBe(202);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse<OrchestrationResult>;
      expect(responseData.success).toBe(true);
    });

    it('should validate deeply nested objects in parameters', async () => {
      const deeplyNestedRequest: OrchestrationRequest = {
        workflow: 'vehicle-data-pipeline',
        parameters: {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: 'deep value'
                }
              }
            }
          }
        },
        priority: JobPriority.NORMAL
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: deeplyNestedRequest
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(202);
      
      const responseData = JSON.parse(res._getData()) as ApiResponse<OrchestrationResult>;
      expect(responseData.success).toBe(true);
    });
  });
});