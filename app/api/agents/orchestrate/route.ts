/**
 * Main Agent Orchestration API
 * Coordinates the 3-agent workflow: Analyzer → Extractor → Validator
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAgentJob, updateJobStatus, getAgentJob } from '@/lib/queries';

interface OrchestrationRequest {
  target: string; // URL or target specification
  extractionType: 'vehicle_listings' | 'single_vehicle' | 'batch_vehicles';
  maxPages?: number;
  options?: {
    includeImages?: boolean;
    validateData?: boolean;
    userAgent?: string;
  };
}


export async function POST(request: NextRequest) {
  try {
    const body: OrchestrationRequest = await request.json();
    const { target, extractionType, maxPages = 10, options = {} } = body;

    if (!target) {
      return NextResponse.json(
        { error: 'Target URL is required' },
        { status: 400 }
      );
    }


    // Create the orchestration workflow
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Step 1: Create Analyzer Job
    const analyzerJob = await createAgentJob({
      agentId: `analyzer_${workflowId}`,
      agentType: 'analyzer',
      jobType: 'page_analysis',
      status: 'pending',
      priority: 'normal',
      payload: {
        url: target,
        extractionType,
        maxPages,
        options,
        workflowId
      }
    });


    // Immediately start the analyzer job
    const analyzerResult = await executeAnalyzerJob(analyzerJob.id, {
      url: target,
      extractionType,
      maxPages,
      options
    });

    if (!analyzerResult.success) {
      await updateJobStatus(analyzerJob.id, 'failed', { error: analyzerResult.error });
      return NextResponse.json({
        success: false,
        error: 'Analysis failed',
        details: analyzerResult.error,
        workflowId
      }, { status: 500 });
    }

    // Step 2: Create Extractor Job based on analysis
    const extractorJob = await createAgentJob({
      agentId: `extractor_${workflowId}`,
      agentType: 'extractor',
      jobType: 'data_extraction',
      status: 'pending',
      priority: 'normal',
      payload: {
        analysisResult: analyzerResult.analysis,
        url: target,
        extractionStrategy: analyzerResult.analysis.pageStructure,
        workflowId
      }
    });


    // Execute extraction based on analysis
    const extractorResult = await executeExtractorJob(extractorJob.id, {
      url: target,
      analysisResult: analyzerResult.analysis,
      options
    });

    if (!extractorResult.success) {
      await updateJobStatus(extractorJob.id, 'failed', { error: extractorResult.error });
      return NextResponse.json({
        success: false,
        error: 'Extraction failed',
        details: extractorResult.error,
        workflowId,
        analysisResult: analyzerResult.analysis
      }, { status: 500 });
    }

    // Step 3: Create Validator Job if requested
    let validatorResult = null;
    if (options.validateData !== false) { // Default to true
      const validatorJob = await createAgentJob({
        agentId: `validator_${workflowId}`,
        agentType: 'validator',
        jobType: 'data_validation',
        status: 'pending',
        priority: 'normal',
        payload: {
          vehicleData: extractorResult.vehicleData,
          context: {
            sourceUrl: target,
            extractionMethod: analyzerResult.analysis.pageStructure.extractionMethod,
            extractionConfidence: analyzerResult.analysis.confidence
          },
          workflowId
        }
      });


      validatorResult = await executeValidatorJob(validatorJob.id, {
        vehicleData: extractorResult.vehicleData,
        context: {
          sourceUrl: target,
          extractionMethod: analyzerResult.analysis.pageStructure.extractionMethod,
          extractionConfidence: analyzerResult.analysis.confidence
        }
      });

      if (!validatorResult.success) {
        await updateJobStatus(validatorJob.id, 'failed', { error: validatorResult.error });
      }
    }

    // Compile final results
    const finalResult = {
      success: true,
      workflowId,
      target,
      extractionType,
      results: {
        analysis: analyzerResult.analysis,
        extraction: extractorResult.vehicleData,
        validation: validatorResult?.validation || null
      },
      metrics: {
        totalProcessingTime: Date.now() - parseInt(workflowId.split('_')[1]),
        analysisTime: analyzerResult.processingTime,
        extractionTime: extractorResult.processingTime,
        validationTime: validatorResult?.processingTime || 0,
        qualityScore: validatorResult?.validation?.qualityScore || 0
      },
      jobs: {
        analyzer: analyzerJob.id,
        extractor: extractorJob.id,
        validator: validatorResult ? `validator_${workflowId}` : null
      },
      timestamp: new Date().toISOString()
    };


    return NextResponse.json(finalResult);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Orchestration failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper function to execute analyzer job
async function executeAnalyzerJob(jobId: string, payload: Record<string, unknown>) {
  try {
    await updateJobStatus(jobId, 'running', undefined);
    
    const analyzeResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/agents/analyzer/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Analyze this URL for vehicle data extraction: ${payload.url}`,
        system: "You are an expert web content analyzer that identifies data extraction strategies for vehicle listings."
      })
    });

    const result = await analyzeResponse.json();
    
    if (result.success) {
      await updateJobStatus(jobId, 'completed', result);
      return result;
    } else {
      throw new Error(result.error || 'Analysis failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateJobStatus(jobId, 'failed', { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

// Helper function to execute extractor job
async function executeExtractorJob(jobId: string, payload: Record<string, unknown>) {
  try {
    await updateJobStatus(jobId, 'running', undefined);
    
    const extractResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/agents/extractor/object`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Extract vehicle data from this URL: ${payload.url}`,
        schema: "vehicle"
      })
    });

    const result = await extractResponse.json();
    
    if (result.success) {
      await updateJobStatus(jobId, 'completed', result);
      return result;
    } else {
      throw new Error(result.error || 'Extraction failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateJobStatus(jobId, 'failed', { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

// Helper function to execute validator job
async function executeValidatorJob(jobId: string, payload: Record<string, unknown>) {
  try {
    await updateJobStatus(jobId, 'running', undefined);
    
    const validateResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/agents/validator/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Validate this vehicle data: ${JSON.stringify(payload.vehicleData)}`,
        system: "You are an expert data validator that ensures vehicle data quality and completeness."
      })
    });

    const result = await validateResponse.json();
    
    if (result.success) {
      await updateJobStatus(jobId, 'completed', result);
      return result;
    } else {
      throw new Error(result.error || 'Validation failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateJobStatus(jobId, 'failed', { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get('workflowId');

  if (workflowId) {
    // Return status of a specific workflow
    try {
      const jobs = await getAgentJob(workflowId);
      return NextResponse.json({
        workflowId,
        jobs,
        timestamp: new Date().toISOString()
      });
    } catch {
      return NextResponse.json({
        error: 'Failed to get workflow status'
      }, { status: 500 });
    }
  }

  return NextResponse.json({
    service: 'Agent Orchestrator',
    status: 'healthy',
    availableAgents: ['analyzer', 'extractor', 'validator'],
    timestamp: new Date().toISOString()
  });
}