import { http, HttpResponse } from 'msw';
import { OrchestrationResult, JobStatus, JobPriority } from '../../agents/types/AgentTypes';

// Mock responses for agent API endpoints
export const agentApiMocks = [
  // POST /api/agents/orchestrate - Start orchestration
  http.post('*/api/agents/orchestrate', async ({ request }) => {
    const body = await request.json();
    
    // Simulate validation errors
    if (!body.workflow) {
      return HttpResponse.json({
        success: false,
        error: 'Invalid request: Workflow is required',
        timestamp: new Date()
      }, { status: 400 });
    }

    // Simulate unknown workflow error
    if (body.workflow === 'unknown-workflow') {
      return HttpResponse.json({
        success: false,
        error: 'Unknown workflow: unknown-workflow',
        timestamp: new Date()
      }, { status: 400 });
    }

    // Simulate database error
    if (body.workflow === 'error-workflow') {
      return HttpResponse.json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      }, { status: 500 });
    }

    // Success response
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockResult: OrchestrationResult = {
      workflowId,
      status: JobStatus.PENDING,
      steps: [
        {
          id: 'scrape',
          name: 'Scrape Vehicle Data',
          agentType: 'scraper' as any,
          status: JobStatus.PENDING,
          input: body.parameters || {},
          retryCount: 0
        }
      ],
      startedAt: new Date()
    };

    return HttpResponse.json({
      success: true,
      data: mockResult,
      message: 'Orchestration started successfully',
      timestamp: new Date()
    }, { status: 202 });
  }),

  // GET /api/agents/orchestrate - Get orchestration status
  http.get('*/api/agents/orchestrate', ({ request }) => {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get('workflowId');

    if (!workflowId) {
      return HttpResponse.json({
        success: false,
        error: 'Missing or invalid workflowId parameter',
        timestamp: new Date()
      }, { status: 400 });
    }

    if (workflowId === 'not-found') {
      return HttpResponse.json({
        success: false,
        error: 'Orchestration not found',
        timestamp: new Date()
      }, { status: 404 });
    }

    // Mock completed orchestration
    const mockResult: OrchestrationResult = {
      workflowId,
      status: JobStatus.COMPLETED,
      steps: [
        {
          id: 'scrape',
          name: 'Scrape Vehicle Data',
          agentType: 'scraper' as any,
          status: JobStatus.COMPLETED,
          input: { test: 'data' },
          output: { scraped: 'data' },
          retryCount: 0,
          startedAt: new Date(Date.now() - 60000),
          completedAt: new Date(),
          executionTime: 60000
        }
      ],
      result: { scraped: 'data' },
      startedAt: new Date(Date.now() - 60000),
      completedAt: new Date(),
      totalExecutionTime: 60000
    };

    return HttpResponse.json({
      success: true,
      data: mockResult,
      timestamp: new Date()
    }, { status: 200 });
  }),

  // DELETE /api/agents/orchestrate - Cancel orchestration
  http.delete('*/api/agents/orchestrate', ({ request }) => {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get('workflowId');

    if (!workflowId) {
      return HttpResponse.json({
        success: false,
        error: 'Missing or invalid workflowId parameter',
        timestamp: new Date()
      }, { status: 400 });
    }

    if (workflowId === 'not-found') {
      return HttpResponse.json({
        success: false,
        error: 'Workflow not found',
        timestamp: new Date()
      }, { status: 404 });
    }

    return HttpResponse.json({
      success: true,
      message: 'Orchestration cancelled successfully',
      timestamp: new Date()
    }, { status: 200 });
  }),

  // GET /api/agents/status - Get agent status
  http.get('*/api/agents/status', () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalAgents: 5,
        healthyAgents: 4,
        activeWorkflows: 2,
        queuedJobs: 3,
        agents: [
          {
            agentType: 'orchestrator',
            healthStatus: 'healthy',
            currentLoad: 2,
            maxLoad: 10,
            averageResponseTime: 150,
            capabilities: ['workflow_management', 'job_scheduling']
          },
          {
            agentType: 'scraper',
            healthStatus: 'healthy',
            currentLoad: 1,
            maxLoad: 5,
            averageResponseTime: 2500,
            capabilities: ['web_scraping', 'data_extraction']
          }
        ]
      },
      timestamp: new Date()
    }, { status: 200 });
  }),

  // GET /api/agents/memory - Get memory status
  http.get('*/api/agents/memory', () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalEntries: 150,
        memoryUsage: 2048,
        hitRate: 0.85,
        missRate: 0.15,
        averageAccessTime: 5
      },
      timestamp: new Date()
    }, { status: 200 });
  }),

  // POST /api/agents/memory - Store memory
  http.post('*/api/agents/memory', async ({ request }) => {
    const body = await request.json();
    
    return HttpResponse.json({
      success: true,
      data: {
        key: body.key,
        stored: true
      },
      timestamp: new Date()
    }, { status: 201 });
  })
];