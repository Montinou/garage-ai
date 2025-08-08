/**
 * Agent Complete API Route - Non-streaming text generation
 * Uses Vercel AI SDK with Gemini 2.5 Flash for completion tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { getModel, defaultGenConfig } from '@/lib/ai/google';

interface CompleteRequest {
  prompt: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export async function POST(request: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const { agentId } = params;
    const body: CompleteRequest = await request.json();
    const { prompt, system, temperature, maxOutputTokens } = body;

    // Validate required fields
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'prompt requerido' },
        { status: 400 }
      );
    }

    // Construct the final prompt with system message if provided
    const finalPrompt = system ? `<SYSTEM>${system}</SYSTEM>\n${prompt}` : prompt;

    // Generate text using Vercel AI SDK
    const result = await generateText({
      model: getModel(),
      prompt: finalPrompt,
      temperature: temperature ?? defaultGenConfig.temperature,
      maxOutputTokens: maxOutputTokens ?? defaultGenConfig.maxOutputTokens,
    });

    return NextResponse.json({
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage,
      model: process.env.MODEL_NAME ?? 'gemini-2.5-flash',
      agentId,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Complete error:', error);
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

export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params;
  return NextResponse.json({
    service: 'Agent Complete (Vercel AI SDK)',
    agentId,
    model: process.env.MODEL_NAME ?? 'gemini-2.5-flash',
    streaming: false,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}