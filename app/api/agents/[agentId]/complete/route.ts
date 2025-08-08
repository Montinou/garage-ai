/**
 * Agent Complete API Route - Non-streaming text generation
 * Uses Vercel AI SDK with Gemini 2.5 Flash for completion tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { getModel, defaultGenConfig } from '@/lib/ai/google';
import { 
  logger, 
  handleCORS, 
  createSecureResponse, 
  createErrorResponse, 
  validatePrompt,
  checkRateLimit,
  getClientId 
} from '@/lib/api-middleware';

interface CompleteRequest {
  prompt: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export async function POST(request: NextRequest, { params }: { params: { agentId: string } }) {
  const startTime = Date.now();
  const { agentId } = params;
  const clientId = getClientId(request);
  
  try {
    // Rate limiting
    if (!checkRateLimit(clientId, 10, 60000)) { // 10 requests per minute
      logger.warn('Rate limit exceeded', { clientId, agentId }, 'agent-complete');
      return createErrorResponse('Rate limit exceeded. Try again later.', 429, 'RATE_LIMIT_EXCEEDED');
    }
    
    const body: CompleteRequest = await request.json();
    const { prompt, system, temperature, maxOutputTokens } = body;

    // Validate required fields
    const promptError = validatePrompt(prompt);
    if (promptError) {
      return createErrorResponse(promptError, 400, 'VALIDATION_ERROR');
    }

    logger.info('Starting completion request', { 
      agentId, 
      promptLength: prompt.length,
      hasSystem: !!system,
      clientId 
    }, 'agent-complete');

    // Construct the final prompt with system message if provided
    const finalPrompt = system ? `<SYSTEM>${system}</SYSTEM>\n${prompt}` : prompt;

    // Generate text using Vercel AI SDK
    const result = await generateText({
      model: getModel(),
      prompt: finalPrompt,
      temperature: temperature ?? defaultGenConfig.temperature,
      maxOutputTokens: maxOutputTokens ?? defaultGenConfig.maxOutputTokens,
    });

    const processingTime = Date.now() - startTime;
    
    logger.info('Completion request completed', { 
      agentId, 
      processingTime,
      outputLength: result.text.length,
      finishReason: result.finishReason
    }, 'agent-complete');

    return createSecureResponse({
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage,
      model: process.env.MODEL_NAME ?? 'gemini-2.5-flash',
      agentId,
      processingTime,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    logger.error('Complete request failed', error, { agentId, clientId, processingTime }, 'agent-complete');
    return createErrorResponse('LLM_ERROR: ' + (error?.message || 'Unknown error occurred'), 500, 'LLM_ERROR');
  }
}

export async function OPTIONS() {
  return handleCORS();
}

export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params;
  return createSecureResponse({
    service: 'Agent Complete (Vercel AI SDK)',
    agentId,
    model: process.env.MODEL_NAME ?? 'gemini-2.5-flash',
    streaming: false,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}