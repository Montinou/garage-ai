#!/bin/bash

# Test script using the correct Gradio API approach
# Based on the actual Gradio config we found

set -e

echo "🚀 Testing Working Gradio API endpoints..."
echo "========================================="

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
if [ -z "$VEHICLE_ANALYZER_URL" ]; then
    echo -e "${RED}❌ Missing VEHICLE_ANALYZER_URL environment variable${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables loaded:${NC}"
echo "   ANALYZER_URL: $VEHICLE_ANALYZER_URL"
echo ""

# Function to test the Gradio predict API
test_gradio_predict() {
    local service_name=$1
    local url=$2
    local message=$3
    local log_file="test-${service_name}-working-response.json"
    
    echo -e "${BLUE}🔍 Testing ${service_name} service with Gradio predict API...${NC}"
    echo "URL: $url"
    echo "Message: ${message:0:100}..."
    echo ""
    
    # Try the /gradio_api/predict endpoint (this is the correct one)
    echo "📤 Trying /gradio_api/predict endpoint..."
    
    local gradio_payload=$(cat <<EOF
{
    "data": [
        {
            "text": "$message",
            "files": []
        }
    ],
    "fn_index": 0
}
EOF
)
    
    local predict_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "User-Agent: garage-ai-test/1.0" \
        -d "$gradio_payload" \
        "$url/gradio_api/predict" 2>&1)
    
    local curl_exit_code=$?
    
    echo "📡 Response from /gradio_api/predict:"
    echo "$predict_response"
    echo ""
    
    # Save response to file
    cat <<EOF > "$log_file"
{
    "predict_endpoint": $predict_response,
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "url": "$url",
    "payload": $gradio_payload
}
EOF
    
    echo "📁 Response logged to: $log_file"
    echo ""
    
    # Check if response looks successful
    if [[ "$predict_response" == *"data"* ]] && [[ "$predict_response" != *"error"* ]]; then
        echo -e "${GREEN}✅ Response appears successful!${NC}"
    elif [[ "$predict_response" == *"error"* ]]; then
        echo -e "${RED}❌ Response contains error${NC}"
    else
        echo -e "${YELLOW}⚠️  Response format unclear${NC}"
    fi
    
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Test message for analyzer
ANALYZER_MESSAGE="Analiza esta página web para extracción de datos de vehículos:

URL: https://example.com/vehiculo-toyota-corolla
Contenido HTML: <html><head><title>Toyota Corolla 2020</title></head><body><h1>Toyota Corolla</h1><p>Precio: \$15,000</p><p>Año: 2020</p><p>Kilometraje: 50,000 km</p></body></html>
User Agent: Mozilla/5.0
Contexto adicional: Venta de vehículo usado

Por favor, analiza la estructura de la página y proporciona un análisis estructurado con selectores CSS, campos de datos detectados, método de extracción recomendado, desafíos identificados, nivel de confianza y tiempo estimado de procesamiento."

# Run test
echo -e "${BLUE}🚀 Starting Gradio API test...${NC}"
echo ""

test_gradio_predict "analyzer" "$VEHICLE_ANALYZER_URL" "$ANALYZER_MESSAGE"

echo -e "${GREEN}🎉 Test completed!${NC}"
echo ""
echo "📁 Log file created: test-analyzer-working-response.json"
echo ""
echo "Now testing all 3 services..."
echo ""

# Test all 3 services
if [ -n "$VEHICLE_EXTRACTOR_URL" ]; then
    EXTRACTOR_MESSAGE="Extrae los datos del vehículo del siguiente contenido web: <html><body><h1>Toyota Corolla 2020</h1><div class=\"price\">\$15,000</div></body></html>"
    test_gradio_predict "extractor" "$VEHICLE_EXTRACTOR_URL" "$EXTRACTOR_MESSAGE"
fi

if [ -n "$VEHICLE_VALIDATOR_URL" ]; then
    VALIDATOR_MESSAGE="Valida estos datos de vehículo: {\"marca\": \"Toyota\", \"modelo\": \"Corolla\", \"año\": 2020, \"precio\": 15000}"
    test_gradio_predict "validator" "$VEHICLE_VALIDATOR_URL" "$VALIDATOR_MESSAGE"
fi

echo -e "${GREEN}🎉 All tests completed!${NC}"