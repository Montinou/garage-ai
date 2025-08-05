#!/bin/bash

# Test script for the new /chat API endpoint format
# Tests all 3 services: analyzer, extractor, and validator

set -e

echo "🚀 Testing Chat API endpoints..."
echo "================================"

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

echo -e "${GREEN}✅ Environment variables loaded:${NC}"
echo "   ANALYZER_URL: $VEHICLE_ANALYZER_URL"
echo "   EXTRACTOR_URL: $VEHICLE_EXTRACTOR_URL"
echo "   VALIDATOR_URL: $VEHICLE_VALIDATOR_URL"
echo ""

# Function to make API call and log response
test_chat_endpoint() {
    local service_name=$1
    local url=$2
    local message=$3
    local log_file="test-${service_name}-response.json"
    
    echo -e "${BLUE}🔍 Testing ${service_name} service...${NC}"
    echo "URL: $url/chat"
    echo "Message: ${message:0:100}..."
    echo ""
    
    # Prepare JSON payload
    local payload=$(cat <<EOF
{
    "message": {
        "text": "$message",
        "files": []
    }
}
EOF
)
    
    echo "📤 Sending request..."
    
    # Make the API call
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "User-Agent: garage-ai-test/1.0" \
        -d "$payload" \
        "$url/chat" 2>&1)
    
    local curl_exit_code=$?
    
    if [ $curl_exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Request successful!${NC}"
        
        # Save response to file
        echo "$response" > "$log_file"
        echo "📁 Response logged to: $log_file"
        
        # Pretty print first 500 characters
        echo -e "${YELLOW}📄 Response preview:${NC}"
        echo "$response" | head -c 500
        echo ""
        echo "..."
        echo ""
        
        # Try to parse as JSON and show structure
        if echo "$response" | jq . >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Valid JSON response${NC}"
            echo -e "${YELLOW}📊 Response structure:${NC}"
            echo "$response" | jq 'keys' 2>/dev/null || echo "Could not extract keys"
        else
            echo -e "${YELLOW}⚠️  Response is not valid JSON${NC}"
        fi
    else
        echo -e "${RED}❌ Request failed with exit code: $curl_exit_code${NC}"
        echo "Response: $response"
        
        # Save error response
        echo "$response" > "error-${service_name}-response.txt"
        echo "📁 Error logged to: error-${service_name}-response.txt"
    fi
    
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

# Run tests
echo -e "${BLUE}🚀 Starting API tests...${NC}"
echo ""

# Test 1: Analyzer
test_chat_endpoint "analyzer" "$VEHICLE_ANALYZER_URL" "$ANALYZER_MESSAGE"

# Test 2: Extractor  
test_chat_endpoint "extractor" "$VEHICLE_EXTRACTOR_URL" "$EXTRACTOR_MESSAGE"

# Test 3: Validator
test_chat_endpoint "validator" "$VEHICLE_VALIDATOR_URL" "$VALIDATOR_MESSAGE"

echo -e "${GREEN}🎉 All tests completed!${NC}"
echo ""
echo "📁 Log files created:"
echo "   - test-analyzer-response.json"
echo "   - test-extractor-response.json" 
echo "   - test-validator-response.json"
echo ""
echo "📊 Summary files can be found in the current directory"
echo "Use 'jq .' to pretty-print any JSON response files"