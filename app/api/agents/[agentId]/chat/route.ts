/**
 * Agent Chat API Route - Streaming SSE text generation
 * Uses Vercel AI SDK with Gemini 2.5 Flash for chat streaming
 */

import { NextRequest, NextResponse } from 'next/server';
import { streamText, type Message } from 'ai';
import { getModel, defaultGenConfig } from '@/lib/ai/google';

interface ChatRequest {
  messages: Message[];
  temperature?: number;
  maxOutputTokens?: number;
}

export async function POST(request: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const { agentId } = params;
    const body: ChatRequest = await request.json();
    const { messages, temperature, maxOutputTokens } = body;

    // Validate required fields
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages debe ser un array [{role, content}]' },
        { status: 400 }
      );
    }

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const { textStream, usage } = await streamText({
            model: getModel(),
            messages: messages as Message[],
            temperature: temperature ?? defaultGenConfig.temperature,
            maxOutputTokens: maxOutputTokens ?? defaultGenConfig.maxOutputTokens,
          });

          // Stream each text delta
          for await (const delta of textStream) {
            const data = JSON.stringify({ delta, agentId });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Send final event with usage data
          const finalData = JSON.stringify({ 
            usage, 
            agentId,
            model: process.env.MODEL_NAME ?? 'gemini-2.5-flash',
            timestamp: new Date().toISOString()
          });
          controller.enqueue(encoder.encode(`event: end\ndata: ${finalData}\n\n`));
          
        } catch (error: any) {
          console.error('Chat stream error:', error);
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
        // CORS headers
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { 
        error: 'LLM_ERROR', 
        detail: error?.message || 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params;
  return NextResponse.json({
    service: 'Agent Chat (Vercel AI SDK)',
    agentId,
    model: process.env.MODEL_NAME ?? 'gemini-2.5-flash',
    streaming: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}