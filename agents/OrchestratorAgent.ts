/**
 * OrchestratorAgent - Coordinates all other agents in the garage-ai system
 * 
 * Responsibilities:
 * - Job scheduling and workflow management
 * - Strategy selection based on context
 * - Resource allocation and load balancing
 * - Dynamic configuration via Vercel Edge Config
 * - Inter-agent communication coordination
 * - Error handling and recovery strategies
 */

import { BaseAgent } from './base/BaseAgent';
import { 
  AgentJob, 
  AgentResult, 
  AgentConfig, 
  JobPriority, 
  AgentType,
  OrchestrationRequest,
  OrchestrationResult,
  OrchestrationStep,
  JobStatus,
  WorkflowDefinition,
  WorkflowStep
} from './types/AgentTypes';
import { get as getEdgeConfig } from '@vercel/edge-config';
import { config } from '../lib/config';

interface OrchestratorConfig extends AgentConfig {
  maxConcurrentWorkflows: number;
  workflowTimeout: number;
  enableDynamicScaling: boolean;
  resourceThresholds: {
    cpuThreshold: number;
    memoryThreshold: number;
    responseTimeThreshold: number;
  };
}

interface AgentCapability {
  agentType: AgentType;
  capabilities: string[];
  currentLoad: number;
  maxLoad: number;
  averageResponseTime: number;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

interface WorkflowContext {
  workflowId: string;
  request: OrchestrationRequest;
  steps: OrchestrationStep[];
  currentStepIndex: number;
  startTime: Date;
  context: Record<string, any>;
  retryCount: number;
}

export class OrchestratorAgent extends BaseAgent {
  private readonly orchestratorConfig: OrchestratorConfig;
  private activeWorkflows: Map<string, WorkflowContext>;
  private availableAgents: Map<string, AgentCapability>;
  private workflowDefinitions: Map<string, WorkflowDefinition>;
  private jobQueue: AgentJob[];
  private processingQueue: boolean;

  constructor(config: AgentConfig = {}) {
    super('orchestrator', config);
    
    this.orchestratorConfig = {
      maxConcurrentWorkflows: 5,
      workflowTimeout: 600000, // 10 minutes
      enableDynamicScaling: true,
      resourceThresholds: {
        cpuThreshold: 80,
        memoryThreshold: 85,
        responseTimeThreshold: 5000
      },
      ...config
    };

    this.activeWorkflows = new Map();
    this.availableAgents = new Map();
    this.workflowDefinitions = new Map();
    this.jobQueue = [];
    this.processingQueue = false;

    this.initializeWorkflowDefinitions();
  }

  protected async onInitialize(): Promise<void> {
    await this.loadDynamicConfiguration();
    await this.discoverAvailableAgents();
    await this.startWorkflowProcessing();
    this.log('OrchestratorAgent initialized successfully');
  }

  /**
   * Load dynamic configuration from Vercel Edge Config
   */
  private async loadDynamicConfiguration(): Promise<void> {
    try {
      const dynamicConfig = await getEdgeConfig('orchestratorConfig');
      if (dynamicConfig && typeof dynamicConfig === 'object') {
        Object.assign(this.orchestratorConfig, dynamicConfig);
        this.log('Dynamic configuration loaded from Edge Config', dynamicConfig);
      }

      // Load workflow definitions from Edge Config
      const workflows = await getEdgeConfig('workflowDefinitions');
      if (workflows && Array.isArray(workflows)) {
        for (const workflow of workflows) {
          this.workflowDefinitions.set(workflow.id, workflow as WorkflowDefinition);
        }
        this.log(`Loaded ${workflows.length} workflow definitions from Edge Config`);
      }
    } catch (error) {
      this.logError('Failed to load dynamic configuration', error);
      // Continue with default configuration
    }
  }

  /**
   * Discover and register available agents
   */
  private async discoverAvailableAgents(): Promise<void> {
    try {
      // Subscribe to agent status updates
      await this.messageBus.subscribe('agent.status.update', this.handleAgentStatusUpdate.bind(this));
      
      // Initialize with known agent types
      const agentTypes = [
        AgentType.SCRAPER,
        AgentType.ANALYZER, 
        AgentType.ENRICHER,
        AgentType.VALIDATOR,
        AgentType.MONITOR
      ];

      for (const agentType of agentTypes) {
        this.availableAgents.set(agentType, {
          agentType,
          capabilities: await this.getAgentCapabilities(agentType),
          currentLoad: 0,
          maxLoad: 10,
          averageResponseTime: 0,
          healthStatus: 'healthy'
        });
      }

      this.log('Agent discovery completed', {
        totalAgents: this.availableAgents.size,
        agents: Array.from(this.availableAgents.keys())
      });
    } catch (error) {
      this.logError('Agent discovery failed', error);
    }
  }

  /**
   * Get capabilities for a specific agent type
   */
  private async getAgentCapabilities(agentType: AgentType): Promise<string[]> {
    const capabilityMap: Record<AgentType, string[]> = {
      [AgentType.SCRAPER]: ['web_scraping', 'data_extraction', 'pagination', 'form_handling'],
      [AgentType.ANALYZER]: ['structure_analysis', 'semantic_analysis', 'pattern_recognition', 'ai_processing'],
      [AgentType.ENRICHER]: ['data_enrichment', 'geocoding', 'price_normalization', 'image_processing'],
      [AgentType.VALIDATOR]: ['data_validation', 'quality_scoring', 'anomaly_detection', 'auto_correction'],
      [AgentType.MONITOR]: ['health_monitoring', 'performance_tracking', 'alerting', 'logging'],
      [AgentType.ORCHESTRATOR]: ['workflow_management', 'job_scheduling', 'resource_allocation']
    };

    return capabilityMap[agentType] || [];
  }

  /**
   * Handle agent status updates
   */
  private async handleAgentStatusUpdate(message: any): Promise<void> {
    try {
      const { agentId, agentType, status } = message.payload;
      
      if (this.availableAgents.has(agentType)) {
        const agent = this.availableAgents.get(agentType)!;
        agent.healthStatus = this.mapStatusToHealth(status);
        
        this.log(`Agent ${agentId} (${agentType}) status updated to ${status}`);
      }
    } catch (error) {
      this.logError('Error handling agent status update', error);
    }
  }

  /**
   * Map agent status to health status
   */
  private mapStatusToHealth(status: string): 'healthy' | 'degraded' | 'unhealthy' {
    switch (status) {
      case 'idle':
      case 'busy':
        return 'healthy';
      case 'error':
        return 'unhealthy';
      default:
        return 'degraded';
    }
  }

  /**
   * Initialize default workflow definitions
   */
  private initializeWorkflowDefinitions(): void {
    // Vehicle scraping workflow
    const vehicleScrapingWorkflow: WorkflowDefinition = {
      id: 'vehicle_scraping',
      name: 'Vehicle Data Scraping',
      description: 'Complete workflow for scraping vehicle data from automotive websites',
      version: '1.0.0',
      steps: [
        {
          id: 'explore',
          name: 'Site Exploration',
          type: 'agent',
          agentType: AgentType.SCRAPER,
          inputs: { url: '${input.url}', searchParams: '${input.searchParams}' },
          outputs: ['pageStructure', 'navigationInfo', 'challenges'],
          dependencies: [],
          optional: false
        },
        {
          id: 'analyze',
          name: 'Structure Analysis',
          type: 'agent',
          agentType: AgentType.ANALYZER,
          inputs: { pageStructure: '${explore.pageStructure}' },
          outputs: ['extractionStrategy', 'dataPatterns'],
          dependencies: ['explore'],
          optional: false
        },
        {
          id: 'extract',
          name: 'Data Extraction',
          type: 'agent',
          agentType: AgentType.SCRAPER,
          inputs: { 
            strategy: '${analyze.extractionStrategy}',
            patterns: '${analyze.dataPatterns}',
            navigationInfo: '${explore.navigationInfo}'
          },
          outputs: ['rawData'],
          dependencies: ['analyze'],
          optional: false
        },
        {
          id: 'enrich',
          name: 'Data Enrichment',
          type: 'agent',
          agentType: AgentType.ENRICHER,
          inputs: { rawData: '${extract.rawData}' },
          outputs: ['enrichedData'],
          dependencies: ['extract'],
          optional: true
        },
        {
          id: 'validate',
          name: 'Data Validation',
          type: 'agent',
          agentType: AgentType.VALIDATOR,
          inputs: { data: '${enrich.enrichedData || extract.rawData}' },
          outputs: ['validatedData', 'qualityScore'],
          dependencies: ['extract'],
          optional: false
        }
      ],
      errorHandling: {
        retryStrategy: 'exponential',
        maxRetries: 3,
        continueOnError: false
      },
      timeout: 600000, // 10 minutes
      tags: ['vehicle', 'scraping', 'automotive']
    };

    this.workflowDefinitions.set(vehicleScrapingWorkflow.id, vehicleScrapingWorkflow);
    this.log('Default workflow definitions initialized');
  }

  /**
   * Start workflow processing loop
   */
  private async startWorkflowProcessing(): Promise<void> {
    if (this.processingQueue) {
      return;
    }

    this.processingQueue = true;
    
    // Process queue every second
    setInterval(async () => {
      try {
        await this.processJobQueue();
      } catch (error) {
        this.logError('Error processing job queue', error);
      }
    }, 1000);

    this.log('Workflow processing started');
  }

  /**
   * Process pending jobs in the queue
   */
  private async processJobQueue(): Promise<void> {
    if (this.jobQueue.length === 0 || this.activeWorkflows.size >= this.orchestratorConfig.maxConcurrentWorkflows) {
      return;
    }

    // Sort jobs by priority
    this.jobQueue.sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority));

    const job = this.jobQueue.shift();
    if (!job) return;

    try {
      await this.executeJob(job);
    } catch (error) {
      this.logError(`Failed to execute job ${job.id}`, error);
    }
  }

  /**
   * Get numeric value for job priority
   */
  private getPriorityValue(priority: JobPriority): number {
    const priorityMap = {
      [JobPriority.URGENT]: 4,
      [JobPriority.HIGH]: 3,
      [JobPriority.NORMAL]: 2,
      [JobPriority.LOW]: 1
    };
    return priorityMap[priority] || 2;
  }

  /**
   * Main execution method for orchestration jobs
   */
  async execute(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    
    try {
      this.log(`Executing orchestration job ${job.id}`, { 
        type: job.type, 
        priority: job.priority 
      });

      // Handle different job types
      switch (job.type) {
        case 'orchestrate_workflow':
          return await this.orchestrateWorkflow(job);
        case 'schedule_job':
          return await this.scheduleJob(job);
        case 'monitor_workflow':
          return await this.monitorWorkflow(job);
        case 'cancel_workflow':
          return await this.cancelWorkflow(job);
        case 'get_agent_status':
          return await this.getAgentStatus(job);
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (error) {
      this.logError(`Orchestration job ${job.id} failed`, error);
      
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        warnings: ['Job execution failed']
      };
    }
  }

  /**
   * Orchestrate a complete workflow
   */
  private async orchestrateWorkflow(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const request = job.payload as OrchestrationRequest;
    
    try {
      // Get workflow definition
      const workflowDef = this.workflowDefinitions.get(request.workflow);
      if (!workflowDef) {
        throw new Error(`Workflow definition not found: ${request.workflow}`);
      }

      // Create workflow context
      const workflowId = `${request.workflow}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const workflowContext: WorkflowContext = {
        workflowId,
        request,
        steps: workflowDef.steps.map(step => ({
          id: step.id,
          name: step.name,
          agentType: step.agentType!,
          status: JobStatus.PENDING,
          input: this.resolveStepInputs(step, request.parameters, {}),
          retryCount: 0
        })),
        currentStepIndex: 0,
        startTime: new Date(),
        context: { ...request.parameters },
        retryCount: 0
      };

      this.activeWorkflows.set(workflowId, workflowContext);

      // Execute workflow steps
      const result = await this.executeWorkflowSteps(workflowContext, workflowDef);

      // Clean up
      this.activeWorkflows.delete(workflowId);

      return {
        success: result.status === JobStatus.COMPLETED,
        data: result,
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          workflowId,
          stepsExecuted: result.steps.length,
          totalExecutionTime: result.totalExecutionTime
        }
      };
    } catch (error) {
      this.logError('Workflow orchestration failed', error);
      
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Workflow failed',
        executionTime: Date.now() - startTime,
        agentId: this.agentId
      };
    }
  }

  /**
   * Execute workflow steps sequentially or in parallel
   */
  private async executeWorkflowSteps(
    context: WorkflowContext, 
    workflowDef: WorkflowDefinition
  ): Promise<OrchestrationResult> {
    const result: OrchestrationResult = {
      workflowId: context.workflowId,
      status: JobStatus.RUNNING,
      steps: context.steps,
      startedAt: context.startTime
    };

    try {
      for (let i = 0; i < context.steps.length; i++) {
        const step = context.steps[i];
        const stepDef = workflowDef.steps.find(s => s.id === step.id)!;

        // Check dependencies
        if (!this.areDependenciesMet(stepDef, context.steps)) {
          if (!stepDef.optional) {
            throw new Error(`Dependencies not met for step ${step.id}`);
          }
          continue;
        }

        // Execute step
        step.status = JobStatus.RUNNING;
        step.startedAt = new Date();

        try {
          const stepResult = await this.executeWorkflowStep(step, stepDef, context);
          
          step.status = JobStatus.COMPLETED;
          step.completedAt = new Date();
          step.executionTime = step.completedAt.getTime() - step.startedAt!.getTime();
          step.output = stepResult.data;

          // Update context with step outputs
          for (const outputKey of stepDef.outputs) {
            if (stepResult.data && stepResult.data[outputKey] !== undefined) {
              context.context[`${step.id}.${outputKey}`] = stepResult.data[outputKey];
            }
          }

        } catch (stepError) {
          step.status = JobStatus.FAILED;
          step.error = stepError instanceof Error ? stepError.message : String(stepError);
          
          if (!stepDef.optional && !workflowDef.errorHandling.continueOnError) {
            throw stepError;
          }
        }
      }

      result.status = JobStatus.COMPLETED;
      result.completedAt = new Date();
      result.totalExecutionTime = result.completedAt.getTime() - result.startedAt.getTime();

      // Collect final results
      const finalData: any = {};
      for (const step of context.steps) {
        if (step.output) {
          finalData[step.id] = step.output;
        }
      }
      result.result = finalData;

    } catch (error) {
      result.status = JobStatus.FAILED;
      result.error = error instanceof Error ? error.message : String(error);
      result.completedAt = new Date();
    }

    return result;
  }

  /**
   * Execute a single workflow step
   */
  private async executeWorkflowStep(
    step: OrchestrationStep,
    stepDef: WorkflowStep,
    context: WorkflowContext
  ): Promise<AgentResult> {
    // Find best available agent for this step
    const agent = this.selectBestAgent(step.agentType);
    if (!agent) {
      throw new Error(`No available agent of type ${step.agentType}`);
    }

    // Create job for the agent
    const agentJob: AgentJob = {
      id: `${context.workflowId}_${step.id}_${Date.now()}`,
      type: 'workflow_step',
      priority: context.request.priority,
      payload: {
        stepId: step.id,
        workflowId: context.workflowId,
        input: step.input
      },
      constraints: {
        maxExecutionTime: stepDef.timeout || 30000,
        maxRetries: 2
      },
      metadata: {
        workflowId: context.workflowId,
        stepId: step.id,
        agentType: step.agentType
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Send job to agent
    await this.sendMessage(step.agentType, {
      type: 'execute_job',
      job: agentJob
    });

    // Wait for result (simplified - in production would use message callbacks)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Step ${step.id} timeout`));
      }, stepDef.timeout || 30000);

      // TODO: Implement proper message-based result handling
      // For now, simulate step execution
      setTimeout(() => {
        clearTimeout(timeout);
        resolve({
          success: true,
          data: { stepCompleted: true, agentType: step.agentType },
          executionTime: 1000,
          agentId: this.agentId
        });
      }, 1000);
    });
  }

  /**
   * Check if step dependencies are met
   */
  private areDependenciesMet(stepDef: WorkflowStep, completedSteps: OrchestrationStep[]): boolean {
    if (!stepDef.dependencies || stepDef.dependencies.length === 0) {
      return true;
    }

    return stepDef.dependencies.every(depId => 
      completedSteps.some(step => step.id === depId && step.status === JobStatus.COMPLETED)
    );
  }

  /**
   * Resolve step inputs from context and parameters
   */
  private resolveStepInputs(
    stepDef: WorkflowStep, 
    parameters: Record<string, any>, 
    context: Record<string, any>
  ): any {
    const resolvedInputs: any = {};
    
    for (const [key, value] of Object.entries(stepDef.inputs)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        // Resolve template variable
        const varPath = value.slice(2, -1);
        resolvedInputs[key] = this.resolveVariable(varPath, parameters, context);
      } else {
        resolvedInputs[key] = value;
      }
    }

    return resolvedInputs;
  }

  /**
   * Resolve template variable
   */
  private resolveVariable(
    varPath: string, 
    parameters: Record<string, any>, 
    context: Record<string, any>
  ): any {
    if (varPath.startsWith('input.')) {
      const paramKey = varPath.slice(6);
      return parameters[paramKey];
    }

    return context[varPath];
  }

  /**
   * Select best available agent for a job
   */
  private selectBestAgent(agentType: AgentType): AgentCapability | null {
    const agent = this.availableAgents.get(agentType);
    
    if (!agent || agent.healthStatus === 'unhealthy') {
      return null;
    }

    // Check load capacity
    if (agent.currentLoad >= agent.maxLoad) {
      return null;
    }

    return agent;
  }

  /**
   * Schedule a job for later execution
   */
  private async scheduleJob(job: AgentJob): Promise<AgentResult> {
    try {
      this.jobQueue.push(job.payload as AgentJob);
      
      return {
        success: true,
        data: { jobId: job.id, queuePosition: this.jobQueue.length },
        executionTime: 0,
        agentId: this.agentId
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to schedule job',
        executionTime: 0,
        agentId: this.agentId
      };
    }
  }

  /**
   * Monitor workflow execution
   */
  private async monitorWorkflow(job: AgentJob): Promise<AgentResult> {
    const workflowId = job.payload.workflowId;
    const workflow = this.activeWorkflows.get(workflowId);
    
    if (!workflow) {
      return {
        success: false,
        data: null,
        error: 'Workflow not found',
        executionTime: 0,
        agentId: this.agentId
      };
    }

    return {
      success: true,
      data: {
        workflowId,
        status: 'running',
        currentStep: workflow.currentStepIndex,
        totalSteps: workflow.steps.length,
        executionTime: Date.now() - workflow.startTime.getTime(),
        steps: workflow.steps
      },
      executionTime: 0,
      agentId: this.agentId
    };
  }

  /**
   * Cancel workflow execution
   */
  private async cancelWorkflow(job: AgentJob): Promise<AgentResult> {
    const workflowId = job.payload.workflowId;
    const workflow = this.activeWorkflows.get(workflowId);
    
    if (!workflow) {
      return {
        success: false,
        data: null,
        error: 'Workflow not found',
        executionTime: 0,
        agentId: this.agentId
      };
    }

    // Cancel workflow
    this.activeWorkflows.delete(workflowId);
    
    return {
      success: true,
      data: { workflowId, status: 'cancelled' },
      executionTime: 0,
      agentId: this.agentId
    };
  }

  /**
   * Get status of all agents
   */
  private async getAgentStatus(job: AgentJob): Promise<AgentResult> {
    const agentStatuses = Array.from(this.availableAgents.entries()).map(([type, agent]) => ({
      agentType: type,
      healthStatus: agent.healthStatus,
      currentLoad: agent.currentLoad,
      maxLoad: agent.maxLoad,
      averageResponseTime: agent.averageResponseTime,
      capabilities: agent.capabilities
    }));

    return {
      success: true,
      data: {
        totalAgents: agentStatuses.length,
        healthyAgents: agentStatuses.filter(a => a.healthStatus === 'healthy').length,
        activeWorkflows: this.activeWorkflows.size,
        queuedJobs: this.jobQueue.length,
        agents: agentStatuses
      },
      executionTime: 0,
      agentId: this.agentId
    };
  }

  /**
   * Handle direct messages to orchestrator
   */
  protected async handleDirectMessage(message: any): Promise<void> {
    try {
      const { type, payload } = message.message;
      
      switch (type) {
        case 'orchestrate_workflow':
          const job: AgentJob = {
            id: `orchestrate_${Date.now()}`,
            type: 'orchestrate_workflow',
            priority: payload.priority || JobPriority.NORMAL,
            payload: payload as OrchestrationRequest,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await this.processJob(job);
          break;
          
        case 'agent_registration':
          await this.handleAgentRegistration(payload);
          break;
          
        default:
          this.log(`Unknown message type: ${type}`);
      }
    } catch (error) {
      this.logError('Error handling direct message', error);
    }
  }

  /**
   * Handle agent registration
   */
  private async handleAgentRegistration(payload: any): Promise<void> {
    const { agentType, capabilities, maxLoad } = payload;
    
    if (this.availableAgents.has(agentType)) {
      const agent = this.availableAgents.get(agentType)!;
      agent.capabilities = capabilities || agent.capabilities;
      agent.maxLoad = maxLoad || agent.maxLoad;
      agent.healthStatus = 'healthy';
    }
    
    this.log(`Agent ${agentType} registered/updated`, { capabilities, maxLoad });
  }

  /**
   * Get orchestrator statistics
   */
  async getStats(): Promise<Record<string, any>> {
    return {
      activeWorkflows: this.activeWorkflows.size,
      queuedJobs: this.jobQueue.length,
      availableAgents: this.availableAgents.size,
      healthyAgents: Array.from(this.availableAgents.values())
        .filter(a => a.healthStatus === 'healthy').length,
      workflowDefinitions: this.workflowDefinitions.size,
      averageWorkflowTime: 0, // TODO: Calculate from completed workflows
      configuration: this.orchestratorConfig
    };
  }
}

export default OrchestratorAgent;