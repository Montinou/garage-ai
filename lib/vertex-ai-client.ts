/**
 * Vertex AI Client for Google Cloud Integration
 * Using the Vertex AI REST API for direct model calls
 */

import { GoogleAuth } from 'google-auth-library';

export interface VertexAIConfig {
  projectId: string;
  location: string;
  model: string;
}

export interface GenerationConfig {
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  topK: number;
}

export interface SafetySetting {
  category: string;
  threshold: string;
}

export class VertexAIClient {
  private config: VertexAIConfig;
  private auth: GoogleAuth;
  private baseUrl: string;

  constructor(config: VertexAIConfig) {
    this.config = config;
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    this.baseUrl = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/google/models`;
  }

  async generateContent(
    prompt: string,
    generationConfig: GenerationConfig = {
      temperature: 0.3,
      maxOutputTokens: 4096,
      topP: 0.9,
      topK: 30
    },
    safetySettings: SafetySetting[] = [
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
  ): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();
      
      const endpoint = `${this.baseUrl}/${this.config.model}:generateContent`;
      
      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig,
        safetySettings
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.candidates || result.candidates.length === 0) {
        throw new Error('No response generated from Vertex AI');
      }

      const candidate = result.candidates[0];
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('Invalid response structure from Vertex AI');
      }

      return candidate.content.parts[0].text;

    } catch (error) {
      console.error('Vertex AI generation failed:', error);
      throw error;
    }
  }

  async generateStructuredContent<T>(
    prompt: string,
    schema: object,
    generationConfig?: GenerationConfig
  ): Promise<T> {
    const structuredPrompt = `${prompt}\n\nRespond with valid JSON only, following this schema: ${JSON.stringify(schema, null, 2)}`;
    
    const responseText = await this.generateContent(structuredPrompt, generationConfig);
    
    try {
      return JSON.parse(responseText) as T;
    } catch (error) {
      console.error('Failed to parse JSON response:', responseText);
      throw new Error('Invalid JSON response from Vertex AI');
    }
  }

  async generateWithImages(
    prompt: string,
    imageData: string[], // Base64 encoded images
    generationConfig?: GenerationConfig
  ): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Use gemini-pro-vision for image analysis
      const visionModel = this.config.model.includes('vision') 
        ? this.config.model 
        : 'gemini-1.5-pro-vision-002';
      
      const endpoint = `${this.baseUrl}/${visionModel}:generateContent`;
      
      const parts = [{ text: prompt }];
      
      // Add images to the parts
      for (const imageBase64 of imageData) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64
          }
        });
      }

      const requestBody = {
        contents: [
          {
            role: 'user',
            parts
          }
        ],
        generationConfig: generationConfig || {
          temperature: 0.2,
          maxOutputTokens: 4096,
          topP: 0.9,
          topK: 30
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vertex AI Vision API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result.candidates[0].content.parts[0].text;

    } catch (error) {
      console.error('Vertex AI vision analysis failed:', error);
      throw error;
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const client = await this.auth.getClient();
      const accessToken = await client.getAccessToken();
      
      if (!accessToken.token) {
        throw new Error('Failed to get access token');
      }
      
      return accessToken.token;
    } catch (error) {
      console.error('Failed to get access token:', error);
      throw error;
    }
  }
}

// Pre-configured clients for different models
export const createAnalyzerClient = () => new VertexAIClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'analog-medium-451706-m7',
  location: process.env.VERTEX_AI_LOCATION || 'us-central1',
  model: 'gemini-1.5-flash-002'
});

export const createExtractorClient = () => new VertexAIClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'analog-medium-451706-m7',
  location: process.env.VERTEX_AI_LOCATION || 'us-central1',
  model: 'gemini-1.5-flash-002'
});

export const createValidatorClient = () => new VertexAIClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'analog-medium-451706-m7',
  location: process.env.VERTEX_AI_LOCATION || 'us-central1',
  model: 'gemini-1.5-flash-002'
});

export const createVisionClient = () => new VertexAIClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'analog-medium-451706-m7',
  location: process.env.VERTEX_AI_LOCATION || 'us-central1',
  model: 'gemini-1.5-pro-vision-002'
});