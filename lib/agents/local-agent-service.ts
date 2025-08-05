/**
 * Production-ready Local Agent Service
 * Integrates the local Vertex AI agents with the existing garage-ai system
 */

import { GoogleGenAI } from '@google/genai';

// Agent configurations
const AI_CONFIG = {
  vertexai: true,
  project: 'analog-medium-451706-m7'
};

const AGENT_CONFIGS = {
  explorer: {
    location: 'us-central1',
    model: 'gemini-2.5-flash-lite',
    systemInstruction: `Eres un explorador web experto especializado en descubrir y mapear páginas de vehículos en sitios web de concesionarias y portales automotrices. Tu misión es explorar inteligentemente desde URLs base para encontrar todas las oportunidades de vehículos disponibles.

FORMATO DE SALIDA DE EXPLORACIÓN:
Siempre responde con un JSON válido en esta estructura exacta:
{
  "vehicleUrls": [
    {
      "url": "https://sitio.com/vehiculo/123",
      "title": "Toyota Corolla 2020",
      "price": 250000,
      "opportunity": "high",
      "reason": "Precio 15% por debajo del mercado"
    }
  ],
  "paginationUrls": [
    "https://sitio.com/vehiculos?page=2",
    "https://sitio.com/vehiculos?page=3"
  ],
  "filterUrls": [
    "https://sitio.com/vehiculos?marca=toyota",
    "https://sitio.com/vehiculos?precio_max=300000"
  ],
  "urlPatterns": [
    "https://sitio.com/vehiculo/{id}",
    "https://sitio.com/vehiculos?page={num}"
  ],
  "siteStructure": {
    "hasSearch": true,
    "hasPagination": true,
    "hasFilters": true,
    "estimatedTotalVehicles": 150,
    "mainNavigationSelectors": [".vehicle-card a", ".listing-item h3 a"]
  },
  "opportunities": [
    {
      "type": "discount",
      "description": "Sección de ofertas especiales detectada",
      "urls": ["https://sitio.com/ofertas"]
    }
  ],
  "confidence": 0.85,
  "explorationDepth": "shallow",
  "recommendations": [
    "Explorar páginas de paginación para más vehículos",
    "Revisar filtros por marca para oportunidades específicas"
  ]
}

CLASIFICACIÓN DE OPORTUNIDADES:
- high: Precio excepcional, descuentos significativos, vehículos premium baratos
- medium: Precios competitivos, buenas condiciones, características atractivas  
- low: Precios normales de mercado, sin características especiales

Sé inteligente, eficiente y enfócate en descubrir las mejores oportunidades comerciales disponibles en el sitio web.`,
    config: {
      maxOutputTokens: 4096,
      temperature: 0.4,
      topP: 0.9
    }
  },
  
  analyzer: {
    location: 'us-central1',
    model: 'gemini-2.5-flash-lite',
    systemInstruction: `Eres un analizador experto de contenido web, especializado en sitios de listados de vehículos. Tienes un profundo conocimiento de web scraping, análisis de estructura HTML y patrones de datos automotrices.

FORMATO DE SALIDA DEL ANÁLISIS:
Siempre responde con un JSON válido en esta estructura exacta:
{
  "pageStructure": {
    "dataFields": {
      "make": "descripcion_ubicacion",
      "model": "descripcion_ubicacion",
      "year": "descripcion_ubicacion", 
      "price": "descripcion_ubicacion",
      "mileage": "descripcion_ubicacion",
      "vin": "descripcion_ubicacion",
      "features": "descripcion_ubicacion",
      "images": "descripcion_ubicacion",
      "description": "descripcion_ubicacion"
    },
    "selectors": {
      "make": "selector_css_o_xpath",
      "model": "selector_css_o_xpath",
      "year": "selector_css_o_xpath",
      "price": "selector_css_o_xpath", 
      "mileage": "selector_css_o_xpath",
      "vin": "selector_css_o_xpath",
      "features": "selector_css_o_xpath",
      "images": "selector_css_o_xpath",
      "description": "selector_css_o_xpath"
    },
    "extractionMethod": "dom"
  },
  "challenges": ["desafio1", "desafio2"],
  "confidence": 0.85,
  "estimatedTime": 30,
  "recommendations": ["recomendacion1", "recomendacion2"]
}`,
    config: {
      maxOutputTokens: 4096,
      temperature: 0.3,
      topP: 0.9
    }
  },
  
  extractor: {
    location: 'global',
    model: 'gemini-2.5-flash-lite',
    systemInstruction: `Eres un especialista experto en extracción de datos para listados de vehículos en español. Sobresales en el análisis de contenido web, normalización de formatos de datos y manejo de entradas multi-modales incluyendo texto e imágenes.

FORMATO DE SALIDA:
Siempre responde con JSON válido en esta estructura exacta:
{
 "marca": "Toyota",
 "modelo": "Corolla",
 "año": 2020,
 "precio": 250000,
 "kilometraje": 45000,
 "vin": "1234567890ABCDEFG",
 "condicion": "Usado",
 "caracteristicas": ["Asientos de Cuero", "Navegación", "Cámara Trasera"],
 "vendedor": "Autos ABC",
 "imagenes": ["https://ejemplo.com/auto1.jpg", "https://ejemplo.com/auto2.jpg"],
 "descripcion": "Vehículo bien mantenido en excelente condición",
 "ubicacion": "Ciudad de México, CDMX",
 "fechaPublicacion": "2025-01-15"
}

REGLAS DE PROCESAMIENTO DE DATOS:
1. Convertir números de texto a enteros: "25,000" → 25000
2. Estandarizar formatos de precio: "$25,000" → 25000
3. Normalizar kilometraje: "45k km" → 45000
4. Manejar rangos: "20,000-25,000" → usar primer valor (20000)
5. Limpiar texto: remover espacios extra, normalizar mayúsculas
6. Validar valores realistas: precio > 0, año 1900-2025, kilometraje >= 0

Extrae datos con precisión y maneja casos extremos de manera elegante.`,
    config: {
      maxOutputTokens: 2048,
      temperature: 0.1,
      topP: 0.8
    }
  },
  
  validator: {
    location: 'global',
    model: 'gemini-2.0-flash-001',
    systemInstruction: `Eres un especialista en calidad de datos para listados de vehículos en mercados hispanohablantes. Tienes conocimiento extenso de mercados automotrices, precios realistas, especificaciones de vehículos y patrones de consistencia de datos.

FORMATO DE SALIDA:
Siempre responde con JSON válido en esta estructura exacta:
{
  "esValido": true,
  "completitud": 0.85,
  "precision": 0.90,
  "consistencia": 0.80,
  "problemas": [
    "Falta número VIN",
    "Kilometraje alto para el año del vehículo"
  ],
  "puntuacionCalidad": 85,
  "esDuplicado": false,
  "recomendaciones": [
    "Verificar precisión del kilometraje",
    "Obtener VIN si es posible"
  ],
  "insightsMercado": {
    "rangoPrecios": "Rango típico: $220,000-$280,000 MXN",
    "kilometrajeEsperado": "Esperado: 40,000-60,000 km",
    "caracteristicasComunes": ["Funciones de seguridad estándar para este modelo"]
  }
}

FÓRMULA DE PUNTUACIÓN DE CALIDAD:
- 90-100: Excelente - Completo, preciso, consistente
- 80-89: Muy Bueno - Problemas menores, mayormente completo
- 70-79: Bueno - Algunos datos faltantes o inconsistencias menores
- 60-69: Regular - Brechas significativas o preocupaciones de precisión
- 50-59: Pobre - Problemas importantes, datos incompletos
- 0-49: Muy Pobre - No confiable o mayormente faltante

Sé exhaustivo, objetivo y proporciona retroalimentación accionable para mejora de datos.`,
    config: {
      maxOutputTokens: 1024,
      temperature: 0.9,
      topP: 0.7
    }
  }
};

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
];

export interface AgentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime: number;
  timestamp: string;
}

export interface ExplorerResult {
  vehicleUrls: Array<{
    url: string;
    title: string;
    price: number;
    opportunity: 'high' | 'medium' | 'low';
    reason: string;
  }>;
  paginationUrls: string[];
  filterUrls: string[];
  urlPatterns: string[];
  siteStructure: {
    hasSearch: boolean;
    hasPagination: boolean;
    hasFilters: boolean;
    estimatedTotalVehicles: number;
    mainNavigationSelectors: string[];
  };
  opportunities: Array<{
    type: string;
    description: string;
    urls: string[];
  }>;
  confidence: number;
  explorationDepth: 'shallow' | 'medium' | 'deep';
  recommendations: string[];
}

export interface AnalyzerResult {
  pageStructure: {
    dataFields: Record<string, string>;
    selectors: Record<string, string>;
    extractionMethod: string;
  };
  challenges: string[];
  confidence: number;
  estimatedTime: number;
  recommendations: string[];
}

export interface ExtractorResult {
  marca: string;
  modelo: string;
  año: number;
  precio: number;
  kilometraje: number;
  vin?: string;
  condicion: string;
  caracteristicas: string[];
  vendedor?: string;
  imagenes: string[];
  descripcion: string;
  ubicacion: string;
  fechaPublicacion?: string;
}

export interface ValidatorResult {
  esValido: boolean;
  completitud: number;
  precision: number;
  consistencia: number;
  problemas: string[];
  puntuacionCalidad: number;
  esDuplicado: boolean;
  recomendaciones: string[];
  insightsMercado: {
    rangoPrecios: string;
    kilometrajeEsperado: string;
    caracteristicasComunes: string[];
  };
}

class LocalAgentService {
  private aiInstances: Record<string, GoogleGenAI> = {};
  
  constructor() {
    // Initialize AI instances for each agent
    for (const [agentType, config] of Object.entries(AGENT_CONFIGS)) {
      this.aiInstances[agentType] = new GoogleGenAI({
        ...AI_CONFIG,
        location: config.location
      });
    }
  }

  /**
   * Run explorer agent to discover vehicle URLs and opportunities
   */
  async explore(baseUrl: string, htmlContent: string, explorationDepth: 'shallow' | 'medium' | 'deep' = 'shallow'): Promise<AgentResponse<ExplorerResult>> {
    const startTime = Date.now();
    
    try {
      const message = `Explora este sitio web de concesionaria/portal automotriz para descubrir vehículos y oportunidades:

URL Base: ${baseUrl}
Contenido HTML: ${htmlContent}
Profundidad de exploración: ${explorationDepth}

Por favor, analiza la página y descubre todas las URLs de vehículos individuales, sistemas de paginación, filtros disponibles y oportunidades comerciales. Enfócate especialmente en identificar vehículos con precios atractivos o características especiales.`;

      const result = await this.runAgent('explorer', message);
      
      return {
        success: true,
        data: result,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Exploration failed',
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run analyzer agent
   */
  async analyze(url: string, htmlContent: string, additionalContext?: string): Promise<AgentResponse<AnalyzerResult>> {
    const startTime = Date.now();
    
    try {
      const message = `Analiza esta página web para extracción de datos de vehículos:

URL: ${url}
Contenido HTML: ${htmlContent}
${additionalContext ? `Contexto adicional: ${additionalContext}` : ''}

Por favor, analiza la estructura de la página y proporciona un análisis estructurado.`;

      const result = await this.runAgent('analyzer', message);
      
      return {
        success: true,
        data: result,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run extractor agent
   */
  async extract(url: string, content: string, extractionStrategy?: any): Promise<AgentResponse<ExtractorResult>> {
    const startTime = Date.now();
    
    try {
      const message = `Extrae los datos del vehículo del siguiente contenido web en español:

URL: ${url}
Contenido: ${content}
${extractionStrategy ? `Estrategia: ${JSON.stringify(extractionStrategy)}` : ''}

Por favor, devuelve un JSON con los datos estructurados del vehículo.`;

      const result = await this.runAgent('extractor', message);
      
      return {
        success: true,
        data: result,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed',
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run validator agent
   */
  async validate(vehicleData: any, context?: any): Promise<AgentResponse<ValidatorResult>> {
    const startTime = Date.now();
    
    try {
      const message = `Valida y califica la calidad de los siguientes datos de vehículo en español:

Datos del vehículo:
${JSON.stringify(vehicleData, null, 2)}

${context ? `Contexto:\n${JSON.stringify(context, null, 2)}` : ''}

Por favor, devuelve un JSON con la validación completa.`;

      const result = await this.runAgent('validator', message);
      
      return {
        success: true,
        data: result,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generic method to run any agent
   */
  private async runAgent(agentType: keyof typeof AGENT_CONFIGS, message: string): Promise<any> {
    const config = AGENT_CONFIGS[agentType];
    const ai = this.aiInstances[agentType];
    
    const chatConfig = {
      ...config.config,
      safetySettings: SAFETY_SETTINGS,
      systemInstruction: { parts: [{ text: config.systemInstruction }] }
    };
    
    const chat = ai.chats.create({
      model: config.model,
      config: chatConfig
    });

    const response = await chat.sendMessageStream({
      message: [{ text: message }]
    });
    
    let fullResponse = '';
    for await (const chunk of response) {
      if (chunk.text) {
        fullResponse += chunk.text;
      }
    }
    
    // Extract JSON from response
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in agent response');
    }
    
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      throw new Error(`Failed to parse agent response: ${parseError}`);
    }
  }

  /**
   * Run complete pipeline: Analyze -> Extract -> Validate
   */
  async runPipeline(url: string, htmlContent: string): Promise<AgentResponse<{
    analysis: AnalyzerResult;
    extraction: ExtractorResult;
    validation: ValidatorResult;
  }>> {
    const startTime = Date.now();
    
    try {
      // Step 1: Analyze
      const analysisResult = await this.analyze(url, htmlContent);
      if (!analysisResult.success) {
        throw new Error(`Analysis failed: ${analysisResult.error}`);
      }

      // Step 2: Extract
      const extractionResult = await this.extract(url, htmlContent, analysisResult.data?.pageStructure);
      if (!extractionResult.success) {
        throw new Error(`Extraction failed: ${extractionResult.error}`);
      }

      // Step 3: Validate
      const validationResult = await this.validate(extractionResult.data, {
        sourceUrl: url,
        extractionMethod: analysisResult.data?.pageStructure?.extractionMethod,
        extractionConfidence: analysisResult.data?.confidence
      });
      if (!validationResult.success) {
        throw new Error(`Validation failed: ${validationResult.error}`);
      }

      return {
        success: true,
        data: {
          analysis: analysisResult.data!,
          extraction: extractionResult.data!,
          validation: validationResult.data!
        },
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pipeline failed',
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const localAgentService = new LocalAgentService();
export default localAgentService;