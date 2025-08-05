#!/bin/bash

# Test script for the Cloud Run services with proper authentication
# Uses secret keys for Gradio client connection

set -e

echo "🚀 Testing Cloud Run services with authentication..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env.local ]; then
    echo "📁 Loading environment variables from .env.local"
    export $(grep -v '^#' .env.local | xargs)
else
    echo "⚠️  No .env.local file found - using system environment variables"
fi

# Check if required environment variables are set
if [ -z "$VEHICLE_ANALYZER_URL" ] || [ -z "$VEHICLE_EXTRACTOR_URL" ] || [ -z "$VEHICLE_VALIDATOR_URL" ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    echo "   VEHICLE_ANALYZER_URL: ${VEHICLE_ANALYZER_URL:-NOT SET}"
    echo "   VEHICLE_EXTRACTOR_URL: ${VEHICLE_EXTRACTOR_URL:-NOT SET}"
    echo "   VEHICLE_VALIDATOR_URL: ${VEHICLE_VALIDATOR_URL:-NOT SET}"
    exit 1
fi

# Check if secret keys are set
if [ -z "$VEHICLE_ANALYZER_SECRET" ] || [ -z "$VEHICLE_EXTRACTOR_SECRET" ] || [ -z "$VEHICLE_VALIDATOR_SECRET" ]; then
    echo -e "${RED}❌ Missing required secret keys:${NC}"
    echo "   VEHICLE_ANALYZER_SECRET: ${VEHICLE_ANALYZER_SECRET:-NOT SET}"
    echo "   VEHICLE_EXTRACTOR_SECRET: ${VEHICLE_EXTRACTOR_SECRET:-NOT SET}"
    echo "   VEHICLE_VALIDATOR_SECRET: ${VEHICLE_VALIDATOR_SECRET:-NOT SET}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables loaded:${NC}"
echo "   ANALYZER_URL: $VEHICLE_ANALYZER_URL"
echo "   EXTRACTOR_URL: $VEHICLE_EXTRACTOR_URL"
echo "   VALIDATOR_URL: $VEHICLE_VALIDATOR_URL"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed or not in PATH${NC}"
    exit 1
fi

# Function to create and run Gradio client test with secret key
test_service_with_secret() {
    local service_name=$1
    local url=$2
    local secret_key=$3
    local message=$4
    local log_file="test-${service_name}-working-response.json"
    
    echo -e "${BLUE}🔍 Testing ${service_name} service with secret authentication...${NC}"
    echo "URL: $url"
    echo "Secret: ${secret_key:0:8}..."
    echo "Message: ${message:0:100}..."
    echo ""
    
    # Create temporary Node.js script for Gradio client
    local temp_script="temp_gradio_${service_name}.js"
    
    cat > "$temp_script" << 'EOF'
const { Client } = require("@gradio/client");

async function testServiceWithAuth() {
    const serviceUrl = process.env.SERVICE_URL;
    const secretKey = process.env.SECRET_KEY;
    const message = process.env.TEST_MESSAGE;
    const logFile = process.env.LOG_FILE;
    
    console.log("🔌 Connecting to Gradio client at:", serviceUrl);
    
    try {
        // Add secret key to URL
        const connectUrl = `${serviceUrl}?key=${secretKey}`;
        console.log("🔑 Using authenticated URL:", connectUrl.replace(secretKey, secretKey.substring(0, 8) + "..."));
        
        const client = await Client.connect(connectUrl);
        console.log("✅ Connected successfully!");
        
        console.log("📤 Sending message to /chat endpoint...");
        
        const result = await client.predict("/chat", {
            message: {
                "text": message,
                "files": []
            }
        });
        
        console.log("✅ Response received!");
        console.log("📊 Result structure:", Object.keys(result));
        
        // Save response to file
        const fs = require('fs');
        fs.writeFileSync(logFile, JSON.stringify(result, null, 2));
        console.log("📁 Response saved to:", logFile);
        
        // Display preview
        console.log("📄 Response preview:");
        const preview = JSON.stringify(result.data, null, 2);
        console.log(preview.substring(0, 800) + "...");
        
        return result;
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        
        // Save error to file
        const fs = require('fs');
        const errorLog = `error-${logFile}`;
        fs.writeFileSync(errorLog, JSON.stringify({
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            service: process.env.SERVICE_NAME
        }, null, 2));
        console.log("📁 Error saved to:", errorLog);
        
        throw error;
    }
}

testServiceWithAuth().catch(console.error);
EOF
    
    echo "📦 Installing @gradio/client dependency..."
    if ! npm list @gradio/client >/dev/null 2>&1; then
        npm install @gradio/client --no-save --legacy-peer-deps >/dev/null 2>&1
    fi
    
    echo "🚀 Running authenticated test..."
    
    # Set environment variables for the script
    export SERVICE_URL="$url"
    export SECRET_KEY="$secret_key"
    export TEST_MESSAGE="$message"
    export LOG_FILE="$log_file"
    export SERVICE_NAME="$service_name"
    
    # Run the test
    if node "$temp_script"; then
        echo -e "${GREEN}✅ ${service_name} test successful!${NC}"
    else
        echo -e "${RED}❌ ${service_name} test failed!${NC}"
    fi
    
    # Clean up temp script
    rm -f "$temp_script"
    
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Test messages for each service
ANALYZER_MESSAGE="Analiza esta página web para extracción de datos de vehículos:

URL: https://example.com/vehiculo-toyota-corolla
Contenido HTML: <html><head><title>Toyota Corolla 2020</title></head><body><h1>Toyota Corolla</h1><p>Precio: \$15,000</p><p>Año: 2020</p><p>Kilometraje: 50,000 km</p></body></html>
User Agent: Mozilla/5.0
Contexto adicional: Venta de vehículo usado

Por favor, analiza la estructura de la página y proporciona un análisis estructurado con selectores CSS, campos de datos detectados, método de extracción recomendado, desafíos identificados, nivel de confianza y tiempo estimado de procesamiento."

EXTRACTOR_MESSAGE="Extrae los datos del vehículo del siguiente contenido web en español:

URL: https://example.com/vehiculo-toyota-corolla
Contenido: <html><body><h1>Toyota Corolla 2020</h1><div class=\"price\">\$15,000</div><div class=\"year\">2020</div><div class=\"mileage\">50,000 km</div><div class=\"condition\">Usado</div><div class=\"location\">Ciudad de México</div></body></html>
Estrategia: {\"method\": \"dom\", \"selectors\": {\"marca\": \"h1\", \"precio\": \".price\"}}

Por favor, devuelve un JSON con los datos estructurados del vehículo incluyendo marca, modelo, año, precio, kilometraje, características, condición, vendedor, ubicación y descripción."

VALIDATOR_MESSAGE="Valida y califica la calidad de los siguientes datos de vehículo en español:

Datos del vehículo:
{
  \"marca\": \"Toyota\",
  \"modelo\": \"Corolla\",
  \"año\": 2020,
  \"precio\": 15000,
  \"kilometraje\": 50000,
  \"condicion\": \"Usado\",
  \"ubicacion\": \"Ciudad de México\",
  \"descripcion\": \"Vehículo en excelente estado\"
}

Contexto:
{
  \"sourceUrl\": \"https://example.com/vehiculo-toyota-corolla\",
  \"extractionMethod\": \"dom\",
  \"extractionConfidence\": 0.85
}

Por favor, devuelve un JSON con la validación que incluya: esValido, completitud, precision, consistencia, problemas[], puntuacionCalidad, esDuplicado, recomendaciones[], e insightsMercado."

# Run authenticated tests
echo -e "${BLUE}🚀 Starting authenticated service tests...${NC}"
echo ""

# Test 1: Analyzer with secret key
test_service_with_secret "analyzer" "$VEHICLE_ANALYZER_URL" "$VEHICLE_ANALYZER_SECRET" "$ANALYZER_MESSAGE"

# Test 2: Extractor with secret key
test_service_with_secret "extractor" "$VEHICLE_EXTRACTOR_URL" "$VEHICLE_EXTRACTOR_SECRET" "$EXTRACTOR_MESSAGE"

# Test 3: Validator with secret key
test_service_with_secret "validator" "$VEHICLE_VALIDATOR_URL" "$VEHICLE_VALIDATOR_SECRET" "$VALIDATOR_MESSAGE"

echo -e "${GREEN}🎉 All authenticated tests completed!${NC}"
echo ""
echo "📁 Log files created:"
echo "   - test-analyzer-working-response.json"
echo "   - test-extractor-working-response.json" 
echo "   - test-validator-working-response.json"
echo ""
echo "📊 Summary files can be found in the current directory"
echo "Use 'jq .' to pretty-print any JSON response files"