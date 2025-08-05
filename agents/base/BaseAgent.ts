/**
 * Base abstract class for all AI agents in the garage-ai system
 * Provides common functionality and interfaces that all agents must implement
 */

import { NeonAgentAdapter } from '../../lib/neon-agent-adapter';
import { config } from '../../lib/config';
import { AgentConfig, AgentStatus, AgentResult, AgentJob, AgentMetrics } from '../types/AgentTypes';
import { MessageBus } from '../communication/MessageBus';
import { SharedMemory } from '../memory/SharedMemory';

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected agentId: string;
  protected agentType: string;
  protected status: AgentStatus;
  protected messageBus: MessageBus;
  protected memory: SharedMemory;
  protected startTime: Date;
  protected metrics: AgentMetrics;

  constructor(agentType: string, agentConfig: AgentConfig = {}) {
    this.agentType = agentType;
    this.agentId = this.generateAgentId();
    
    // Merge with system configuration
    try {
      const systemConfig = config.getAgentConfig();
      this.config = {
        maxRetries: systemConfig.maxRetries,
        timeout: systemConfig.defaultJobTimeout,
        concurrency: 1,
        enableLogging: systemConfig.enableLogging,
        enableMetrics: systemConfig.enableMetrics,
        ...agentConfig
      };
    } catch (error) {
      // Fallback to defaults if config not initialized
      this.config = {
        maxRetries: 3,
        timeout: 300000,
        concurrency: 1,
        enableLogging: true,
        enableMetrics: true,
        ...agentConfig
      };
    }
    
    this.status = AgentStatus.INITIALIZING;
    this.startTime = new Date();
    this.messageBus = new MessageBus(this.agentId);
    this.memory = new SharedMemory(this.agentId);
    this.metrics = this.initializeMetrics();
    
    // Initialize asynchronously
    this.initialize().catch(error => {
      this.logError('Agent initialization failed', error);
      this.status = AgentStatus.ERROR;
    });
  }

  /**
   * Generate unique agent ID
   */
  private generateAgentId(): string {
    return `${this.agentType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize agent metrics
   */
  private initializeMetrics(): AgentMetrics {
    return {
      agentId: this.agentId,
      totalJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
      averageExecutionTime: 0,
      lastJobTime: null,
      memoryUsage: 0,
      errorRate: 0,
      uptime: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Initialize agent - called after constructor
   */
  protected async initialize(): Promise<void> {
    try {
      this.log('Starting agent initialization', { agentId: this.agentId, agentType: this.agentType });
      
      // Ensure system configuration is loaded
      await this.ensureConfigurationLoaded();
      
      // Register agent in database
      await this.registerAgent();
      
      // Setup message handlers
      await this.setupMessageHandlers();
      
      // Run agent-specific initialization
      await this.onInitialize();
      
      this.status = AgentStatus.IDLE;
      this.log('Agent initialized successfully', { 
        agentId: this.agentId, 
        agentType: this.agentType,
        config: this.config 
      });
    } catch (error) {
      this.status = AgentStatus.ERROR;
      this.logError('Failed to initialize agent', error);
      throw error;
    }
  }

  /**
   * Ensure system configuration is loaded
   */
  private async ensureConfigurationLoaded(): Promise<void> {
    try {
      await config.initialize();
      this.log('System configuration loaded');
    } catch (error) {
      this.logError('Failed to load system configuration, using defaults', error);
      // Continue with default configuration
    }
  }

  /**
   * Agent-specific initialization hook - override in subclasses
   */
  protected async onInitialize(): Promise<void> {
    // Override in subclasses for specific initialization logic
  }

  /**
   * Register agent in database
   */
  private async registerAgent(): Promise<void> {
    try {
      await NeonAgentAdapter.registerAgent(
        this.agentId,
        this.agentType,
        this.status,
        this.config,
        this.startTime
      );
      
      this.log('Agent registered successfully', { agentId: this.agentId });
    } catch (error) {
      this.logError('Agent registration failed', error);
      throw error;
    }
  }

  /**
   * Setup message handlers for inter-agent communication
   */
  protected async setupMessageHandlers(): Promise<void> {
    await this.messageBus.subscribe(`agent.${this.agentType}`, this.handleMessage.bind(this));
    await this.messageBus.subscribe(`agent.${this.agentId}`, this.handleDirectMessage.bind(this));
    await this.messageBus.subscribe('agent.broadcast', this.handleBroadcast.bind(this));
  }

  /**
   * Handle incoming messages
   */
  protected async handleMessage(message: any): Promise<void> {
    this.log(`Received message: ${JSON.stringify(message)}`);
    // Override in subclasses for specific message handling
  }

  /**
   * Handle direct messages to this agent
   */
  protected async handleDirectMessage(message: any): Promise<void> {
    this.log(`Received direct message: ${JSON.stringify(message)}`);
    // Override in subclasses for specific direct message handling
  }

  /**
   * Handle broadcast messages
   */
  protected async handleBroadcast(message: any): Promise<void> {
    this.log(`Received broadcast: ${JSON.stringify(message)}`);
    // Override in subclasses for specific broadcast handling
  }

  /**
   * Main execution method - must be implemented by each agent
   */
  abstract execute(job: AgentJob): Promise<AgentResult>;

  /**
   * Process a job with error handling, retries, and metrics
   */
  async processJob(job: AgentJob): Promise<AgentResult> {
    const jobStartTime = Date.now();
    let lastError: any = null;
    let retryCount = 0;
    const maxRetries = job.constraints?.maxRetries ?? this.config.maxRetries ?? 3;
    
    this.updateStatus(AgentStatus.BUSY);
    this.log(`Starting job ${job.id}`, { 
      jobType: job.type, 
      priority: job.priority,
      maxRetries 
    });
    
    // Update job status to running
    await this.updateJobStatus(job.id, 'running');
    
    while (retryCount <= maxRetries) {
      try {
        // Execute the job with timeout
        const result = await this.executeWithTimeout(job);
        
        // Job succeeded
        this.updateMetrics(jobStartTime, true);
        await this.updateJobStatus(job.id, 'completed', result);
        this.updateStatus(AgentStatus.IDLE);
        
        this.log(`Job ${job.id} completed successfully`, { 
          executionTime: Date.now() - jobStartTime,
          retryCount 
        });
        
        return result;
        
      } catch (error) {
        lastError = error;
        retryCount++;
        
        this.logError(`Job ${job.id} attempt ${retryCount} failed`, error);
        
        // Check if we should retry
        if (retryCount <= maxRetries && this.shouldRetry(error)) {
          const delay = this.calculateRetryDelay(retryCount);
          this.log(`Retrying job ${job.id} in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
          
          // Update job status to retrying
          await this.updateJobStatus(job.id, 'retrying', null, error);
          
          // Wait before retry with exponential backoff
          await this.delay(delay);
          continue;
        }
        
        // Max retries reached or non-retryable error
        break;
      }
    }
    
    // Job failed after all retries
    this.updateMetrics(jobStartTime, false);
    await this.updateJobStatus(job.id, 'failed', null, lastError);
    this.updateStatus(AgentStatus.IDLE); // Return to idle, don't stay in error state
    
    this.logError(`Job ${job.id} failed after ${retryCount} attempts`, lastError);
    
    return {
      success: false,
      data: null,
      error: lastError instanceof Error ? lastError.message : 'Unknown error',
      executionTime: Date.now() - jobStartTime,
      agentId: this.agentId,
      warnings: [`Failed after ${retryCount} attempts`],
      metadata: {
        retryCount,
        maxRetries,
        finalError: lastError instanceof Error ? lastError.message : String(lastError)
      }
    };
  }

  /**
   * Determine if an error is retryable
   */
  protected shouldRetry(error: any): boolean {
    // Don't retry validation errors
    if (error instanceof TypeError || error?.name === 'ValidationError') {
      return false;
    }
    
    // Don't retry 4xx HTTP errors (client errors)
    if (error?.status && error.status >= 400 && error.status < 500) {
      return false;
    }
    
    // Retry network errors, timeouts, and 5xx errors
    return true;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  protected calculateRetryDelay(retryCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Execute job with timeout
   */
  private async executeWithTimeout(job: AgentJob): Promise<AgentResult> {
    const timeout = job.constraints?.maxExecutionTime ?? this.config.timeout ?? 300000;
    
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Job execution timeout after ${timeout}ms`));
      }, timeout);

      try {
        this.log(`Executing job ${job.id}`, { timeout });
        const result = await this.execute(job);
        clearTimeout(timeoutId);
        
        // Validate result format
        if (!result || typeof result !== 'object') {
          throw new Error('Invalid result format: execute() must return an AgentResult object');
        }
        
        // Ensure required fields are present
        if (result.success === undefined || !result.agentId) {
          result.success = result.success ?? true;
          result.agentId = result.agentId ?? this.agentId;
        }
        
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        this.logError(`Job ${job.id} execution error`, error);
        reject(error);
      }
    });
  }

  /**
   * Update job status in database with retry logic
   */
  private async updateJobStatus(
    jobId: string,
    status: string,
    result?: AgentResult,
    error?: any,
    retryCount: number = 0
  ): Promise<void> {
    const maxRetries = 3;
    
    try {
      const updateData: any = {
        status,
        updated_at: new Date()
      };

      if (status === 'retrying') {
        updateData.retry_count = (updateData.retry_count || 0) + 1;
      }

      if (result) {
        updateData.result = result;
        updateData.completed_at = new Date();
      }

      if (error) {
        updateData.error_message = error instanceof Error ? error.message : String(error);
        if (status === 'failed') {
          updateData.failed_at = new Date();
        }
      }

      await NeonAgentAdapter.updateAgentStatus(jobId, status, result, error);
      
      this.log(`Updated job ${jobId} status to ${status}`);
    } catch (dbError) {
      this.logError(`Failed to update job status (attempt ${retryCount + 1})`, dbError);
      
      if (retryCount < maxRetries) {
        // Retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        await this.delay(delay);
        return this.updateJobStatus(jobId, status, result, error, retryCount + 1);
      }
      
      // After max retries, just log the error but don't throw to avoid cascading failures
      this.logError(`Failed to update job status after ${maxRetries} attempts, giving up`, dbError);
    }
  }

  /**
   * Update agent metrics
   */
  private updateMetrics(jobStartTime: number, success: boolean): void {
    const executionTime = Date.now() - jobStartTime;
    
    this.metrics.totalJobs++;
    if (success) {
      this.metrics.successfulJobs++;
    } else {
      this.metrics.failedJobs++;
    }
    
    // Update average execution time
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * (this.metrics.totalJobs - 1) + executionTime) / this.metrics.totalJobs;
    
    this.metrics.errorRate = this.metrics.failedJobs / this.metrics.totalJobs;
    this.metrics.lastJobTime = new Date();
    this.metrics.uptime = Date.now() - this.startTime.getTime();
    this.metrics.updatedAt = new Date();
    
    // Store metrics in database
    this.persistMetrics();
  }

  /**
   * Persist metrics to database
   */
  private async persistMetrics(): Promise<void> {
    try {
      // Record key metrics individually
      await Promise.all([
        NeonAgentAdapter.recordMetric(this.agentId, this.agentType, 'total_jobs', this.metrics.totalJobs, 'count'),
        NeonAgentAdapter.recordMetric(this.agentId, this.agentType, 'successful_jobs', this.metrics.successfulJobs, 'count'),
        NeonAgentAdapter.recordMetric(this.agentId, this.agentType, 'failed_jobs', this.metrics.failedJobs, 'count'),
        NeonAgentAdapter.recordMetric(this.agentId, this.agentType, 'average_execution_time', this.metrics.averageExecutionTime, 'ms'),
        NeonAgentAdapter.recordMetric(this.agentId, this.agentType, 'error_rate', this.metrics.errorRate, 'percentage'),
        NeonAgentAdapter.recordMetric(this.agentId, this.agentType, 'uptime', this.metrics.uptime, 'ms')
      ]);
    } catch (error) {
      this.logError('Failed to persist metrics', error);
    }
  }

  /**
   * Update agent status
   */
  protected updateStatus(status: AgentStatus): void {
    this.status = status;
    this.broadcastStatusUpdate();
  }

  /**
   * Broadcast status update to other agents
   */
  private async broadcastStatusUpdate(): Promise<void> {
    await this.messageBus.publish('agent.status.update', {
      agentId: this.agentId,
      agentType: this.agentType,
      status: this.status,
      timestamp: new Date()
    });
  }

  /**
   * Send message to another agent
   */
  protected async sendMessage(targetAgentId: string, message: any): Promise<void> {
    await this.messageBus.publish(`agent.${targetAgentId}`, {
      from: this.agentId,
      message,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast message to all agents of a specific type
   */
  protected async broadcastToAgentType(agentType: string, message: any): Promise<void> {
    await this.messageBus.publish(`agent.${agentType}`, {
      from: this.agentId,
      message,
      timestamp: new Date()
    });
  }

  /**
   * Store data in shared memory
   */
  protected async storeMemory(key: string, data: any, ttl?: number): Promise<void> {
    await this.memory.set(key, data, ttl);
  }

  /**
   * Retrieve data from shared memory
   */
  protected async getMemory(key: string): Promise<any> {
    return await this.memory.get(key);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      this.updateStatus(AgentStatus.STOPPED);
      await this.messageBus.unsubscribeAll();
      await this.memory.cleanup();
      this.log('Agent cleanup completed');
    } catch (error) {
      this.logError('Agent cleanup failed', error);
    }
  }

  /**
   * Get current agent status
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Get agent metrics
   */
  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Update agent configuration
   */
  updateConfig(newConfig: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Logging utility
   */
  protected log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        agentId: this.agentId,
        agentType: this.agentType,
        level: 'INFO',
        message,
        data
      };
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Error logging utility
   */
  protected logError(message: string, error: any): void {
    if (this.config.enableLogging) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        agentId: this.agentId,
        agentType: this.agentType,
        level: 'ERROR',
        message,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      };
      console.error(JSON.stringify(logEntry));
    }
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const memoryCheck = await this.memory.healthCheck();
      const messageBusCheck = await this.messageBus.healthCheck();
      
      return {
        healthy: memoryCheck.healthy && messageBusCheck.healthy,
        details: {
          agentId: this.agentId,
          agentType: this.agentType,
          status: this.status,
          uptime: this.metrics.uptime,
          memory: memoryCheck,
          messageBus: messageBusCheck,
          lastActivity: this.metrics.lastJobTime
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
}

export default BaseAgent;