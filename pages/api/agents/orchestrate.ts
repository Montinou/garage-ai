/**
 * Main orchestration API endpoint for the AI agents system
 * Handles workflow execution, job scheduling, and agent coordination
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createAgentJob, getSystemHealth } from '../../../lib/queries';
import { NeonAgentAdapter } from '../../../lib/neon-agent-adapter';
import { config } from '../../../lib/config';
import { 
  OrchestrationRequest, 
  OrchestrationResult, 
  OrchestrationStep,
  JobStatus, 
  JobPriority, 
  AgentType,
  AgentJob,
  ApiResponse 
} from '../../../agents/types/AgentTypes';

// Workflow definitions registry
const WORKFLOW_DEFINITIONS = {
  'vehicle-data-pipeline': {
    id: 'vehicle-data-pipeline',
    name: 'Vehicle Data Processing Pipeline',
    description: 'Complete pipeline for scraping, analyzing, and enriching vehicle data',
    steps: [
      {
        id: 'scrape',
        name: 'Scrape Vehicle Data',
        type: 'agent',
        agentType: AgentType.SCRAPER,
        inputs: ['sources', 'filters'],
        outputs: ['raw_vehicle_data'],
        dependencies: [],
        optional: false
      },
      {
        id: 'analyze',
        name: 'Analyze Vehicle Data',
        type: 'agent',
        agentType: AgentType.ANALYZER,
        inputs: ['raw_vehicle_data'],
        outputs: ['analyzed_data', 'insights'],
        dependencies: ['scrape'],
        optional: false
      },
      {
        id: 'enrich',
        name: 'Enrich Vehicle Data',
        type: 'agent',
        agentType: AgentType.ENRICHER,
        inputs: ['analyzed_data'],
        outputs: ['enriched_data'],
        dependencies: ['analyze'],
        optional: true
      },
      {
        id: 'validate',
        name: 'Validate Data Quality',
        type: 'agent',
        agentType: AgentType.VALIDATOR,
        inputs: ['enriched_data'],
        outputs: ['validated_data', 'quality_report'],
        dependencies: ['enrich'],
        optional: false
      }
    ],
    errorHandling: {
      retryStrategy: 'exponential',
      maxRetries: 3,
      continueOnError: false
    },
    timeout: 300000 // 5 minutes
  },
  'single-vehicle-analysis': {
    id: 'single-vehicle-analysis',
    name: 'Single Vehicle Analysis',
    description: 'Analyze a single vehicle listing for opportunities and insights',
    steps: [
      {
        id: 'analyze',
        name: 'Analyze Vehicle',
        type: 'agent',
        agentType: AgentType.ANALYZER,
        inputs: ['vehicle_data'],
        outputs: ['analysis_result'],
        dependencies: [],
        optional: false
      }
    ],
    errorHandling: {
      retryStrategy: 'fixed',
      maxRetries: 2,
      continueOnError: false
    },
    timeout: 60000 // 1 minute
  }
};

/**
 * Main API handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<OrchestrationResult>>
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Initialize configuration
    await config.initialize();
    
    // Log request details
    console.log(`Orchestration API ${req.method} request`, {
      requestId,
      url: req.url,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
    
    if (req.method === 'POST') {
      await handleOrchestrationRequest(req, res, requestId);
    } else if (req.method === 'GET') {
      await handleGetOrchestrationStatus(req, res, requestId);
    } else if (req.method === 'DELETE') {
      await handleCancelOrchestration(req, res, requestId);
    } else {
      res.status(405).json({
        success: false,
        error: 'Method not allowed',
        timestamp: new Date(),
        requestId
      });
    }
  } catch (error) {
    console.error('Orchestration API error:', {
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      method: req.method,
      url: req.url
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
 * Handle orchestration request
 */
async function handleOrchestrationRequest(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<OrchestrationResult>>,
  requestId: string
): Promise<void> {
  try {
    const orchestrationRequest: OrchestrationRequest = req.body;
    
    // Validate request
    const validation = validateOrchestrationRequest(orchestrationRequest);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: `Invalid request: ${validation.errors.join(', ')}`,
        timestamp: new Date(),
        requestId
      });
      return;
    }

    // Get workflow definition
    const workflowDef = WORKFLOW_DEFINITIONS[orchestrationRequest.workflow];
    if (!workflowDef) {
      res.status(400).json({
        success: false,
        error: `Unknown workflow: ${orchestrationRequest.workflow}`,
        timestamp: new Date(),
        requestId
      });
      return;
    }

    // Create orchestration record
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const orchestrationResult: OrchestrationResult = {
      workflowId,
      status: JobStatus.PENDING,
      steps: workflowDef.steps.map(stepDef => ({
        id: stepDef.id,
        name: stepDef.name,
        agentType: stepDef.agentType || AgentType.ORCHESTRATOR,
        status: JobStatus.PENDING,
        input: extractStepInput(stepDef, orchestrationRequest.parameters),
        retryCount: 0
      })),
      startedAt: new Date()
    };

    // Store orchestration in database
    await storeOrchestration(workflowId, orchestrationRequest, orchestrationResult);

    // Start workflow execution
    executeWorkflowAsync(workflowId, orchestrationRequest, workflowDef, orchestrationResult);

    res.status(202).json({
      success: true,
      data: orchestrationResult,
      message: 'Orchestration started successfully',
      timestamp: new Date(),
      requestId
    });

  } catch (error) {
    console.error('Handle orchestration request error:', error);
    throw error;
  }
}

/**
 * Handle get orchestration status
 */
async function handleGetOrchestrationStatus(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<OrchestrationResult>>,
  requestId: string
): Promise<void> {
  try {
    const { workflowId } = req.query;
    
    if (!workflowId || typeof workflowId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid workflowId parameter',
        timestamp: new Date(),
        requestId
      });
      return;
    }

    // Get orchestration from database
    const { data: orchestration, error } = await supabase
      .from('agent_orchestrations')
      .select('*')
      .eq('workflow_id', workflowId)
      .single();

    if (error || !orchestration) {
      res.status(404).json({
        success: false,
        error: 'Orchestration not found',
        timestamp: new Date(),
        requestId
      });
      return;
    }

    const result: OrchestrationResult = {
      workflowId: orchestration.workflow_id,
      status: orchestration.status as JobStatus,
      steps: orchestration.steps || [],
      result: orchestration.result,
      error: orchestration.error_message,
      startedAt: new Date(orchestration.started_at),
      completedAt: orchestration.completed_at ? new Date(orchestration.completed_at) : undefined,
      totalExecutionTime: orchestration.total_execution_time
    };

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date(),
      requestId
    });

  } catch (error) {
    console.error('Handle get orchestration status error:', error);
    throw error;
  }
}

/**
 * Handle cancel orchestration
 */
async function handleCancelOrchestration(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>,
  requestId: string
): Promise<void> {
  try {
    const { workflowId } = req.query;
    
    if (!workflowId || typeof workflowId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid workflowId parameter',
        timestamp: new Date(),
        requestId
      });
      return;
    }

    // Update orchestration status to cancelled
    const { error } = await supabase
      .from('agent_orchestrations')
      .update({
        status: JobStatus.CANCELLED,
        completed_at: new Date(),
        updated_at: new Date()
      })
      .eq('workflow_id', workflowId);

    if (error) {
      throw new Error(`Failed to cancel orchestration: ${error.message}`);
    }

    // TODO: Cancel running jobs for this workflow

    res.status(200).json({
      success: true,
      message: 'Orchestration cancelled successfully',
      timestamp: new Date(),
      requestId
    });

  } catch (error) {
    console.error('Handle cancel orchestration error:', error);
    throw error;
  }
}

/**
 * Validate orchestration request
 */
function validateOrchestrationRequest(request: OrchestrationRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.workflow) {
    errors.push('Workflow is required');
  }

  if (!request.parameters || typeof request.parameters !== 'object') {
    errors.push('Parameters must be an object');
  }

  if (request.priority && !Object.values(JobPriority).includes(request.priority)) {
    errors.push('Invalid priority value');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Extract input for a workflow step
 */
function extractStepInput(stepDef: any, parameters: Record<string, any>): any {
  const input: Record<string, any> = {};
  
  for (const inputName of stepDef.inputs || []) {
    if (parameters[inputName] !== undefined) {
      input[inputName] = parameters[inputName];
    }
  }
  
  return input;
}

/**
 * Store orchestration in database
 */
async function storeOrchestration(
  workflowId: string,
  request: OrchestrationRequest,
  result: OrchestrationResult
): Promise<void> {
  try {
    const { error } = await supabase
      .from('agent_orchestrations')
      .insert({
        workflow_id: workflowId,
        workflow_name: request.workflow,
        status: result.status,
        parameters: request.parameters,
        constraints: request.constraints,
        callbacks: request.callbacks,
        metadata: request.metadata,
        steps: result.steps,
        started_at: result.startedAt,
        created_at: new Date(),
        updated_at: new Date()
      });

    if (error) {
      throw new Error(`Failed to store orchestration: ${error.message}`);
    }
  } catch (error) {
    console.error('Store orchestration error:', error);
    throw error;
  }
}

/**
 * Execute workflow asynchronously
 */
async function executeWorkflowAsync(
  workflowId: string,
  request: OrchestrationRequest,
  workflowDef: any,
  orchestrationResult: OrchestrationResult
): Promise<void> {
  try {
    console.log(`Starting workflow execution: ${workflowId}`);
    
    // Update status to running
    await updateOrchestrationStatus(workflowId, JobStatus.RUNNING);
    
    const executionContext = {
      workflowId,
      parameters: request.parameters,
      stepOutputs: new Map<string, any>(),
      startTime: Date.now()
    };

    // Execute steps in dependency order
    const executedSteps: string[] = [];
    let hasError = false;

    for (const stepDef of workflowDef.steps) {
      try {
        // Check if dependencies are satisfied
        const dependenciesSatisfied = stepDef.dependencies.every((dep: string) => 
          executedSteps.includes(dep)
        );

        if (!dependenciesSatisfied) {
          console.log(`Skipping step ${stepDef.id}: dependencies not satisfied`);
          continue;
        }

        // Update step status to running
        await updateStepStatus(workflowId, stepDef.id, JobStatus.RUNNING);

        // Execute step
        const stepResult = await executeWorkflowStep(stepDef, executionContext);
        
        // Store step output
        executionContext.stepOutputs.set(stepDef.id, stepResult);
        
        // Update step status to completed
        await updateStepStatus(workflowId, stepDef.id, JobStatus.COMPLETED, stepResult);
        
        executedSteps.push(stepDef.id);
        
      } catch (stepError) {
        console.error(`Step ${stepDef.id} failed:`, stepError);
        
        // Update step status to failed
        await updateStepStatus(
          workflowId, 
          stepDef.id, 
          JobStatus.FAILED, 
          null, 
          stepError instanceof Error ? stepError.message : String(stepError)
        );

        if (!stepDef.optional && !workflowDef.errorHandling.continueOnError) {
          hasError = true;
          break;
        }
      }
    }

    // Update final orchestration status
    const finalStatus = hasError ? JobStatus.FAILED : JobStatus.COMPLETED;
    const totalExecutionTime = Date.now() - executionContext.startTime;
    
    await updateOrchestrationStatus(
      workflowId, 
      finalStatus, 
      executionContext.stepOutputs.get('final_result'),
      hasError ? 'Workflow execution failed' : undefined,
      totalExecutionTime
    );

    console.log(`Workflow ${workflowId} completed with status: ${finalStatus}`);

  } catch (error) {
    console.error(`Workflow ${workflowId} execution error:`, error);
    
    await updateOrchestrationStatus(
      workflowId,
      JobStatus.FAILED,
      null,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Execute a single workflow step
 */
async function executeWorkflowStep(stepDef: any, context: any): Promise<any> {
  // Create agent job for this step
  const job: AgentJob = {
    id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: stepDef.name,
    priority: JobPriority.NORMAL,
    payload: {
      stepId: stepDef.id,
      workflowId: context.workflowId,
      input: stepDef.inputs.reduce((acc: any, inputName: string) => {
        if (context.stepOutputs.has(inputName)) {
          acc[inputName] = context.stepOutputs.get(inputName);
        } else if (context.parameters[inputName] !== undefined) {
          acc[inputName] = context.parameters[inputName];
        }
        return acc;
      }, {})
    },
    requirements: {
      agentType: stepDef.agentType
    },
    constraints: {
      maxExecutionTime: stepDef.timeout || 60000,
      maxRetries: 3
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Store job in database
  const { error: jobError } = await supabase
    .from('agent_jobs')
    .insert({
      id: job.id,
      agent_type: stepDef.agentType,
      job_type: job.type,
      status: JobStatus.PENDING,
      priority: job.priority,
      payload: job.payload,
      max_retries: job.constraints?.maxRetries || 3,
      created_at: job.createdAt,
      updated_at: job.updatedAt
    });

  if (jobError) {
    throw new Error(`Failed to create job: ${jobError.message}`);
  }

  // TODO: Implement actual agent job execution
  // For now, return mock result
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
  
  return {
    stepId: stepDef.id,
    success: true,
    output: `Mock output for step ${stepDef.id}`,
    executionTime: 1000
  };
}

/**
 * Update orchestration status
 */
async function updateOrchestrationStatus(
  workflowId: string,
  status: JobStatus,
  result?: any,
  error?: string,
  totalExecutionTime?: number
): Promise<void> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date()
    };

    if (result !== undefined) {
      updateData.result = result;
    }

    if (error) {
      updateData.error_message = error;
    }

    if (totalExecutionTime !== undefined) {
      updateData.total_execution_time = totalExecutionTime;
    }

    if (status === JobStatus.COMPLETED || status === JobStatus.FAILED || status === JobStatus.CANCELLED) {
      updateData.completed_at = new Date();
    }

    const { error: dbError } = await supabase
      .from('agent_orchestrations')
      .update(updateData)
      .eq('workflow_id', workflowId);

    if (dbError) {
      throw new Error(`Failed to update orchestration status: ${dbError.message}`);
    }
  } catch (error) {
    console.error('Update orchestration status error:', error);
  }
}

/**
 * Update step status
 */
async function updateStepStatus(
  workflowId: string,
  stepId: string,
  status: JobStatus,
  output?: any,
  error?: string
): Promise<void> {
  try {
    // Get current orchestration
    const { data: orchestration, error: fetchError } = await supabase
      .from('agent_orchestrations')
      .select('steps')
      .eq('workflow_id', workflowId)
      .single();

    if (fetchError || !orchestration) {
      throw new Error('Failed to fetch orchestration for step update');
    }

    // Update the specific step
    const steps = orchestration.steps || [];
    const stepIndex = steps.findIndex((step: OrchestrationStep) => step.id === stepId);
    
    if (stepIndex === -1) {
      throw new Error(`Step ${stepId} not found`);
    }

    steps[stepIndex] = {
      ...steps[stepIndex],
      status,
      output,
      error,
      completedAt: status === JobStatus.COMPLETED || status === JobStatus.FAILED ? new Date() : undefined
    };

    // Update orchestration with modified steps
    const { error: updateError } = await supabase
      .from('agent_orchestrations')
      .update({
        steps,
        updated_at: new Date()
      })
      .eq('workflow_id', workflowId);

    if (updateError) {
      throw new Error(`Failed to update step status: ${updateError.message}`);
    }
  } catch (error) {
    console.error('Update step status error:', error);
  }
}