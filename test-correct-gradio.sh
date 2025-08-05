#!/bin/bash

# Test script using the correct Gradio queue approach with /chat API
# Based on the actual Gradio config showing "api_name":"chat"

set -e

echo "🚀 Testing Correct Gradio Queue API..."
echo "===================================="

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

echo -e "${GREEN}✅ Environment variables loaded:${NC}"
echo "   ANALYZER_URL: $VEHICLE_ANALYZER_URL"
echo ""

# Function to test Gradio queue approach
test_gradio_queue() {
    local service_name=$1
    local url=$2
    local message=$3
    local log_file="test-${service_name}-queue-response.json"
    
    echo -e "${BLUE}🔍 Testing ${service_name} with Gradio queue approach...${NC}"
    echo "URL: $url"
    echo "Message: ${message:0:100}..."
    echo ""
    
    # Generate session hash
    local session_hash="garage-ai-test-$(date +%s)-$(openssl rand -hex 4 2>/dev/null || echo $RANDOM)"
    echo "🔑 Session hash: $session_hash"
    
    # Step 1: Join the queue
    echo "📤 Step 1: Joining queue..."
    
    local join_payload=$(cat <<EOF
{
    "data": [
        {
            "text": "$message",
            "files": []
        }
    ],
    "event_data": null,
    "fn_index": null,
    "api_name": "/chat",
    "session_hash": "$session_hash"
}
EOF
)
    
    echo "Payload: $join_payload"
    echo ""
    
    local join_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "User-Agent: garage-ai-test/1.0" \
        -d "$join_payload" \
        "$url/gradio_api/queue/join" 2>&1)
    
    echo "📡 Join response:"
    echo "$join_response"
    echo ""
    
    # Extract event_id if available
    local event_id=$(echo "$join_response" | grep -o '"event_id":"[^"]*"' | cut -d'"' -f4)
    echo "🎫 Event ID: $event_id"
    echo ""
    
    # Step 2: Get queue data
    echo "📤 Step 2: Getting queue data..."
    
    local data_response=$(curl -s -X GET \
        -H "Accept: text/event-stream" \
        -H "User-Agent: garage-ai-test/1.0" \
        "$url/gradio_api/queue/data?session_hash=$session_hash" 2>&1)
    
    echo "📡 Data response (first 500 chars):"
    echo "$data_response" | head -c 500
    echo ""
    echo "..."
    echo ""
    
    # Save all responses to file
    cat <<EOF > "$log_file"
{
    "join_response": $join_response,
    "data_response": "$(echo "$data_response" | head -c 1000 | sed 's/"/\\"/g')",
    "session_hash": "$session_hash",
    "event_id": "$event_id",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "url": "$url"
}
EOF
    
    # Check for success indicators
    if [[ "$data_response" == *"process_completed"* ]]; then
        echo -e "${GREEN}✅ Found process_completed in response!${NC}"
        echo "🔍 Extracting result..."
        
        # Try to extract the actual result
        local result=$(echo "$data_response" | grep -o 'data:.*process_completed.*' | head -1)
        echo "📊 Result: $result"
    elif [[ "$data_response" == *"error"* ]]; then
        echo -e "${RED}❌ Error found in response${NC}"
    elif [[ "$join_response" == *"error"* ]]; then
        echo -e "${RED}❌ Error in join response${NC}"
    else
        echo -e "${YELLOW}⚠️  Response format unclear, but request completed${NC}"
    fi
    
    echo "📁 Full response logged to: $log_file"
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Test message
TEST_MESSAGE="Analiza esta página web para extracción de datos de vehículos:

URL: https://example.com/vehiculo-toyota-corolla
Contenido HTML: <html><head><title>Toyota Corolla 2020</title></head><body><h1>Toyota Corolla</h1><p>Precio: \$15,000</p><p>Año: 2020</p><p>Kilometraje: 50,000 km</p></body></html>

Por favor, analiza la estructura de la página y devuelve un JSON estructurado con los campos detectados."

# Run test
echo -e "${BLUE}🚀 Starting queue-based test...${NC}"
echo ""

test_gradio_queue "analyzer" "$VEHICLE_ANALYZER_URL" "$TEST_MESSAGE"

echo -e "${GREEN}🎉 Test completed!${NC}"
echo ""
echo "📁 Log file created: test-analyzer-queue-response.json"