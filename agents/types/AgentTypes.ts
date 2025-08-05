/**
 * TypeScript interfaces and types for the AI agents system
 * Provides comprehensive type definitions for all agent-related functionality
 */

// Core Agent Enums
export enum AgentStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  ERROR = 'error',
  STOPPED = 'stopped',
  INITIALIZING = 'initializing'
}

export enum AgentType {
  SCRAPER = 'scraper',
  ANALYZER = 'analyzer',
  ENRICHER = 'enricher',
  VALIDATOR = 'validator',
  ORCHESTRATOR = 'orchestrator',
  MONITOR = 'monitor'
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}

export enum JobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum MessageType {
  TASK = 'task',
  STATUS = 'status',
  ERROR = 'error',
  BROADCAST = 'broadcast',
  DIRECT = 'direct'
}

// Agent Configuration Interface
export interface AgentConfig {
  maxRetries?: number;
  timeout?: number;
  concurrency?: number;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  customSettings?: Record<string, any>;
}

// Job Interfaces
export interface AgentJob {
  id: string;
  type: string;
  priority: JobPriority;
  payload: any;
  requirements?: {
    agentType?: AgentType;
    agentId?: string;
    capabilities?: string[];
    resources?: Record<string, any>;
  };
  constraints?: {
    maxExecutionTime?: number;
    maxRetries?: number;
    dependencies?: string[];
    scheduledAt?: Date;
    expiresAt?: Date;
  };
  metadata?: {
    source?: string;
    tags?: string[];
    userId?: string;
    sessionId?: string;
    correlationId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentJobUpdate {
  id: string;
  status: JobStatus;
  progress?: number;
  result?: any;
  error?: string;
  updatedAt: Date;
}

// Agent Result Interface
export interface AgentResult {
  success: boolean;
  data: any;
  error?: string;
  warnings?: string[];
  executionTime: number;
  agentId: string;
  metadata?: {
    resourcesUsed?: Record<string, any>;
    performanceMetrics?: Record<string, number>;
    intermediateResults?: any[];
  };
}

// Message Interfaces
export interface AgentMessage {
  id: string;
  type: MessageType;
  from: string;
  to?: string;
  topic: string;
  payload: any;
  priority: JobPriority;
  timestamp: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface MessageHandler {
  (message: AgentMessage): Promise<void>;
}

export interface MessageSubscription {
  topic: string;
  handler: MessageHandler;
  options?: {
    persistent?: boolean;
    autoAck?: boolean;
    maxRetries?: number;
  };
}

// Memory Interfaces
export interface MemoryEntry {
  key: string;
  value: any;
  type: 'string' | 'object' | 'array' | 'number' | 'boolean';
  ttl?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

export interface MemoryQuery {
  keys?: string[];
  tags?: string[];
  type?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface MemoryStats {
  totalEntries: number;
  memoryUsage: number;
  hitRate: number;
  missRate: number;
  averageAccessTime: number;
}

// Metrics Interfaces
export interface AgentMetrics {
  agentId: string;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averageExecutionTime: number;
  lastJobTime: Date | null;
  memoryUsage: number;
  errorRate: number;
  uptime: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemMetrics {
  totalAgents: number;
  activeAgents: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageJobTime: number;
  systemUptime: number;
  memoryUsage: number;
  cpuUsage?: number;
  networkLatency?: number;
  timestamp: Date;
}

// Orchestration Interfaces
export interface OrchestrationRequest {
  workflow: string;
  parameters: Record<string, any>;
  priority: JobPriority;
  constraints?: {
    maxExecutionTime?: number;
    requiredAgents?: string[];
    parallelExecution?: boolean;
  };
  callbacks?: {
    onProgress?: string;
    onComplete?: string;
    onError?: string;
  };
  metadata?: Record<string, any>;
}

export interface OrchestrationResult {
  workflowId: string;
  status: JobStatus;
  steps: OrchestrationStep[];
  result?: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  totalExecutionTime?: number;
}

export interface OrchestrationStep {
  id: string;
  name: string;
  agentType: AgentType;
  agentId?: string;
  status: JobStatus;
  input: any;
  output?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  executionTime?: number;
  retryCount: number;
}

// Database Schema Interfaces
export interface AgentJobRecord {
  id: string;
  agent_id: string;
  agent_type: string;
  job_type: string;
  status: JobStatus;
  priority: JobPriority;
  payload: any;
  result?: any;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  scheduled_at?: Date;
  started_at?: Date;
  completed_at?: Date;
  failed_at?: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
  metadata?: any;
}

export interface AgentMemoryRecord {
  id: string;
  agent_id: string;
  memory_key: string;
  memory_value: any;
  memory_type: string;
  ttl?: number;
  tags?: string[];
  access_count: number;
  last_accessed: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AgentMetricsRecord {
  id: string;
  agent_id: string;
  agent_type: string;
  total_jobs: number;
  successful_jobs: number;
  failed_jobs: number;
  average_execution_time: number;
  last_job_time?: Date;
  memory_usage: number;
  error_rate: number;
  uptime: number;
  created_at: Date;
  updated_at: Date;
}

// Health Check Interfaces
export interface HealthCheck {
  healthy: boolean;
  details: {
    component: string;
    status: string;
    lastCheck: Date;
    error?: string;
    metrics?: Record<string, any>;
  };
}

export interface SystemHealth {
  overall: boolean;
  components: {
    database: HealthCheck;
    messagebus: HealthCheck;
    memory: HealthCheck;
    agents: HealthCheck[];
  };
  timestamp: Date;
}

// API Response Interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  requestId?: string;
}

export interface PaginatedApiResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Validation Interfaces
export interface ValidationRule {
  field: string;
  type: 'required' | 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'date';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean | string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value: any;
  }>;
}

// Event Interfaces
export interface AgentEvent {
  id: string;
  type: string;
  agentId: string;
  agentType: AgentType;
  data: any;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface EventSubscription {
  eventType: string;
  handler: (event: AgentEvent) => Promise<void>;
  filters?: Record<string, any>;
}

// Capability Interfaces
export interface AgentCapability {
  name: string;
  version: string;
  description: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  requirements: string[];
  performance: {
    averageExecutionTime: number;
    successRate: number;
    resourceUsage: Record<string, number>;
  };
}

export interface CapabilityRegistry {
  [agentType: string]: {
    [capabilityName: string]: AgentCapability;
  };
}

// Workflow Interfaces
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: WorkflowStep[];
  errorHandling: {
    retryStrategy: 'none' | 'fixed' | 'exponential';
    maxRetries: number;
    continueOnError: boolean;
  };
  timeout: number;
  tags: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'agent' | 'condition' | 'parallel' | 'sequential';
  agentType?: AgentType;
  condition?: string;
  inputs: Record<string, any>;
  outputs: string[];
  dependencies: string[];
  optional: boolean;
  timeout?: number;
}

// Export all types for easy importing
export type {
  AgentConfig,
  AgentJob,
  AgentJobUpdate,
  AgentResult,
  AgentMessage,
  MessageHandler,
  MessageSubscription,
  MemoryEntry,
  MemoryQuery,
  MemoryStats,
  AgentMetrics,
  SystemMetrics,
  OrchestrationRequest,
  OrchestrationResult,
  OrchestrationStep,
  AgentJobRecord,
  AgentMemoryRecord,
  AgentMetricsRecord,
  HealthCheck,
  SystemHealth,
  ApiResponse,
  PaginatedApiResponse,
  ValidationRule,
  ValidationResult,
  AgentEvent,
  EventSubscription,
  AgentCapability,
  CapabilityRegistry,
  WorkflowDefinition,
  WorkflowStep
};