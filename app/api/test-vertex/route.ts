/**
 * Test Vertex AI Integration
 * Simple endpoint to verify Vertex AI connectivity
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAnalyzerClient } from '@/lib/vertex-ai-client';

export async function GET() {
  try {
    console.log('🧪 Testing Vertex AI connection...');
    
    const client = createAnalyzerClient();
    
    const testPrompt = `You are a test agent. Respond with valid JSON containing:
{
  "status": "working",
  "message": "Vertex AI connection successful",
  "timestamp": "${new Date().toISOString()}",
  "model": "gemini-1.5-flash-002"
}`;

    const startTime = Date.now();
    const response = await client.generateContent(testPrompt, {
      temperature: 0.1,
      maxOutputTokens: 256,
      topP: 0.8,
      topK: 10
    });
    const responseTime = Date.now() - startTime;

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (e) {
      parsedResponse = {
        status: 'working',
        message: 'Response received but not valid JSON',
        rawResponse: response.substring(0, 200),
        timestamp: new Date().toISOString()
      };
    }

    console.log('✅ Vertex AI test successful');

    return NextResponse.json({
      success: true,
      vertexAI: parsedResponse,
      responseTime,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.VERTEX_AI_LOCATION,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Vertex AI test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.VERTEX_AI_LOCATION,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, agentType = 'analyzer' } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing ${agentType} agent with custom prompt`);

    const client = createAnalyzerClient(); // You can create different clients based on agentType
    
    const startTime = Date.now();
    const response = await client.generateContent(prompt);
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      prompt,
      response,
      responseTime,
      agentType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Custom prompt test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}