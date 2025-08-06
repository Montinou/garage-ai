/**
 * Agent system types
 */

export interface AgentConfig {
  id: string;
  name: string;
  type: 'orchestrator' | 'explorer' | 'analyzer' | 'extractor' | 'validator';
  status: 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error' | 'paused';
  version?: string;
  description?: string;
  capabilities?: string[];
}

export interface AgentJob {
  id: string;
  agentId: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
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

export type AgentType = 'orchestrator' | 'explorer' | 'analyzer' | 'extractor' | 'validator';
export type AgentStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error' | 'paused';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

// Enum constants for runtime use
export const AGENT_TYPE = {
  ORCHESTRATOR: 'orchestrator' as const,
  EXPLORER: 'explorer' as const,
  ANALYZER: 'analyzer' as const,
  EXTRACTOR: 'extractor' as const,
  VALIDATOR: 'validator' as const,
} as const;

export const AGENT_STATUS = {
  IDLE: 'idle' as const,
  STARTING: 'starting' as const,
  RUNNING: 'running' as const,
  STOPPING: 'stopping' as const,
  STOPPED: 'stopped' as const,
  ERROR: 'error' as const,
  PAUSED: 'paused' as const,
} as const;

export const JOB_STATUS = {
  PENDING: 'pending' as const,
  RUNNING: 'running' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const,
  CANCELLED: 'cancelled' as const,
} as const;

export const JOB_PRIORITY = {
  LOW: 'low' as const,
  NORMAL: 'normal' as const,
  HIGH: 'high' as const,
  CRITICAL: 'critical' as const,
} as const;

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  totalAgents: number;
  activeJobs: number;
  memoryUsage: number;
  cpuUsage?: number;
  lastUpdate: Date;
}