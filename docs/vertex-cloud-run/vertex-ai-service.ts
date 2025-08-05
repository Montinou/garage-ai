// lib/ai/vertex-ai-service.ts
import { VertexAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { config } from '../config';

/**
 * Configuration for Vertex AI model generation
 */
interface GenerationConfig {
  maxOutputTokens: number;
  temperature: number;
  topP: number;
  topK?: number;
}

/**
 * Vehicle analysis result structure
 */
export interface VehicleAnalysis {
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  features?: string[];
  condition?: string;
  location?: string;
  seller?: string;
  description?: string;
  imageUrls?: string[];
  confidence?: number;
}

/**
 * Content analysis result for web pages
 */
export interface ContentAnalysis {
  pageType: 'listing' | 'detail' | 'search' | 'other';
  dataStructure: 'table' | 'grid' | 'list' | 'mixed';
  extractionStrategy: string;
  selectors?: {
    container?: string;
    items?: string;
    fields?: Record<string, string>;
  };
  challenges?: string[];
  confidence: number;
}

/**
 * Extraction strategy recommendation
 */
export interface ExtractionStrategy {
  method: 'css' | 'xpath' | 'regex' | 'ai' | 'hybrid';
  selectors?: Record<string, string>;
  patterns?: Record<string, string>;
  steps: string[];
  estimatedAccuracy: number;
  fallbackStrategies?: ExtractionStrategy[];
}

/**
 * Service class for interacting with Vertex AI using Gemini 2.0 Flash
 */
export class VertexAIService {
  private vertexAI: VertexAI;
  private model: GenerativeModel;
  private readonly defaultConfig: GenerationConfig;
  
  constructor() {
    // Initialize Vertex AI client
    this.vertexAI = new VertexAI({
      project: config.getEnvVar('GCP_PROJECT_ID'),
      location: config.getEnvVar('GCP_LOCATION', 'us-central1')
    });
    
    // Default generation configuration
    this.defaultConfig = {
      maxOutputTokens: parseInt(config.getEnvVar('VERTEX_AI_MAX_TOKENS', '8192')),
      temperature: parseFloat(config.getEnvVar('VERTEX_AI_TEMPERATURE', '0.3')),
      topP: parseFloat(config.getEnvVar('VERTEX_AI_TOP_P', '0.95')),
      topK: parseInt(config.getEnvVar('VERTEX_AI_TOP_K', '40'))
    };
    
    // Initialize Gemini 2.0 Flash model
    this.model = this.vertexAI.getGenerativeModel({
      model: config.getEnvVar('VERTEX_AI_MODEL', 'gemini-2.0-flash-latest'),
      generationConfig: this.defaultConfig,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
        }
      ]
    });
  }
  
  /**
   * Generate content using the Vertex AI model
   */
  async generateContent(
    prompt: string, 
    config?: Partial<GenerationConfig>
  ): Promise<string> {
    try {
      const generationConfig = { ...this.defaultConfig, ...config };
      
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      });
      
      const response = result.response;
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No response generated from Vertex AI');
      }
      
      return response.candidates[0].content.parts[0].text || '';
    } catch (error) {
      console.error('Vertex AI generation error:', error);
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }
  
  /**
   * Analyze vehicle content and extract structured data
   */
  async analyzeVehicleContent(content: string): Promise<VehicleAnalysis> {
    const prompt = `
      Analiza el siguiente contenido de una publicación de vehículo y extrae toda la información relevante.
      
      CONTENIDO:
      ${content}
      
      INSTRUCCIONES:
      1. Extrae todos los datos disponibles sobre el vehículo
      2. Si no encuentras un dato específico, omítelo del resultado
      3. Para el precio, extrae solo el valor numérico sin símbolos de moneda
      4. Para el kilometraje, extrae solo el valor numérico
      5. Las características deben ser un array de strings
      
      Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
      {
        "brand": "string",
        "model": "string", 
        "year": number,
        "price": number,
        "mileage": number,
        "features": ["string"],
        "condition": "string",
        "location": "string",
        "seller": "string",
        "description": "string",
        "imageUrls": ["string"],
        "confidence": number (0-1)
      }
    `;
    
    try {
      const response = await this.generateContent(prompt, { temperature: 0.1 });
      return JSON.parse(response) as VehicleAnalysis;
    } catch (error) {
      console.error('Failed to analyze vehicle content:', error);
      return { confidence: 0 };
    }
  }
  
  /**
   * Analyze web page structure for optimal extraction strategy
   */
  async analyzePageStructure(html: string, url: string): Promise<ContentAnalysis> {
    const prompt = `
      Analiza la estructura HTML de esta página web de vehículos y determina la mejor estrategia de extracción.
      
      URL: ${url}
      
      HTML (primeros 5000 caracteres):
      ${html.substring(0, 5000)}
      
      INSTRUCCIONES:
      1. Identifica el tipo de página (listing, detail, search, other)
      2. Determina la estructura de datos predominante
      3. Sugiere selectores CSS específicos si es posible
      4. Identifica posibles desafíos (captcha, lazy loading, etc)
      
      Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
      {
        "pageType": "listing|detail|search|other",
        "dataStructure": "table|grid|list|mixed",
        "extractionStrategy": "descripción de la estrategia recomendada",
        "selectors": {
          "container": "selector CSS del contenedor principal",
          "items": "selector CSS de los items individuales",
          "fields": {
            "title": "selector",
            "price": "selector",
            "year": "selector"
          }
        },
        "challenges": ["lista de desafíos identificados"],
        "confidence": 0.95
      }
    `;
    
    try {
      const response = await this.generateContent(prompt, { temperature: 0.2 });
      return JSON.parse(response) as ContentAnalysis;
    } catch (error) {
      console.error('Failed to analyze page structure:', error);
      return {
        pageType: 'other',
        dataStructure: 'mixed',
        extractionStrategy: 'fallback to AI extraction',
        challenges: ['analysis failed'],
        confidence: 0
      };
    }
  }
  
  /**
   * Generate extraction strategy based on analysis
   */
  async generateExtractionStrategy(
    analysis: ContentAnalysis,
    requirements?: string[]
  ): Promise<ExtractionStrategy> {
    const prompt = `
      Basándote en el siguiente análisis de página, genera una estrategia detallada de extracción de datos.
      
      ANÁLISIS:
      ${JSON.stringify(analysis, null, 2)}
      
      REQUISITOS ADICIONALES:
      ${requirements?.join('\n') || 'Ninguno'}
      
      Genera una estrategia paso a paso que incluya:
      1. Método principal de extracción
      2. Selectores o patrones específicos
      3. Pasos detallados de implementación
      4. Estrategias de fallback en caso de fallo
      
      Responde ÚNICAMENTE con un objeto JSON válido:
      {
        "method": "css|xpath|regex|ai|hybrid",
        "selectors": { "key": "value" },
        "patterns": { "key": "regex pattern" },
        "steps": ["paso 1", "paso 2"],
        "estimatedAccuracy": 0.9,
        "fallbackStrategies": []
      }
    `;
    
    try {
      const response = await this.generateContent(prompt, { temperature: 0.3 });
      return JSON.parse(response) as ExtractionStrategy;
    } catch (error) {
      console.error('Failed to generate extraction strategy:', error);
      return {
        method: 'ai',
        steps: ['Use AI extraction as fallback'],
        estimatedAccuracy: 0.7
      };
    }
  }
  
  /**
   * Validate extracted data for quality and completeness
   */
  async validateExtractedData(data: any[]): Promise<{
    valid: boolean;
    issues: string[];
    suggestions: string[];
    qualityScore: number;
  }> {
    const prompt = `
      Valida la calidad y completitud de los siguientes datos extraídos de vehículos.
      
      DATOS (primeros 10 registros):
      ${JSON.stringify(data.slice(0, 10), null, 2)}
      
      Evalúa:
      1. Completitud de campos importantes
      2. Consistencia del formato
      3. Valores sospechosos o erróneos
      4. Calidad general de los datos
      
      Responde ÚNICAMENTE con un objeto JSON:
      {
        "valid": boolean,
        "issues": ["lista de problemas encontrados"],
        "suggestions": ["lista de sugerencias de mejora"],
        "qualityScore": 0.85
      }
    `;
    
    try {
      const response = await this.generateContent(prompt, { temperature: 0.1 });
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to validate data:', error);
      return {
        valid: false,
        issues: ['Validation failed'],
        suggestions: ['Manual review required'],
        qualityScore: 0
      };
    }
  }
  
  /**
   * Process images using Gemini's multimodal capabilities
   */
  async analyzeVehicleImage(imageBase64: string): Promise<{
    vehicleDetected: boolean;
    details: Partial<VehicleAnalysis>;
    quality: 'high' | 'medium' | 'low';
  }> {
    const prompt = `
      Analiza esta imagen de vehículo y extrae información visible.
      
      Identifica:
      1. Marca y modelo si es visible
      2. Color y condición aparente
      3. Características visibles
      4. Calidad de la imagen
      
      Responde en formato JSON.
    `;
    
    try {
      const result = await this.model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
          ]
        }],
        generationConfig: { ...this.defaultConfig, temperature: 0.2 }
      });
      
      const response = result.response.candidates?.[0]?.content.parts[0].text || '{}';
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to analyze image:', error);
      return {
        vehicleDetected: false,
        details: {},
        quality: 'low'
      };
    }
  }
  
  /**
   * Generate SQL queries for complex data analysis
   */
  async generateAnalyticsQuery(
    request: string,
    schema: Record<string, string>
  ): Promise<string> {
    const prompt = `
      Genera una consulta SQL para el siguiente requerimiento de análisis.
      
      REQUERIMIENTO: ${request}
      
      ESQUEMA DE TABLA vehicles:
      ${Object.entries(schema).map(([col, type]) => `- ${col}: ${type}`).join('\n')}
      
      Genera SOLO la consulta SQL, sin explicaciones adicionales.
      La consulta debe ser compatible con PostgreSQL.
    `;
    
    const response = await this.generateContent(prompt, { temperature: 0.1 });
    return response.trim();
  }
  
  /**
   * Get service health status
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    model: string;
    projectId: string;
    location: string;
  }> {
    try {
      // Try a simple generation to verify the service is working
      await this.generateContent('Hello', { maxOutputTokens: 10 });
      
      return {
        healthy: true,
        model: config.getEnvVar('VERTEX_AI_MODEL', 'gemini-2.0-flash-latest'),
        projectId: config.getEnvVar('GCP_PROJECT_ID'),
        location: config.getEnvVar('GCP_LOCATION', 'us-central1')
      };
    } catch (error) {
      return {
        healthy: false,
        model: 'unknown',
        projectId: 'unknown',
        location: 'unknown'
      };
    }
  }
}