/**
 * Google AI Provider Configuration for Vercel AI SDK
 * Centralized configuration for Gemini 2.5 Flash model
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

// Lazy initialization to avoid build-time issues
let googleProvider: ReturnType<typeof createGoogleGenerativeAI> | null = null;
let modelInstance: ReturnType<ReturnType<typeof createGoogleGenerativeAI>> | null = null;

function getGoogleProvider() {
  if (!googleProvider) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
    }
    
    googleProvider = createGoogleGenerativeAI({ 
      apiKey,
      // Use Vertex AI if available
      baseURL: process.env.GOOGLE_AI_BASE_URL
    });
  }
  return googleProvider;
}

// Lazy model getter
export function getModel() {
  if (!modelInstance) {
    const provider = getGoogleProvider();
    modelInstance = provider(process.env.MODEL_NAME ?? 'gemini-2.5-flash');
  }
  return modelInstance;
}

// Default generation configuration
export const defaultGenConfig = {
  temperature: Number(process.env.AI_TEMPERATURE ?? 0.3),
  maxOutputTokens: Number(process.env.MAX_OUTPUT_TOKENS ?? 2048),
};

// Helper to validate model availability
export async function validateModel() {
  try {
    // Simple test to validate the model configuration
    const result = await generateText({
      model: getModel(),
      prompt: 'Test',
      maxOutputTokens: 10,
    });
    return { success: true, model: process.env.MODEL_NAME ?? 'gemini-2.5-flash' };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      model: process.env.MODEL_NAME ?? 'gemini-2.5-flash'
    };
  }
}