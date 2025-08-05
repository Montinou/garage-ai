/**
 * Vertex AI Client for Garage AI Production
 * Optimized for cost and performance
 */

import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';

export interface ModelConfig {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  topP?: number;
  topK?: number;
}

export interface VehicleData {
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  vin?: string;
  features: string[];
  condition: string;
  sellerInfo: string;
  imageUrls: string[];
  description: string;
  location: string;
  listingDate: string;
}

export interface AnalysisResult {
  pageStructure: {
    dataFields: { [key: string]: string };
    selectors: { [key: string]: string };
    extractionMethod: 'dom' | 'api' | 'ocr';
  };
  challenges: string[];
  confidence: number;
  estimatedTime: number;
}

export interface ValidationResult {
  isValid: boolean;
  completeness: number;
  accuracy: number;
  issues: string[];
  qualityScore: number;
  isDuplicate: boolean;
}

export class VertexAIClient {
  private vertexAI: VertexAI;
  private model: GenerativeModel;
  
  constructor(modelConfig: ModelConfig) {
    this.vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT!,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    });
    
    this.model = this.vertexAI.getGenerativeModel({
      model: modelConfig.model,
      generationConfig: {
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxOutputTokens,
        topP: modelConfig.topP || 0.9,
        topK: modelConfig.topK || 30
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_ONLY_HIGH'
        }
      ]
    });
  }
  
  async generateText(prompt: string): Promise<string> {
    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    const response = result.response;
    return response.text();
  }
  
  async generateStructured<T>(prompt: string, schema: object): Promise<T> {
    // For structured output, we use JSON mode
    const structuredPrompt = `${prompt}\n\nRespond with valid JSON only, following this schema: ${JSON.stringify(schema)}`;
    
    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: structuredPrompt }] }]
    });
    
    const responseText = result.response.text();
    
    try {
      return JSON.parse(responseText) as T;
    } catch (error) {
      console.error('Failed to parse JSON response:', responseText);
      throw new Error('Invalid JSON response from AI model');
    }
  }
  
  async analyzeWithImages(prompt: string, images: string[]): Promise<string> {
    const parts = [{ text: prompt }];
    
    for (const imageBase64 of images) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64
        }
      });
    }
    
    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts }]
    });
    
    return result.response.text();
  }
}

// Model configurations optimized for cost
export const MODEL_CONFIGS = {
  // Fast and cheap for content analysis
  ANALYZER: {
    model: 'gemini-1.5-flash-002',
    temperature: 0.3,
    maxOutputTokens: 4096,
    topP: 0.9,
    topK: 30
  },
  
  // Fast and cheap for data extraction  
  EXTRACTOR: {
    model: 'gemini-1.5-flash-002',
    temperature: 0.1,
    maxOutputTokens: 2048,
    topP: 0.8,
    topK: 20
  },
  
  // Deterministic for validation
  VALIDATOR: {
    model: 'gemini-1.5-flash-002',
    temperature: 0.0,
    maxOutputTokens: 1024,
    topP: 0.7,
    topK: 10
  },
  
  // Pro model only for complex vision tasks
  VISION: {
    model: 'gemini-1.5-pro-vision-002',
    temperature: 0.2,
    maxOutputTokens: 4096,
    topP: 0.9,
    topK: 30
  }
};

// JSON schemas for structured responses
export const SCHEMAS = {
  ANALYSIS: {
    type: 'object',
    properties: {
      pageStructure: {
        type: 'object',
        properties: {
          dataFields: { type: 'object' },
          selectors: { type: 'object' },
          extractionMethod: { type: 'string', enum: ['dom', 'api', 'ocr'] }
        }
      },
      challenges: { type: 'array', items: { type: 'string' } },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      estimatedTime: { type: 'number' }
    }
  },
  
  VEHICLE_DATA: {
    type: 'object',
    properties: {
      make: { type: 'string' },
      model: { type: 'string' },
      year: { type: 'number' },
      price: { type: 'number' },
      mileage: { type: 'number' },
      vin: { type: 'string' },
      features: { type: 'array', items: { type: 'string' } },
      condition: { type: 'string' },
      sellerInfo: { type: 'string' },
      imageUrls: { type: 'array', items: { type: 'string' } },
      description: { type: 'string' },
      location: { type: 'string' },
      listingDate: { type: 'string' }
    }
  },
  
  VALIDATION: {
    type: 'object',
    properties: {
      isValid: { type: 'boolean' },
      completeness: { type: 'number', minimum: 0, maximum: 1 },
      accuracy: { type: 'number', minimum: 0, maximum: 1 },
      issues: { type: 'array', items: { type: 'string' } },
      qualityScore: { type: 'number', minimum: 0, maximum: 100 },
      isDuplicate: { type: 'boolean' }
    }
  }
};