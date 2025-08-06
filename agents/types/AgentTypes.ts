/**
 * Agent system types
 */

// Type definitions first
export type AgentType = 'orchestrator' | 'explorer' | 'analyzer' | 'extractor' | 'validator' | 'scraper' | 'enricher' | 'monitor';
export type AgentStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error' | 'paused' | 'busy' | 'initializing';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  version?: string;
  description?: string;
  capabilities?: string[];
}

export interface AgentJob {
  id: string;
  agentId: string;
  type: string;
  status: JobStatus;
  payload: any;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface AgentMetrics {
  id: string;
  agentId: string;
  metricName: string;
  metricValue: number;
  metricUnit?: string;
  recordedAt: Date;
}

export interface AgentMemory {
  id: string;
  agentId: string;
  key: string;
  value: any;
  tags?: string[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentOrchestration {
  id: string;
  orchestratorId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  config: any;
  progress?: any;
  result?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// Enum constants for runtime use
export const AGENT_TYPE = {
  ORCHESTRATOR: 'orchestrator' as const,
  EXPLORER: 'explorer' as const,
  ANALYZER: 'analyzer' as const,
  EXTRACTOR: 'extractor' as const,
  VALIDATOR: 'validator' as const,
  SCRAPER: 'scraper' as const,
  ENRICHER: 'enricher' as const,
  MONITOR: 'monitor' as const,
} as const;

export const AGENT_STATUS = {
  IDLE: 'idle' as const,
  STARTING: 'starting' as const,
  RUNNING: 'running' as const,
  STOPPING: 'stopping' as const,
  STOPPED: 'stopped' as const,
  ERROR: 'error' as const,
  PAUSED: 'paused' as const,
  BUSY: 'busy' as const,
  INITIALIZING: 'initializing' as const,
} as const;

export const JOB_STATUS = {
  PENDING: 'pending' as const,
  RUNNING: 'running' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const,
  CANCELLED: 'cancelled' as const,
  RETRYING: 'retrying' as const,
} as const;

export const JOB_PRIORITY = {
  LOW: 'low' as const,
  NORMAL: 'normal' as const,
  HIGH: 'high' as const,
  CRITICAL: 'critical' as const,
} as const;

// Export enum objects for direct usage in components
export const AgentType = AGENT_TYPE;
export const AgentStatus = AGENT_STATUS;
export const JobStatus = JOB_STATUS;
export const JobPriority = JOB_PRIORITY;

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  totalAgents: number;
  activeJobs: number;
  memoryUsage: number;
  cpuUsage?: number;
  lastUpdate: Date;
}