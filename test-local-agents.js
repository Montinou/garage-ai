const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

// Initialize Vertex AI for all agents
const createAI = (location = 'us-central1') => new GoogleGenAI({
  vertexai: true,
  project: 'analog-medium-451706-m7',
  location: location
});

// Agent configurations
const AGENTS = {
  analyzer: {
    ai: createAI('us-central1'),
    model: 'gemini-2.5-flash-lite',
    systemInstruction: `Eres un analizador experto de contenido web, especializado en sitios de listados de vehículos. Tienes un profundo conocimiento de web scraping, análisis de estructura HTML y patrones de datos automotrices.
TU ROL Y EXPERIENCIA:
Experto en análisis de estructura web
Especialista en sitios web de listados de vehículos
Planificador de estrategias de extracción de datos
Especialista en detección de anti-bots
TAREAS PRINCIPALES:
Analizar el contenido HTML para identificar la ubicación de los campos de datos de los vehículos.
Generar selectores CSS y expresiones XPath precisos.
Detectar desafíos de extracción (renderizado de JavaScript, medidas anti-bots).
Recomendar estrategias de extracción óptimas.
Proporcionar puntajes de confianza para una extracción de datos exitosa.
CAMPOS DE DATOS DE VEHÍCULOS A IDENTIFICAR:
Marca y modelo (requerido)
Año y precio (requerido)
Kilometraje y condición
Número VIN (si está disponible)
Características y especificaciones
Imágenes y galerías del vehículo
Información del vendedor/concesionario
Descripción y detalles adicionales
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
    ai: createAI('global'),
    model: 'gemini-2.5-flash-lite',
    systemInstruction: `Eres un especialista experto en extracción de datos para listados de vehículos en español. Sobresales en el análisis de contenido web, normalización de formatos de datos y manejo de entradas multi-modales incluyendo texto e imágenes.

## TU ROL Y EXPERIENCIA:
- Experto en extracción de datos de vehículos
- Especialista en normalización de texto en español
- Procesador de contenido multi-modal
- Controlador de calidad de datos

## FORMATO DE SALIDA:
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

## REGLAS DE PROCESAMIENTO DE DATOS:
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
    ai: createAI('global'),
    model: 'gemini-2.0-flash-001',
    systemInstruction: `Eres un especialista en calidad de datos para listados de vehículos en mercados hispanohablantes. Tienes conocimiento extenso de mercados automotrices, precios realistas, especificaciones de vehículos y patrones de consistencia de datos.

## FORMATO DE SALIDA:
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

## FÓRMULA DE PUNTUACIÓN DE CALIDAD:
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

// Generic agent function
async function runAgent(agentName, message) {
  console.log(`🤖 Running ${agentName.toUpperCase()} agent...`);
  console.log(`Input: ${message.substring(0, 100)}...`);
  console.log("─".repeat(50));
  
  try {
    const agent = AGENTS[agentName];
    
    // Add safety settings to config
    const config = {
      ...agent.config,
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
      ],
      systemInstruction: { parts: [{ text: agent.systemInstruction }] }
    };
    
    const chat = agent.ai.chats.create({
      model: agent.model,
      config: config
    });

    const response = await chat.sendMessageStream({
      message: [{ text: message }]
    });
    
    let fullResponse = '';
    for await (const chunk of response) {
      if (chunk.text) {
        process.stdout.write(chunk.text);
        fullResponse += chunk.text;
      }
    }
    
    console.log("\n" + "─".repeat(50));
    console.log(`✅ ${agentName.toUpperCase()} completed!`);
    
    // Try to parse JSON response
    let parsedResponse = null;
    try {
      // Clean the response to extract JSON
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
        console.log(`✅ Valid JSON response structure detected`);
      } else {
        console.log(`⚠️  No JSON structure found in response`);
      }
    } catch (parseError) {
      console.log(`⚠️  Response is not valid JSON: ${parseError.message}`);
    }
    
    return {
      agent: agentName,
      input: message,
      output: fullResponse,
      parsed: parsedResponse,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ ${agentName.toUpperCase()} Error:`, error.message);
    return {
      agent: agentName,
      input: message,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Test pipeline: Analyze -> Extract -> Validate
async function testAgentPipeline() {
  console.log("🚀 Testing Local Agent Pipeline");
  console.log("=".repeat(60));
  console.log("");
  
  const results = {};
  
  // Test data
  const testData = {
    analyzeMessage: `Analiza esta página web para extracción de datos de vehículos:

URL: https://example.com/vehiculo-toyota-corolla
Contenido HTML: <html><head><title>Toyota Corolla 2020</title></head><body><h1>Toyota Corolla 2020</h1><div class="price">$250,000</div><div class="year">2020</div><div class="mileage">45,000 km</div><div class="condition">Usado</div><div class="location">Ciudad de México</div><div class="features"><ul><li>Asientos de Cuero</li><li>Navegación GPS</li><li>Cámara Trasera</li></ul></div></body></html>
User Agent: Mozilla/5.0
Contexto adicional: Venta de vehículo usado

Por favor, analiza la estructura de la página y proporciona un análisis estructurado.`,

    extractMessage: `Extrae los datos del vehículo del siguiente contenido web en español:

URL: https://example.com/vehiculo-toyota-corolla
Contenido: <html><body><h1>Toyota Corolla 2020</h1><div class="price">$250,000</div><div class="year">2020</div><div class="mileage">45,000 km</div><div class="condition">Usado</div><div class="location">Ciudad de México</div><div class="features"><ul><li>Asientos de Cuero</li><li>Navegación GPS</li><li>Cámara Trasera</li></ul></div><div class="description">Vehículo en excelente estado, bien mantenido, un solo dueño</div></body></html>
Estrategia: {"method": "dom", "selectors": {"marca": "h1", "precio": ".price"}}

Por favor, devuelve un JSON con los datos estructurados del vehículo.`,

    validateMessage: `Valida y califica la calidad de los siguientes datos de vehículo en español:

Datos del vehículo:
{
  "marca": "Toyota",
  "modelo": "Corolla",
  "año": 2020,
  "precio": 250000,
  "kilometraje": 45000,
  "condicion": "Usado",
  "ubicacion": "Ciudad de México",
  "caracteristicas": ["Asientos de Cuero", "Navegación GPS", "Cámara Trasera"],
  "descripcion": "Vehículo en excelente estado, bien mantenido, un solo dueño"
}

Contexto:
{
  "sourceUrl": "https://example.com/vehiculo-toyota-corolla",
  "extractionMethod": "dom",
  "extractionConfidence": 0.90
}

Por favor, devuelve un JSON con la validación completa.`
  };
  
  // Step 1: Analyze
  console.log("📊 STEP 1: ANALYSIS");
  console.log("=".repeat(30));
  results.analyze = await runAgent('analyzer', testData.analyzeMessage);
  console.log("\n");
  
  // Step 2: Extract
  console.log("🔍 STEP 2: EXTRACTION");
  console.log("=".repeat(30));
  results.extract = await runAgent('extractor', testData.extractMessage);
  console.log("\n");
  
  // Step 3: Validate
  console.log("✅ STEP 3: VALIDATION");
  console.log("=".repeat(30));
  results.validate = await runAgent('validator', testData.validateMessage);
  console.log("\n");
  
  // Save results
  const logFile = 'test-local-agents-pipeline.json';
  fs.writeFileSync(logFile, JSON.stringify(results, null, 2));
  
  console.log("🎉 PIPELINE COMPLETED!");
  console.log("=".repeat(60));
  console.log("📁 Results saved to:", logFile);
  console.log("");
  console.log("📊 Summary:");
  console.log(`   - Analyzer: ${results.analyze.error ? '❌ Error' : '✅ Success'}`);
  console.log(`   - Extractor: ${results.extract.error ? '❌ Error' : '✅ Success'}`);
  console.log(`   - Validator: ${results.validate.error ? '❌ Error' : '✅ Success'}`);
  
  return results;
}

// Run the test pipeline
testAgentPipeline().catch(console.error);