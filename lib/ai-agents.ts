/**
 * AI Agents - Direct Vertex AI Integration
 * Clean, focused implementation using the original agent configurations
 */

import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

// Initialize Vertex AI
const ai = new GoogleGenAI({
  vertexai: true,
  project: 'analog-medium-451706-m7',
  location: 'us-central1'
});

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
];

/**
 * Analyzer Agent - Analyzes web content structure
 */
export async function analyzeContent(url: string, htmlContent: string): Promise<Record<string, unknown>> {
  const systemInstruction = `Eres un analizador experto de contenido web, especializado en sitios de listados de vehículos.

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
}`;

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash-lite',
    config: {
      maxOutputTokens: 4096,
      temperature: 0.3,
      topP: 0.9,
      safetySettings: SAFETY_SETTINGS,
      systemInstruction: { parts: [{ text: systemInstruction }] }
    }
  });

  const message = `Analiza esta página web para extracción de datos de vehículos:

URL: ${url}
Contenido HTML: ${htmlContent.substring(0, 8000)}

Por favor, analiza la estructura de la página y proporciona un análisis estructurado.`;

  const response = await chat.sendMessageStream({ message: [{ text: message }] });
  
  let fullResponse = '';
  for await (const chunk of response) {
    if (chunk.text) {
      fullResponse += chunk.text;
    }
  }
  
  // Extract JSON from response
  const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in analyzer response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

/**
 * Extractor Agent - Extracts vehicle data
 */
export async function extractVehicleData(url: string, content: string): Promise<Record<string, unknown>> {
  const systemInstruction = `Eres un especialista experto en extracción de datos para listados de vehículos en español.

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
 "imagenes": ["https://ejemplo.com/auto1.jpg"],
 "descripcion": "Vehículo bien mantenido en excelente condición",
 "ubicacion": "Ciudad de México, CDMX",
 "fechaPublicacion": "2025-01-15"
}

REGLAS DE PROCESAMIENTO:
1. Convertir números de texto a enteros: "25,000" → 25000
2. Estandarizar formatos de precio: "$25,000" → 25000  
3. Normalizar kilometraje: "45k km" → 45000
4. Validar valores realistas: precio > 0, año 1900-2025`;

  const aiGlobal = new GoogleGenAI({
    vertexai: true,
    project: 'analog-medium-451706-m7',
    location: 'global'
  });

  const chat = aiGlobal.chats.create({
    model: 'gemini-2.5-flash-lite',
    config: {
      maxOutputTokens: 2048,
      temperature: 0.1,
      topP: 0.8,
      safetySettings: SAFETY_SETTINGS,
      systemInstruction: { parts: [{ text: systemInstruction }] }
    }
  });

  const message = `Extrae los datos del vehículo del siguiente contenido web en español:

URL: ${url}
Contenido: ${content.substring(0, 8000)}

Por favor, devuelve un JSON con los datos estructurados del vehículo.`;

  const response = await chat.sendMessageStream({ message: [{ text: message }] });
  
  let fullResponse = '';
  for await (const chunk of response) {
    if (chunk.text) {
      fullResponse += chunk.text;
    }
  }
  
  // Extract JSON from response
  const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in extractor response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

/**
 * Explorer Agent - Discovers vehicle URLs intelligently
 */
export async function exploreWebsite(baseUrl: string, htmlContent: string): Promise<Record<string, unknown>> {
  const systemInstruction = `Eres un explorador web experto. Tu misión es ANALIZAR INTELIGENTEMENTE los enlaces reales disponibles en la página, NO generar URLs aleatorias.

FORMATO DE SALIDA:
Siempre responde con un JSON válido en esta estructura exacta:
{
  "vehicleUrls": [
    {
      "url": "https://sitio.com/vehiculo/123",
      "title": "Toyota Corolla 2020",
      "price": "250000",
      "opportunity": "high",
      "reason": "Precio atractivo"
    }
  ],
  "paginationUrls": [
    "https://sitio.com/vehiculos?page=2"
  ],
  "explorationStats": {
    "vehiclesFound": 12,
    "pagesAnalyzed": 1,
    "opportunitiesFound": 3
  }
}

ENFOQUE INTELIGENTE:
- Analiza los enlaces HTML reales que existen en la página
- Identifica patrones de navegación reales del sitio  
- NO generes IDs aleatorios ni URLs especulativas`;

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash-lite',
    config: {
      maxOutputTokens: 4096,
      temperature: 0.4,
      topP: 0.9,
      safetySettings: SAFETY_SETTINGS,
      systemInstruction: { parts: [{ text: systemInstruction }] }
    }
  });

  const message = `Explora este sitio web de concesionaria para descubrir vehículos:

URL Base: ${baseUrl}
Contenido HTML: ${htmlContent.substring(0, 8000)}

Analiza la página y descubre todas las URLs de vehículos individuales y sistemas de paginación.`;

  const response = await chat.sendMessageStream({ message: [{ text: message }] });
  
  let fullResponse = '';
  for await (const chunk of response) {
    if (chunk.text) {
      fullResponse += chunk.text;
    }
  }
  
  // Extract JSON from response
  const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in explorer response');
  }
  
  return JSON.parse(jsonMatch[0]);
}