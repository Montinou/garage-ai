/**
 * Agent System Initialization and Management Utilities
 * Provides functions to initialize and manage the AI agents system
 */

import { config } from './config';
import { supabase, initializeSupabaseWithConfig } from './supabase';
import { AgentSystemConfig } from './config';

export interface SystemInitializationResult {
  success: boolean;
  configLoaded: boolean;
  databaseConnected: boolean;
  environmentValid: boolean;
  errors: string[];
  warnings: string[];
  systemConfig: AgentSystemConfig | null;
}

/**
 * Initialize the entire agent system
 */
export async function initializeAgentSystem(): Promise<SystemInitializationResult> {
  const result: SystemInitializationResult = {
    success: false,
    configLoaded: false,
    databaseConnected: false,
    environmentValid: false,
    errors: [],
    warnings: [],
    systemConfig: null
  };

  try {
    console.log('Starting agent system initialization...');

    // Step 1: Load and validate configuration
    try {
      await config.initialize();
      result.configLoaded = true;
      result.environmentValid = true;
      result.systemConfig = config.getAgentConfig();
      console.log('Configuration loaded successfully');
      
      // Log configuration summary
      const configSummary = config.getConfigSummary();
      console.log('Configuration summary:', configSummary);
      
    } catch (error) {
      result.errors.push(`Configuration initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Configuration initialization failed:', error);
    }

    // Step 2: Initialize Supabase with validated configuration
    try {
      await initializeSupabaseWithConfig();
      result.databaseConnected = await testDatabaseConnection();
      if (result.databaseConnected) {
        console.log('Database connection verified');
      } else {
        result.errors.push('Database connection test failed');
      }
    } catch (error) {
      result.errors.push(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Database initialization failed:', error);
    }

    // Step 3: Verify agent system tables exist
    try {
      await verifyAgentTables();
      console.log('Agent system tables verified');
    } catch (error) {
      result.warnings.push(`Agent tables verification failed: ${error instanceof Error ? error.message : String(error)}`);
      console.warn('Agent tables verification failed:', error);
    }

    // Step 4: Perform system health checks
    try {
      const healthStatus = await performSystemHealthChecks();
      if (!healthStatus.healthy) {
        result.warnings.push(`System health checks revealed issues: ${healthStatus.issues.join(', ')}`);
      }
    } catch (error) {
      result.warnings.push(`Health checks failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Determine overall success
    result.success = result.configLoaded && result.databaseConnected && result.errors.length === 0;

    console.log('Agent system initialization completed:', {
      success: result.success,
      errors: result.errors.length,
      warnings: result.warnings.length
    });

    return result;

  } catch (error) {
    result.errors.push(`System initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Agent system initialization failed:', error);
    return result;
  }
}

/**
 * Test database connection
 */
async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('agent_jobs')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Database connection test error:', error);
    return false;
  }
}

/**
 * Verify that all required agent system tables exist
 */
async function verifyAgentTables(): Promise<void> {
  const requiredTables = [
    'agent_jobs',
    'agent_memory', 
    'agent_metrics',
    'agent_messages',
    'agent_orchestrations'
  ];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        throw new Error(`Table ${table} is not accessible: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to verify table ${table}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Perform basic system health checks
 */
async function performSystemHealthChecks(): Promise<{
  healthy: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Check if we can write to database
    const testId = `health_check_${Date.now()}`;
    const { error: insertError } = await supabase
      .from('agent_messages')
      .insert({
        type: 'broadcast',
        from_agent: 'system',
        topic: 'health_check',
        payload: { test: true, timestamp: new Date() },
        expires_at: new Date(Date.now() + 60000) // Expire in 1 minute
      })
      .select()
      .single();

    if (insertError) {
      issues.push(`Database write test failed: ${insertError.message}`);
    } else {
      // Clean up test message
      await supabase
        .from('agent_messages')
        .delete()
        .eq('topic', 'health_check')
        .eq('from_agent', 'system');
    }

    // Check environment variables
    const envConfig = config.getEnvironment();
    if (!envConfig.BLOB_READ_WRITE_TOKEN) {
      issues.push('BLOB_READ_WRITE_TOKEN not configured');
    }
    if (!envConfig.GOOGLE_AI_API_KEY) {
      issues.push('GOOGLE_AI_API_KEY not configured');
    }

    // Check system resources
    const systemConfig = config.getAgentConfig();
    if (systemConfig.maxConcurrentJobs < 1) {
      issues.push('Invalid maxConcurrentJobs configuration');
    }

  } catch (error) {
    issues.push(`Health check error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    healthy: issues.length === 0,
    issues
  };
}

/**
 * Get system status and metrics
 */
export async function getSystemStatus(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  totalAgents: number;
  activeAgents: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
  lastUpdated: Date;
}> {
  try {
    // Get system statistics using the database function
    const { data: stats, error } = await supabase.rpc('get_agent_system_stats');
    
    if (error) {
      throw new Error(`Failed to get system stats: ${error.message}`);
    }

    const systemStats = stats?.[0] || {
      total_agents: 0,
      active_agents: 0,
      total_jobs: 0,
      completed_jobs: 0,
      failed_jobs: 0,
      pending_jobs: 0
    };

    // Determine system status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (systemStats.total_agents === 0) {
      status = 'degraded';
    } else {
      const activeRatio = systemStats.active_agents / systemStats.total_agents;
      const errorRate = systemStats.total_jobs > 0 ? 
        systemStats.failed_jobs / systemStats.total_jobs : 0;
      
      if (activeRatio < 0.5 || errorRate > 0.2) {
        status = 'degraded';
      }
      
      if (activeRatio < 0.1 || errorRate > 0.5) {
        status = 'unhealthy';
      }
    }

    return {
      status,
      uptime: process.uptime() * 1000, // Convert to milliseconds
      totalAgents: Number(systemStats.total_agents),
      activeAgents: Number(systemStats.active_agents),
      totalJobs: Number(systemStats.total_jobs),
      completedJobs: Number(systemStats.completed_jobs),
      failedJobs: Number(systemStats.failed_jobs),
      pendingJobs: Number(systemStats.pending_jobs),
      lastUpdated: new Date()
    };

  } catch (error) {
    console.error('Failed to get system status:', error);
    return {
      status: 'unhealthy',
      uptime: process.uptime() * 1000,
      totalAgents: 0,
      activeAgents: 0,
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      pendingJobs: 0,
      lastUpdated: new Date()
    };
  }
}

/**
 * Cleanup expired data (can be called periodically)
 */
export async function cleanupExpiredData(): Promise<{
  cleanedMemoryEntries: number;
  cleanedMessages: number;
  errors: string[];
}> {
  const result = {
    cleanedMemoryEntries: 0,
    cleanedMessages: 0,
    errors: []
  };

  try {
    // Cleanup expired memory entries
    const { data: memoryResult, error: memoryError } = await supabase.rpc('cleanup_expired_agent_memory');
    
    if (memoryError) {
      result.errors.push(`Memory cleanup failed: ${memoryError.message}`);
    } else {
      result.cleanedMemoryEntries = memoryResult || 0;
    }

    // Cleanup expired messages
    const { data: messagesResult, error: messagesError } = await supabase.rpc('cleanup_expired_agent_messages');
    
    if (messagesError) {
      result.errors.push(`Messages cleanup failed: ${messagesError.message}`);
    } else {
      result.cleanedMessages = messagesResult || 0;
    }

    console.log('Cleanup completed:', result);
    return result;

  } catch (error) {
    result.errors.push(`Cleanup error: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Cleanup failed:', error);
    return result;
  }
}

/**
 * Validate agent job payload
 */
export function validateJobPayload(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    errors.push('Payload must be an object');
    return { valid: false, errors };
  }

  // Add specific validation rules as needed
  // This is a basic validation - extend based on your requirements

  return {
    valid: errors.length === 0,
    errors
  };
}

// Export types for external use
export type { SystemInitializationResult };