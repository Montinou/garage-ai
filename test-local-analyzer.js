const { GoogleGenAI } = require('@google/genai');

// Initialize Vertex with your Cloud project and location
const ai = new GoogleGenAI({
  vertexai: true,
  project: 'analog-medium-451706-m7',
  location: 'us-central1'
});
const model = 'gemini-2.5-flash-lite';

const siText1 = {text: `Eres un analizador experto de contenido web, especializado en sitios de listados de vehículos. Tienes un profundo conocimiento de web scraping, análisis de estructura HTML y patrones de datos automotrices.
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
JSON

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
    "extractionMethod": "dom" | "api" | "ocr"
  },
  "challenges": ["desafio1", "desafio2"],
  "confidence": 0.85,
  "estimatedTime": 30,
  "recommendations": ["recomendacion1", "recomendacion2"]
}
PUNTUACIÓN DE CONFIANZA:
0.9-1.0: Excelente - Selectores claros, estructura estándar.
0.7-0.9: Bueno - Algunos desafíos, pero manejables.
0.5-0.7: Moderado - Desafíos significativos, se necesitan múltiples enfoques.
0.3-0.5: Difícil - Alta ofuscación, medidas anti-bots.
0.0-0.3: Muy difícil - Requiere técnicas especializadas.
SELECCIÓN DEL MÉTODO DE EXTRACCIÓN:
"dom": Análisis HTML estándar con selectores CSS.
"api": Se detectaron endpoints JSON/API.
"ocr": Se necesita extracción basada en imágenes.
Sé preciso, práctico y proporciona siempre estrategias de extracción accionables.`};

// Set up generation config
const generationConfig = {
  maxOutputTokens: 4096,
  temperature: 0.3,
  topP: 0.9,
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'OFF',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'OFF',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'OFF',
    },
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'OFF',
    }
  ],
  systemInstruction: {
    parts: [siText1]
  },
};

async function testLocalAnalyzer(inputMessage) {
  console.log("🚀 Testing Local Agent Analyzer");
  console.log("================================");
  console.log("Input message:", inputMessage.substring(0, 100) + "...");
  console.log("");
  
  try {
    const chat = ai.chats.create({
      model: model,
      config: generationConfig
    });

    console.log("📤 Sending message to local analyzer...");
    
    const response = await chat.sendMessageStream({
      message: [{text: inputMessage}]
    });
    
    let fullResponse = '';
    console.log("📥 Streaming response:");
    console.log("─".repeat(50));
    
    for await (const chunk of response) {
      if (chunk.text) {
        process.stdout.write(chunk.text);
        fullResponse += chunk.text;
      } else {
        console.log(JSON.stringify(chunk));
      }
    }
    
    console.log("");
    console.log("─".repeat(50));
    console.log("✅ Response completed!");
    
    // Save response to file
    const fs = require('fs');
    fs.writeFileSync('test-local-analyzer-response.json', JSON.stringify({
      input: inputMessage,
      output: fullResponse,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log("📁 Response saved to: test-local-analyzer-response.json");
    
    // Try to parse as JSON
    try {
      const jsonResponse = JSON.parse(fullResponse);
      console.log("✅ Valid JSON response structure:");
      console.log("   - pageStructure:", !!jsonResponse.pageStructure);
      console.log("   - challenges:", !!jsonResponse.challenges);
      console.log("   - confidence:", jsonResponse.confidence);
      console.log("   - estimatedTime:", jsonResponse.estimatedTime);
    } catch (parseError) {
      console.log("⚠️  Response is not valid JSON, but that's okay for testing");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

// Test message similar to what the Gradio script was using
const testMessage = `Analiza esta página web para extracción de datos de vehículos:

URL: https://example.com/vehiculo-toyota-corolla
Contenido HTML: <html><head><title>Toyota Corolla 2020</title></head><body><h1>Toyota Corolla</h1><p>Precio: $15,000</p><p>Año: 2020</p><p>Kilometraje: 50,000 km</p></body></html>
User Agent: Mozilla/5.0
Contexto adicional: Venta de vehículo usado

Por favor, analiza la estructura de la página y proporciona un análisis estructurado con selectores CSS, campos de datos detectados, método de extracción recomendado, desafíos identificados, nivel de confianza y tiempo estimado de procesamiento.`;

testLocalAnalyzer(testMessage);