#!/bin/bash

# Test script for Gradio Client API approach
# Based on the API documentation provided

set -e

echo "🚀 Testing Gradio Client API endpoints..."
echo "========================================"

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

# Function to make Gradio API call
test_gradio_endpoint() {
    local service_name=$1
    local url=$2
    local message=$3
    local log_file="test-${service_name}-gradio-response.json"
    
    echo -e "${BLUE}🔍 Testing ${service_name} service with Gradio API...${NC}"
    echo "URL: $url"
    echo "Message: ${message:0:100}..."
    echo ""
    
    # Step 1: Try direct /chat endpoint call (as per documentation)
    echo "📤 Trying direct /chat endpoint..."
    
    local payload=$(cat <<EOF
{
    "message": {
        "text": "$message",
        "files": []
    }
}
EOF
)
    
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "User-Agent: garage-ai-test/1.0" \
        -d "$payload" \
        "$url/chat" 2>&1)
    
    echo "Response from /chat: $response" | head -c 200
    echo ""
    
    # Step 2: Try Gradio API predict endpoint
    echo "📤 Trying Gradio predict endpoint..."
    
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
    
    local gradio_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "User-Agent: garage-ai-test/1.0" \
        -d "$gradio_payload" \
        "$url/api/predict" 2>&1)
    
    echo "Response from /api/predict: $gradio_response" | head -c 200
    echo ""
    
    # Step 3: Try the /call/{api_name} endpoint as shown in docs
    echo "📤 Trying /call/chat endpoint..."
    
    local call_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "User-Agent: garage-ai-test/1.0" \
        -d "$gradio_payload" \
        "$url/call/chat" 2>&1)
    
    echo "Response from /call/chat: $call_response" | head -c 200
    echo ""
    
    # Step 4: Get API info
    echo "📤 Getting API info..."
    
    local api_info=$(curl -s -H "User-Agent: garage-ai-test/1.0" "$url/info" 2>&1)
    echo "API Info: $api_info" | head -c 300
    echo ""
    
    # Save all responses to file
    cat <<EOF > "$log_file"
{
    "chat_endpoint": $response,
    "predict_endpoint": $gradio_response,
    "call_chat_endpoint": $call_response,
    "api_info": $api_info,
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    echo "📁 All responses logged to: $log_file"
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Test message
TEST_MESSAGE="Analiza esta página web para extracción de datos de vehículos:

URL: https://example.com/vehiculo-toyota-corolla
Contenido HTML: <html><head><title>Toyota Corolla 2020</title></head><body><h1>Toyota Corolla</h1><p>Precio: \$15,000</p><p>Año: 2020</p><p>Kilometraje: 50,000 km</p></body></html>

Por favor, analiza la estructura de la página y devuelve un JSON estructurado."

# Run test
echo -e "${BLUE}🚀 Starting Gradio API test...${NC}"
echo ""

test_gradio_endpoint "analyzer" "$VEHICLE_ANALYZER_URL" "$TEST_MESSAGE"

echo -e "${GREEN}🎉 Test completed!${NC}"
echo ""
echo "📁 Log file created: test-analyzer-gradio-response.json"
echo "Use 'jq .' to pretty-print the JSON response file"