import { http, HttpResponse } from 'msw';
import { AgentJobRecord, AgentMetricsRecord, JobStatus, JobPriority } from '../../agents/types/AgentTypes';

// Mock data for testing
const mockAgentJobs: AgentJobRecord[] = [
  {
    id: 'job-1',
    agent_id: 'agent-1',
    agent_type: 'orchestrator',
    job_type: 'test-job',
    status: JobStatus.COMPLETED,
    priority: JobPriority.NORMAL,
    payload: { test: 'data' },
    result: { success: true },
    retry_count: 0,
    max_retries: 3,
    started_at: new Date('2024-01-01T10:00:00Z'),
    completed_at: new Date('2024-01-01T10:01:00Z'),
    created_at: new Date('2024-01-01T09:59:00Z'),
    updated_at: new Date('2024-01-01T10:01:00Z')
  }
];

const mockAgentMetrics: AgentMetricsRecord[] = [
  {
    id: 'metrics-1',
    agent_id: 'agent-1',
    agent_type: 'orchestrator',
    total_jobs: 10,
    successful_jobs: 9,
    failed_jobs: 1,
    average_execution_time: 5000,
    last_job_time: new Date('2024-01-01T10:00:00Z'),
    memory_usage: 1024,
    error_rate: 0.1,
    uptime: 86400000,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z')
  }
];

const mockOrchestrations = [
  {
    id: 'orch-1',
    workflow_id: 'workflow-1',
    workflow_name: 'test-workflow',
    status: JobStatus.COMPLETED,
    parameters: { test: 'params' },
    result: { test: 'result' },
    steps: [],
    started_at: new Date('2024-01-01T10:00:00Z'),
    completed_at: new Date('2024-01-01T10:05:00Z'),
    total_execution_time: 300000,
    created_at: new Date('2024-01-01T09:59:00Z'),
    updated_at: new Date('2024-01-01T10:05:00Z')
  }
];

// Supabase API mocks
export const supabaseMocks = [
  // Agent jobs table
  http.get('*/rest/v1/agent_jobs', ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (id) {
      const job = mockAgentJobs.find(j => j.id === id);
      return HttpResponse.json(job ? [job] : [], { status: 200 });
    }
    
    return HttpResponse.json(mockAgentJobs, { status: 200 });
  }),

  http.post('*/rest/v1/agent_jobs', async ({ request }) => {
    const body = await request.json() as Partial<AgentJobRecord>;
    const newJob: AgentJobRecord = {
      id: `job-${Date.now()}`,
      agent_id: body.agent_id || 'test-agent',
      agent_type: body.agent_type || 'test',
      job_type: body.job_type || 'test',
      status: body.status || JobStatus.PENDING,
      priority: body.priority || JobPriority.NORMAL,
      payload: body.payload || {},
      retry_count: body.retry_count || 0,
      max_retries: body.max_retries || 3,
      created_at: new Date(),
      updated_at: new Date(),
      ...body
    };
    
    mockAgentJobs.push(newJob);
    return HttpResponse.json(newJob, { status: 201 });
  }),

  http.patch('*/rest/v1/agent_jobs', async ({ request }) => {
    const body = await request.json() as Partial<AgentJobRecord>;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (id) {
      const jobIndex = mockAgentJobs.findIndex(j => j.id === id);
      if (jobIndex !== -1) {
        mockAgentJobs[jobIndex] = { ...mockAgentJobs[jobIndex], ...body, updated_at: new Date() };
        return HttpResponse.json(mockAgentJobs[jobIndex], { status: 200 });
      }
    }
    
    return HttpResponse.json({ error: 'Job not found' }, { status: 404 });
  }),

  // Agent metrics table
  http.get('*/rest/v1/agent_metrics', ({ request }) => {
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agent_id');
    
    if (agentId) {
      const metrics = mockAgentMetrics.find(m => m.agent_id === agentId);
      return HttpResponse.json(metrics ? [metrics] : [], { status: 200 });
    }
    
    return HttpResponse.json(mockAgentMetrics, { status: 200 });
  }),

  http.post('*/rest/v1/agent_metrics', async ({ request }) => {
    const body = await request.json() as Partial<AgentMetricsRecord>;
    const newMetrics: AgentMetricsRecord = {
      id: `metrics-${Date.now()}`,
      agent_id: body.agent_id || 'test-agent',
      agent_type: body.agent_type || 'test',
      total_jobs: body.total_jobs || 0,
      successful_jobs: body.successful_jobs || 0,
      failed_jobs: body.failed_jobs || 0,
      average_execution_time: body.average_execution_time || 0,
      memory_usage: body.memory_usage || 0,
      error_rate: body.error_rate || 0,
      uptime: body.uptime || 0,
      created_at: new Date(),
      updated_at: new Date(),
      ...body
    };
    
    mockAgentMetrics.push(newMetrics);
    return HttpResponse.json(newMetrics, { status: 201 });
  }),

  // Agent orchestrations table
  http.get('*/rest/v1/agent_orchestrations', ({ request }) => {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get('workflow_id');
    
    if (workflowId) {
      const orchestration = mockOrchestrations.find(o => o.workflow_id === workflowId);
      return HttpResponse.json(orchestration ? [orchestration] : [], { status: 200 });
    }
    
    return HttpResponse.json(mockOrchestrations, { status: 200 });
  }),

  http.post('*/rest/v1/agent_orchestrations', async ({ request }) => {
    const body = await request.json();
    const newOrchestration = {
      id: `orch-${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date(),
      ...body
    };
    
    mockOrchestrations.push(newOrchestration);
    return HttpResponse.json(newOrchestration, { status: 201 });
  }),

  http.patch('*/rest/v1/agent_orchestrations', async ({ request }) => {
    const body = await request.json();
    const url = new URL(request.url);
    const workflowId = url.searchParams.get('workflow_id');
    
    if (workflowId) {
      const orchIndex = mockOrchestrations.findIndex(o => o.workflow_id === workflowId);
      if (orchIndex !== -1) {
        mockOrchestrations[orchIndex] = { 
          ...mockOrchestrations[orchIndex], 
          ...body, 
          updated_at: new Date() 
        };
        return HttpResponse.json(mockOrchestrations[orchIndex], { status: 200 });
      }
    }
    
    return HttpResponse.json({ error: 'Orchestration not found' }, { status: 404 });
  }),

  // Generic Supabase error responses for edge cases
  http.get('*/rest/v1/*', ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('force_error') === 'true') {
      return HttpResponse.json(
        { error: 'Test database error', code: 'TEST_ERROR' },
        { status: 500 }
      );
    }
    return HttpResponse.json([], { status: 200 });
  })
];