/**
 * Agent status monitoring API endpoint
 * Provides real-time status information for all agents and system health
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { config } from '../../../lib/config';
import { 
  AgentStatus,
  AgentType,
  SystemHealth,
  SystemMetrics,
  AgentMetrics,
  HealthCheck,
  ApiResponse,
  PaginatedApiResponse
} from '../../../agents/types/AgentTypes';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any> | PaginatedApiResponse<any>>
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Initialize configuration
    await config.initialize();
    
    console.log(`Status API ${req.method} request`, {
      requestId,
      query: req.query,
      timestamp: new Date().toISOString()
    });
    
    if (req.method === 'GET') {
      const { type, agentId, health } = req.query;
      
      if (health === 'true') {
        await handleSystemHealthCheck(req, res, requestId);
      } else if (agentId && typeof agentId === 'string') {
        await handleGetAgentStatus(req, res, requestId, agentId);
      } else if (type) {
        await handleGetAgentsByType(req, res, requestId, type as string);
      } else {
        await handleGetAllAgents(req, res, requestId);
      }
    } else {
      res.status(405).json({
        success: false,
        error: 'Method not allowed',
        timestamp: new Date(),
        requestId
      });
    }
  } catch (error) {
    console.error('Status API error:', {
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      method: req.method,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date(),
      requestId
    });
  }
}

/**
 * Handle system health check
 */
async function handleSystemHealthCheck(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<SystemHealth>>,
  requestId: string
): Promise<void> {
  try {
    const systemHealth = await performSystemHealthCheck();
    
    const statusCode = systemHealth.overall ? 200 : 503;
    
    res.status(statusCode).json({
      success: systemHealth.overall,
      data: systemHealth,
      message: systemHealth.overall ? 'System is healthy' : 'System health issues detected',
      timestamp: new Date(),
      requestId
    });
  } catch (error) {
    console.error('System health check error:', error);
    throw error;
  }
}

/**
 * Handle get specific agent status
 */
async function handleGetAgentStatus(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>,
  requestId: string,
  agentId: string
): Promise<void> {
  try {
    // Get agent job record
    const { data: agentJob, error: jobError } = await supabase
      .from('agent_jobs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (jobError || !agentJob) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
        timestamp: new Date(),
        requestId
      });
      return;
    }

    // Get agent metrics
    const { data: metrics } = await supabase
      .from('agent_metrics')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    // Get recent jobs for this agent
    const { data: recentJobs } = await supabase
      .from('agent_jobs')
      .select('id, job_type, status, created_at, completed_at, error_message')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(10);

    const agentStatus = {
      agentId: agentJob.agent_id,
      agentType: agentJob.agent_type as AgentType,
      status: agentJob.status as AgentStatus,
      lastSeen: new Date(agentJob.updated_at),
      uptime: metrics ? metrics.uptime : 0,
      config: agentJob.config,
      metrics: metrics ? {
        totalJobs: metrics.total_jobs,
        successfulJobs: metrics.successful_jobs,
        failedJobs: metrics.failed_jobs,
        averageExecutionTime: metrics.average_execution_time,
        errorRate: metrics.error_rate,
        memoryUsage: metrics.memory_usage,
        lastJobTime: metrics.last_job_time ? new Date(metrics.last_job_time) : null
      } : null,
      recentJobs: recentJobs || []
    };

    res.status(200).json({
      success: true,
      data: agentStatus,
      timestamp: new Date(),
      requestId
    });
  } catch (error) {
    console.error('Get agent status error:', error);
    throw error;
  }
}

/**
 * Handle get agents by type
 */
async function handleGetAgentsByType(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedApiResponse<any>>,
  requestId: string,
  agentType: string
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Get agents of specific type
    const { data: agents, error: agentsError, count } = await supabase
      .from('agent_jobs')
      .select(`
        agent_id,
        agent_type,
        status,
        config,
        started_at,
        updated_at
      `, { count: 'exact' })
      .eq('agent_type', agentType)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (agentsError) {
      throw new Error(`Failed to fetch agents: ${agentsError.message}`);
    }

    // Get metrics for these agents
    const agentIds = agents?.map(agent => agent.agent_id) || [];
    const { data: allMetrics } = await supabase
      .from('agent_metrics')
      .select('*')
      .in('agent_id', agentIds);

    const metricsMap = new Map(
      allMetrics?.map(metric => [metric.agent_id, metric]) || []
    );

    const agentStatuses = agents?.map(agent => ({
      agentId: agent.agent_id,
      agentType: agent.agent_type as AgentType,
      status: agent.status as AgentStatus,
      lastSeen: new Date(agent.updated_at),
      startedAt: new Date(agent.started_at),
      config: agent.config,
      metrics: metricsMap.get(agent.agent_id) ? transformMetrics(metricsMap.get(agent.agent_id)!) : null
    })) || [];

    const totalPages = Math.ceil((count || 0) / limit);

    res.status(200).json({
      success: true,
      data: agentStatuses,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      timestamp: new Date(),
      requestId
    });
  } catch (error) {
    console.error('Get agents by type error:', error);
    throw error;
  }
}

/**
 * Handle get all agents
 */
async function handleGetAllAgents(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedApiResponse<any>>,
  requestId: string
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status as AgentStatus;

    let query = supabase
      .from('agent_jobs')
      .select(`
        agent_id,
        agent_type,
        status,
        config,
        started_at,
        updated_at
      `, { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: agents, error: agentsError, count } = await query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (agentsError) {
      throw new Error(`Failed to fetch agents: ${agentsError.message}`);
    }

    // Get metrics for these agents
    const agentIds = agents?.map(agent => agent.agent_id) || [];
    const { data: allMetrics } = await supabase
      .from('agent_metrics')
      .select('*')
      .in('agent_id', agentIds);

    const metricsMap = new Map(
      allMetrics?.map(metric => [metric.agent_id, metric]) || []
    );

    const agentStatuses = agents?.map(agent => ({
      agentId: agent.agent_id,
      agentType: agent.agent_type as AgentType,
      status: agent.status as AgentStatus,
      lastSeen: new Date(agent.updated_at),
      startedAt: new Date(agent.started_at),
      config: agent.config,
      metrics: metricsMap.get(agent.agent_id) ? transformMetrics(metricsMap.get(agent.agent_id)!) : null
    })) || [];

    const totalPages = Math.ceil((count || 0) / limit);

    res.status(200).json({
      success: true,
      data: agentStatuses,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      timestamp: new Date(),
      requestId
    });
  } catch (error) {
    console.error('Get all agents error:', error);
    throw error;
  }
}

/**
 * Perform comprehensive system health check
 */
async function performSystemHealthCheck(): Promise<SystemHealth> {
  const healthChecks: HealthCheck[] = [];
  
  try {
    // Database health check
    const dbHealth = await checkDatabaseHealth();
    healthChecks.push(dbHealth);

    // Agent system health check
    const agentHealth = await checkAgentSystemHealth();
    healthChecks.push(agentHealth);

    // Message bus health check (simulated)
    const messageBusHealth = await checkMessageBusHealth();
    healthChecks.push(messageBusHealth);

    // Memory system health check (simulated)
    const memoryHealth = await checkMemorySystemHealth();
    healthChecks.push(memoryHealth);

    const overallHealth = healthChecks.every(check => check.healthy);

    return {
      overall: overallHealth,
      components: {
        database: dbHealth,
        messagebus: messageBusHealth,
        memory: memoryHealth,
        agents: healthChecks.filter(check => check.details.component.startsWith('Agent'))
      },
      timestamp: new Date()
    };
  } catch (error) {
    return {
      overall: false,
      components: {
        database: {
          healthy: false,
          details: {
            component: 'Database',
            status: 'error',
            lastCheck: new Date(),
            error: error instanceof Error ? error.message : String(error)
          }
        },
        messagebus: {
          healthy: false,
          details: {
            component: 'MessageBus',
            status: 'unknown',
            lastCheck: new Date()
          }
        },
        memory: {
          healthy: false,
          details: {
            component: 'Memory',
            status: 'unknown',
            lastCheck: new Date()
          }
        },
        agents: []
      },
      timestamp: new Date()
    };
  }
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<HealthCheck> {
  try {
    // Test basic connectivity
    const { data, error } = await supabase
      .from('agent_jobs')
      .select('count(*)', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Get some basic metrics
    const { data: jobsData } = await supabase
      .from('agent_jobs')
      .select('status')
      .limit(1000);

    const activeJobs = jobsData?.filter(job => 
      job.status === 'running' || job.status === 'pending'
    ).length || 0;

    return {
      healthy: true,
      details: {
        component: 'Database',
        status: 'healthy',
        lastCheck: new Date(),
        metrics: {
          totalJobs: data?.[0]?.count || 0,
          activeJobs,
          responseTime: 'fast' // TODO: Implement actual timing
        }
      }
    };
  } catch (error) {
    return {
      healthy: false,
      details: {
        component: 'Database',
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Check agent system health
 */
async function checkAgentSystemHealth(): Promise<HealthCheck> {
  try {
    // Get agent statistics
    const { data: agents } = await supabase
      .from('agent_jobs')
      .select('agent_type, status, updated_at')
      .gte('updated_at', new Date(Date.now() - 300000).toISOString()); // Last 5 minutes

    const agentStats = {
      totalAgents: agents?.length || 0,
      activeAgents: agents?.filter(agent => 
        agent.status === 'idle' || agent.status === 'busy'
      ).length || 0,
      errorAgents: agents?.filter(agent => agent.status === 'error').length || 0,
      stoppedAgents: agents?.filter(agent => agent.status === 'stopped').length || 0
    };

    const healthyThreshold = 0.8; // 80% of agents should be healthy
    const healthRatio = agentStats.totalAgents > 0 ? 
      agentStats.activeAgents / agentStats.totalAgents : 1;

    return {
      healthy: healthRatio >= healthyThreshold,
      details: {
        component: 'AgentSystem',
        status: healthRatio >= healthyThreshold ? 'healthy' : 'degraded',
        lastCheck: new Date(),
        metrics: agentStats
      }
    };
  } catch (error) {
    return {
      healthy: false,
      details: {
        component: 'AgentSystem',
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Check message bus health (simulated)
 */
async function checkMessageBusHealth(): Promise<HealthCheck> {
  try {
    // Check if message table exists and is accessible
    const { data, error } = await supabase
      .from('agent_messages')
      .select('count(*)', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Message bus check failed: ${error.message}`);
    }

    return {
      healthy: true,
      details: {
        component: 'MessageBus',
        status: 'healthy',
        lastCheck: new Date(),
        metrics: {
          totalMessages: data?.[0]?.count || 0
        }
      }
    };
  } catch (error) {
    return {
      healthy: false,
      details: {
        component: 'MessageBus',
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Check memory system health (simulated)
 */
async function checkMemorySystemHealth(): Promise<HealthCheck> {
  try {
    // Check if memory table exists and is accessible
    const { data, error } = await supabase
      .from('agent_memory')
      .select('count(*)', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Memory system check failed: ${error.message}`);
    }

    return {
      healthy: true,
      details: {
        component: 'MemorySystem',
        status: 'healthy',
        lastCheck: new Date(),
        metrics: {
          totalEntries: data?.[0]?.count || 0
        }
      }
    };
  } catch (error) {
    return {
      healthy: false,
      details: {
        component: 'MemorySystem',
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Transform database metrics to API format
 */
function transformMetrics(dbMetrics: any): AgentMetrics {
  return {
    agentId: dbMetrics.agent_id,
    totalJobs: dbMetrics.total_jobs,
    successfulJobs: dbMetrics.successful_jobs,
    failedJobs: dbMetrics.failed_jobs,
    averageExecutionTime: dbMetrics.average_execution_time,
    lastJobTime: dbMetrics.last_job_time ? new Date(dbMetrics.last_job_time) : null,
    memoryUsage: dbMetrics.memory_usage,
    errorRate: dbMetrics.error_rate,
    uptime: dbMetrics.uptime,
    createdAt: new Date(dbMetrics.created_at),
    updatedAt: new Date(dbMetrics.updated_at)
  };
}