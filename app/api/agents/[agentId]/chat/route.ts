/**
 * Agent Chat API Route - Streaming SSE text generation
 * Uses Vercel AI SDK with Gemini 2.5 Flash for chat streaming
 */

import { NextRequest, NextResponse } from 'next/server';
import { streamText, type CoreMessage } from 'ai';
import { getModel, defaultGenConfig } from '@/lib/ai/google';
import { 
  logger, 
  handleCORS, 
  createErrorResponse, 
  validateMessages,
  checkRateLimit,
  getClientId,
  CORS_HEADERS 
} from '@/lib/api-middleware';

interface ChatRequest {
  messages: CoreMessage[];
  temperature?: number;
  maxOutputTokens?: number;
}

export async function POST(request: NextRequest, { params }: { params: { agentId: string } }) {
  const startTime = Date.now();
  const { agentId } = params;
  const clientId = getClientId(request);
  
  try {
    // Rate limiting
    if (!checkRateLimit(clientId, 5, 60000)) { // 5 requests per minute for streaming
      logger.warn('Rate limit exceeded for chat', { clientId, agentId }, 'agent-chat');
      return createErrorResponse('Rate limit exceeded. Try again later.', 429, 'RATE_LIMIT_EXCEEDED');
    }
    
    const body: ChatRequest = await request.json();
    const { messages, temperature, maxOutputTokens } = body;

    // Validate required fields
    const messagesError = validateMessages(messages);
    if (messagesError) {
      return createErrorResponse(messagesError, 400, 'VALIDATION_ERROR');
    }

    logger.info('Starting chat stream request', { 
      agentId, 
      messageCount: messages.length,
      clientId 
    }, 'agent-chat');

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const { textStream, usage } = await streamText({
            model: getModel(),
            messages: messages as CoreMessage[],
            temperature: temperature ?? defaultGenConfig.temperature,
            maxOutputTokens: maxOutputTokens ?? defaultGenConfig.maxOutputTokens,
          });

          let chunks = 0;
          
          // Stream each text delta
          for await (const delta of textStream) {
            const data = JSON.stringify({ delta, agentId, chunk: ++chunks });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          const processingTime = Date.now() - startTime;
          
          // Send final event with usage data
          const finalData = JSON.stringify({ 
            usage, 
            agentId,
            model: process.env.MODEL_NAME ?? 'gemini-2.5-flash',
            processingTime,
            totalChunks: chunks,
            timestamp: new Date().toISOString()
          });
          controller.enqueue(encoder.encode(`event: end\ndata: ${finalData}\n\n`));
          
          logger.info('Chat stream completed', { 
            agentId, 
            processingTime,
            totalChunks: chunks
          }, 'agent-chat');
          
        } catch (error: any) {
          const processingTime = Date.now() - startTime;
          logger.error('Chat stream error', error, { agentId, clientId, processingTime }, 'agent-chat');
          const errorData = JSON.stringify({ 
            error: error?.message ?? 'LLM_ERROR',
            agentId,
            timestamp: new Date().toISOString()
          });
          controller.enqueue(encoder.encode(`event: error\ndata: ${errorData}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        ...CORS_HEADERS,
      },
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    logger.error('Chat request failed', error, { agentId, clientId, processingTime }, 'agent-chat');
    return createErrorResponse('LLM_ERROR: ' + (error?.message || 'Unknown error occurred'), 500, 'LLM_ERROR');
  }
}

export async function OPTIONS() {
  return handleCORS();
}

export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params;
  return new NextResponse(JSON.stringify({
    service: 'Agent Chat (Vercel AI SDK)',
    agentId,
    model: process.env.MODEL_NAME ?? 'gemini-2.5-flash',
    streaming: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}