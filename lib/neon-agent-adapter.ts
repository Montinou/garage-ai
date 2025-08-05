/**
 * Adapter for Agent System to use Neon Database
 * Replaces Supabase operations with Neon/Drizzle queries
 */

import { 
  createAgentJob, 
  updateAgentJob, 
  setAgentMemory, 
  getAgentMemory,
  recordAgentMetric,
  sendAgentMessage,
  getAgentMessages,
  markMessageProcessed,
  type NewAgentJob,
  type NewAgentMemory
} from './queries';

export class NeonAgentAdapter {
  /**
   * Register an agent (create a job entry for tracking)
   */
  static async registerAgent(
    agentId: string,
    agentType: string,
    status: string,
    config: any,
    startedAt: Date
  ) {
    const job: NewAgentJob = {
      agentId,
      agentType: agentType as any,
      jobType: 'agent_registration',
      status: 'running' as any,
      priority: 'normal',
      payload: { config, registeredAt: startedAt.toISOString() },
      startedAt
    };

    return await createAgentJob(job);
  }

  /**
   * Update agent status
   */
  static async updateAgentStatus(
    jobId: string,
    status: string,
    result?: any,
    errorMessage?: string
  ) {
    return await updateAgentJob(jobId, {
      status: status as any,
      result,
      errorMessage,
      completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
      updatedAt: new Date()
    });
  }

  /**
   * Store agent memory
   */
  static async storeMemory(
    agentId: string,
    agentType: string,
    key: string,
    value: any,
    tags?: any,
    expiresAt?: Date
  ) {
    const memory: NewAgentMemory = {
      agentId,
      agentType: agentType as any,
      key,
      value,
      tags,
      expiresAt
    };

    return await setAgentMemory(memory);
  }

  /**
   * Retrieve agent memory
   */
  static async retrieveMemory(agentId: string, key?: string) {
    return await getAgentMemory(agentId, key);
  }

  /**
   * Record agent metrics
   */
  static async recordMetric(
    agentId: string,
    agentType: string,
    metricName: string,
    value: number,
    unit?: string,
    metadata?: any
  ) {
    return await recordAgentMetric(agentId, agentType, metricName, value, unit, metadata);
  }

  /**
   * Send message between agents
   */
  static async sendMessage(
    fromAgentId: string,
    toAgentId: string | null,
    messageType: string,
    payload: any,
    topic?: string,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
    expiresAt?: Date
  ) {
    return await sendAgentMessage(
      fromAgentId,
      toAgentId,
      messageType,
      payload,
      topic,
      priority,
      expiresAt
    );
  }

  /**
   * Get messages for an agent
   */
  static async getMessages(
    agentId?: string,
    topic?: string,
    unprocessedOnly = false,
    limit = 50
  ) {
    return await getAgentMessages(agentId, topic, unprocessedOnly, limit);
  }

  /**
   * Mark message as processed
   */
  static async markMessageProcessed(messageId: string) {
    return await markMessageProcessed(messageId);
  }
}