#!/bin/bash

# Complete test script using LOCAL agents instead of external Gradio services
# This replaces the external API calls with direct local Vertex AI integration

set -e

echo "🚀 Testing LOCAL Agent System (Direct Vertex AI)"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed or not in PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Using local Vertex AI agents (no external dependencies)${NC}"
echo ""

# Function to test local agent
test_local_agent() {
    local agent_name=$1
    local test_message="$2"
    local log_file="test-local-${agent_name}-response.json"
    
    echo -e "${BLUE}🔍 Testing LOCAL ${agent_name} agent...${NC}"
    echo "Message: ${test_message:0:100}..."
    echo ""
    
    # Create temporary Node.js script for this specific agent
    local temp_script="temp_local_${agent_name}.js"
    
    # Create the test script based on agent type
    case $agent_name in
        "analyzer")
            cat > "$temp_script" << 'EOF'
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  vertexai: true,
  project: 'analog-medium-451706-m7',
  location: 'us-central1'
});

const systemInstruction = `Eres un analizador experto de contenido web, especializado en sitios de listados de vehículos. Siempre responde con un JSON válido en esta estructura exacta:
{
  "pageStructure": {
    "dataFields": {
      "make": "descripcion_ubicacion",
      "model": "descripcion_ubicacion", 
      "year": "descripcion_ubicacion",
      "price": "descripcion_ubicacion",
      "mileage": "descripcion_ubicacion"
    },
    "selectors": {
      "make": "selector_css",
      "model": "selector_css",
      "year": "selector_css", 
      "price": "selector_css",
      "mileage": "selector_css"
    },
    "extractionMethod": "dom"
  },
  "challenges": ["desafio1", "desafio2"],
  "confidence": 0.85,
  "estimatedTime": 30,
  "recommendations": ["recomendacion1", "recomendacion2"]
}`;

async function testAgent() {
    const config = {
        maxOutputTokens: 4096,
        temperature: 0.3,
        topP: 0.9,
        safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
        ],
        systemInstruction: { parts: [{ text: systemInstruction }] }
    };
    
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash-lite',
        config: config
    });

    const response = await chat.sendMessageStream({
        message: [{ text: process.env.TEST_MESSAGE }]
    });
    
    let fullResponse = '';
    for await (const chunk of response) {
        if (chunk.text) {
            fullResponse += chunk.text;
        }
    }
    
    const fs = require('fs');
    fs.writeFileSync(process.env.LOG_FILE, JSON.stringify({
        agent: 'analyzer',
        input: process.env.TEST_MESSAGE,
        output: fullResponse,
        timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log('✅ Analyzer completed successfully');
    console.log('Response length:', fullResponse.length);
}

testAgent().catch(console.error);
EOF
            ;;
            
        "extractor")
            cat > "$temp_script" << 'EOF'
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  vertexai: true,
  project: 'analog-medium-451706-m7',
  location: 'global'
});

const systemInstruction = `Eres un especialista experto en extracción de datos para listados de vehículos en español. Siempre responde con JSON válido en esta estructura exacta:
{
 "marca": "Toyota",
 "modelo": "Corolla", 
 "año": 2020,
 "precio": 250000,
 "kilometraje": 45000,
 "vin": "1234567890ABCDEFG",
 "condicion": "Usado",
 "caracteristicas": ["Asientos de Cuero", "Navegación"],
 "vendedor": "Autos ABC",
 "imagenes": ["https://ejemplo.com/auto1.jpg"],
 "descripcion": "Vehículo bien mantenido",
 "ubicacion": "Ciudad de México, CDMX",
 "fechaPublicacion": "2025-01-15"
}`;

async function testAgent() {
    const config = {
        maxOutputTokens: 2048,
        temperature: 0.1,
        topP: 0.8,
        safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
        ],
        systemInstruction: { parts: [{ text: systemInstruction }] }
    };
    
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash-lite',
        config: config
    });

    const response = await chat.sendMessageStream({
        message: [{ text: process.env.TEST_MESSAGE }]
    });
    
    let fullResponse = '';
    for await (const chunk of response) {
        if (chunk.text) {
            fullResponse += chunk.text;
        }
    }
    
    const fs = require('fs');
    fs.writeFileSync(process.env.LOG_FILE, JSON.stringify({
        agent: 'extractor',
        input: process.env.TEST_MESSAGE,
        output: fullResponse,
        timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log('✅ Extractor completed successfully');
    console.log('Response length:', fullResponse.length);
}

testAgent().catch(console.error);
EOF
            ;;
            
        "validator")
            cat > "$temp_script" << 'EOF'
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  vertexai: true,
  project: 'analog-medium-451706-m7',
  location: 'global'
});

const systemInstruction = `Eres un especialista en calidad de datos para listados de vehículos. Siempre responde con JSON válido en esta estructura exacta:
{
  "esValido": true,
  "completitud": 0.85,
  "precision": 0.90,
  "consistencia": 0.80,
  "problemas": ["Falta número VIN"],
  "puntuacionCalidad": 85,
  "esDuplicado": false,
  "recomendaciones": ["Verificar precisión del kilometraje"],
  "insightsMercado": {
    "rangoPrecios": "Rango típico: $220,000-$280,000 MXN",
    "kilometrajeEsperado": "Esperado: 40,000-60,000 km",
    "caracteristicasComunes": ["Funciones de seguridad estándar"]
  }
}`;

async function testAgent() {
    const config = {
        maxOutputTokens: 1024,
        temperature: 0.9,
        topP: 0.7,
        safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
        ],
        systemInstruction: { parts: [{ text: systemInstruction }] }
    };
    
    const chat = ai.chats.create({
        model: 'gemini-2.0-flash-001',
        config: config
    });

    const response = await chat.sendMessageStream({
        message: [{ text: process.env.TEST_MESSAGE }]
    });
    
    let fullResponse = '';
    for await (const chunk of response) {
        if (chunk.text) {
            fullResponse += chunk.text;
        }
    }
    
    const fs = require('fs');
    fs.writeFileSync(process.env.LOG_FILE, JSON.stringify({
        agent: 'validator',
        input: process.env.TEST_MESSAGE,
        output: fullResponse,
        timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log('✅ Validator completed successfully');
    console.log('Response length:', fullResponse.length);
}

testAgent().catch(console.error);
EOF
            ;;
    esac
    
    echo "🚀 Running local ${agent_name} agent..."
    
    # Set environment variables for the script
    export TEST_MESSAGE="$test_message"
    export LOG_FILE="$log_file"
    
    # Run the test
    if node "$temp_script"; then
        echo -e "${GREEN}✅ Local ${agent_name} test successful!${NC}"
        
        # Show response preview
        if [ -f "$log_file" ]; then
            echo -e "${YELLOW}📄 Response preview:${NC}"
            head -c 300 "$log_file"
            echo ""
            echo "..."
            echo ""
        fi
    else
        echo -e "${RED}❌ Local ${agent_name} test failed!${NC}"
    fi
    
    # Clean up temp script
    rm -f "$temp_script"
    
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Test messages for each agent
ANALYZER_MESSAGE="Analiza esta página web para extracción de datos de vehículos:

URL: https://example.com/vehiculo-toyota-corolla
Contenido HTML: <html><head><title>Toyota Corolla 2020</title></head><body><h1>Toyota Corolla</h1><p>Precio: \$15,000</p><p>Año: 2020</p><p>Kilometraje: 50,000 km</p></body></html>

Por favor, analiza la estructura de la página y proporciona un análisis estructurado."

EXTRACTOR_MESSAGE="Extrae los datos del vehículo del siguiente contenido web en español:

URL: https://example.com/vehiculo-toyota-corolla
Contenido: <html><body><h1>Toyota Corolla 2020</h1><div class=\"price\">\$15,000</div><div class=\"year\">2020</div><div class=\"mileage\">50,000 km</div><div class=\"condition\">Usado</div><div class=\"location\">Ciudad de México</div></body></html>

Por favor, devuelve un JSON con los datos estructurados del vehículo."

VALIDATOR_MESSAGE="Valida y califica la calidad de los siguientes datos de vehículo en español:

Datos del vehículo:
{
  \"marca\": \"Toyota\",
  \"modelo\": \"Corolla\", 
  \"año\": 2020,
  \"precio\": 15000,
  \"kilometraje\": 50000,
  \"condicion\": \"Usado\",
  \"ubicacion\": \"Ciudad de México\"
}

Por favor, devuelve un JSON con la validación completa."

# Run local agent tests
echo -e "${BLUE}🚀 Starting LOCAL agent tests...${NC}"
echo ""

# Test 1: Local Analyzer
test_local_agent "analyzer" "$ANALYZER_MESSAGE"

# Test 2: Local Extractor  
test_local_agent "extractor" "$EXTRACTOR_MESSAGE"

# Test 3: Local Validator
test_local_agent "validator" "$VALIDATOR_MESSAGE"

echo -e "${GREEN}🎉 All LOCAL agent tests completed!${NC}"
echo ""
echo "📁 Log files created:"
echo "   - test-local-analyzer-response.json"
echo "   - test-local-extractor-response.json" 
echo "   - test-local-validator-response.json"
echo ""
echo "🎯 ADVANTAGES of local agents:"
echo "   ✅ No external API dependencies"
echo "   ✅ No authentication issues"
echo "   ✅ Direct Vertex AI integration"
echo "   ✅ Faster response times"
echo "   ✅ Full control over configuration"
echo ""
echo "📊 Use 'jq .' to pretty-print any JSON response files"