import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { ThemeProvider } from '../../components/theme-provider';

// Mock implementations for external dependencies
export const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      order: vi.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
};

// Mock config
export const mockConfig = {
  initialize: vi.fn(() => Promise.resolve()),
  getAgentConfig: vi.fn(() => ({
    maxRetries: 3,
    defaultJobTimeout: 300000,
    enableLogging: true,
    enableMetrics: true
  }))
};

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Test data factories
export const createMockAgentJob = (overrides = {}) => ({
  id: `job-${Date.now()}`,
  type: 'test-job',
  priority: 'normal' as const,
  payload: { test: 'data' },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockAgentResult = (overrides = {}) => ({
  success: true,
  data: { result: 'test' },
  executionTime: 1000,
  agentId: 'test-agent',
  ...overrides
});

export const createMockOrchestrationRequest = (overrides = {}) => ({
  workflow: 'vehicle-data-pipeline',
  parameters: { url: 'https://example.com' },
  priority: 'normal' as const,
  ...overrides
});

// Mock MessageBus
export class MockMessageBus {
  private handlers = new Map<string, Function[]>();

  async subscribe(topic: string, handler: Function): Promise<void> {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, []);
    }
    this.handlers.get(topic)!.push(handler);
  }

  async publish(topic: string, message: any): Promise<void> {
    const handlers = this.handlers.get(topic) || [];
    for (const handler of handlers) {
      await handler({ payload: message });
    }
  }

  async unsubscribeAll(): Promise<void> {
    this.handlers.clear();
  }

  async healthCheck(): Promise<{ healthy: boolean }> {
    return { healthy: true };
  }
}

// Mock SharedMemory
export class MockSharedMemory {
  private store = new Map<string, any>();

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.store.set(key, value);
  }

  async get(key: string): Promise<any> {
    return this.store.get(key);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async cleanup(): Promise<void> {
    this.store.clear();
  }

  async healthCheck(): Promise<{ healthy: boolean }> {
    return { healthy: true };
  }
}

// Utility to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock timers helper
export const useFakeTimers = () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
};

// Database test helpers
export const mockDatabaseError = (tableName: string, operation: string) => {
  const error = new Error(`Database error: ${operation} failed on ${tableName}`);
  (error as any).code = 'DB_ERROR';
  return error;
};

// Network test helpers  
export const mockNetworkError = () => {
  const error = new Error('Network request failed');
  (error as any).code = 'NETWORK_ERROR';
  return error;
};

// Agent test helpers
export const createMockAgent = (agentType: string, overrides = {}) => ({
  agentId: `${agentType}-${Date.now()}`,
  agentType,
  status: 'idle',
  config: {
    maxRetries: 3,
    timeout: 30000,
    enableLogging: true,
    enableMetrics: true
  },
  metrics: {
    totalJobs: 0,
    successfulJobs: 0,
    failedJobs: 0,
    averageExecutionTime: 0,
    errorRate: 0,
    uptime: 0
  },
  ...overrides
});

// Security test helpers
export const createSqlInjectionPayload = () => ({
  maliciousInput: "'; DROP TABLE agent_jobs; --",
  xssPayload: '<script>alert("xss")</script>',
  pathTraversal: '../../../etc/passwd',
  commandInjection: '$(rm -rf /)'
});

// Performance test helpers
export const measureExecutionTime = async (fn: () => Promise<any>) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return {
    result,
    executionTime: end - start
  };
};