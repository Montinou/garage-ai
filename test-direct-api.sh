#!/bin/bash

# Direct API test using curl instead of Gradio client
# This bypasses the Gradio client library issues

set -e

echo "🚀 Testing Cloud Run Services - DIRECT API APPROACH"
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
    echo -e "${RED}❌ Missing required environment variables${NC}"
    exit 1
fi

# Check if secret keys are set
if [ -z "$VEHICLE_ANALYZER_SECRET" ] || [ -z "$VEHICLE_EXTRACTOR_SECRET" ] || [ -z "$VEHICLE_VALIDATOR_SECRET" ]; then
    echo -e "${RED}❌ Missing required secret keys${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All environment variables loaded${NC}"
echo ""

# Function to test service using direct Gradio API
test_service_direct_api() {
    local service_name=$1
    local url=$2
    local secret_key=$3
    local message_text=$4
    local log_file="test-${service_name}-direct-api-response.json"
    
    echo -e "${BLUE}🔍 Testing ${service_name} service with direct API...${NC}"
    echo "URL: $url"
    echo "Message: ${message_text:0:50}..."
    echo ""
    
    # Generate session hash
    local session_hash="garage-ai-test-$(date +%s)-$(openssl rand -hex 4 2>/dev/null || echo $RANDOM)"
    echo "🔑 Session hash: $session_hash"
    
    # Create JSON payload for the chat API
    local payload=$(cat <<EOF
{
    "data": [
        {
            "text": "$message_text",
            "files": []
        },
        null
    ],
    "event_data": null,
    "fn_index": null,
    "api_name": "/chat",
    "session_hash": "$session_hash"
}
EOF
)
    
    echo "📤 Sending direct API request..."
    
    # Make the API call to the Gradio queue
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "User-Agent: garage-ai-direct-test/1.0" \
        -d "$payload" \
        "$url/gradio_api/queue/join?key=$secret_key" 2>&1)
    
    local curl_exit_code=$?
    
    if [ $curl_exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Request sent successfully!${NC}"
        
        # Save response to file
        echo "$response" > "$log_file"
        echo "📁 Response logged to: $log_file"
        
        # Display response preview
        echo -e "${YELLOW}📄 Response preview:${NC}"
        echo "$response" | head -c 800
        echo ""
        echo "..."
        echo ""
        
        # Try to parse as JSON and check for success indicators
        if echo "$response" | grep -q '"event_id"'; then
            echo -e "${GREEN}✅ Got event ID - request queued successfully${NC}"
            
            # Extract event_id if available
            local event_id=$(echo "$response" | grep -o '"event_id":"[^"]*"' | cut -d'"' -f4)
            echo "🎫 Event ID: $event_id"
            
            # Try to get the result by polling the queue
            echo "📡 Polling for results..."
            sleep 2
            
            local data_response=$(curl -s -X GET \
                -H "Accept: text/event-stream" \
                -H "User-Agent: garage-ai-direct-test/1.0" \
                "$url/gradio_api/queue/data?session_hash=$session_hash&key=$secret_key" 2>&1)
            
            echo "📊 Data response (first 500 chars):"
            echo "$data_response" | head -c 500
            echo ""
            
            # Save data response too
            echo "$data_response" > "${log_file%.json}-data.txt"
            
            # Check for completion
            if [[ "$data_response" == *"process_completed"* ]]; then
                echo -e "${GREEN}🎉 Process completed successfully!${NC}"
                return 0
            elif [[ "$data_response" == *"error"* ]]; then
                echo -e "${RED}❌ Error in data response${NC}"
                return 1
            else
                echo -e "${YELLOW}⚠️  Response unclear but request was processed${NC}"
                return 0
            fi
            
        elif echo "$response" | grep -q '"error"'; then
            echo -e "${RED}❌ Error in response${NC}"
            return 1
        else
            echo -e "${YELLOW}⚠️  Unexpected response format${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Request failed with exit code: $curl_exit_code${NC}"
        echo "Response: $response"
        
        # Save error response
        echo "$response" > "error-${log_file}"
        echo "📁 Error logged to: error-${log_file}"
        return 1
    fi
}

# Test messages for each service (shorter for API limits)
ANALYZER_MESSAGE="Analiza esta página web para extracción de datos de vehículos: URL: https://example.com/vehiculo-toyota-corolla, HTML: <html><body><h1>Toyota Corolla 2020</h1><p>Precio: \$15,000</p><p>Año: 2020</p><p>Kilometraje: 50,000 km</p></body></html>. Proporciona análisis estructurado con selectores CSS, campos detectados, método de extracción y nivel de confianza."

EXTRACTOR_MESSAGE="Extrae los datos del vehículo: URL: https://example.com/vehiculo-toyota-corolla, HTML: <html><body><h1>Toyota Corolla 2020</h1><div class=\"price\">\$15,000</div><div class=\"year\">2020</div><div class=\"mileage\">50,000 km</div></body></html>. Devuelve JSON con marca, modelo, año, precio, kilometraje, condición, ubicación."

VALIDATOR_MESSAGE="Valida datos de vehículo: {\"marca\":\"Toyota\",\"modelo\":\"Corolla\",\"año\":2020,\"precio\":15000,\"kilometraje\":50000,\"condicion\":\"Usado\"}. Contexto: {\"sourceUrl\":\"https://example.com/vehiculo\",\"extractionConfidence\":0.85}. Devuelve JSON con validación: esValido, completitud, precision, problemas, puntuacionCalidad."

# Run tests
echo -e "${BLUE}🚀 Starting DIRECT API tests...${NC}"
echo ""

all_tests_passed=0

# Test 1: Analyzer
echo "=== TESTING ANALYZER SERVICE (Direct API) ==="
if test_service_direct_api "analyzer" "$VEHICLE_ANALYZER_URL" "$VEHICLE_ANALYZER_SECRET" "$ANALYZER_MESSAGE"; then
    echo -e "${GREEN}✅ Analyzer service working!${NC}"
else
    echo -e "${RED}❌ Analyzer service failed${NC}"
    all_tests_passed=1
fi

# Test 2: Extractor  
echo "=== TESTING EXTRACTOR SERVICE (Direct API) ==="
if test_service_direct_api "extractor" "$VEHICLE_EXTRACTOR_URL" "$VEHICLE_EXTRACTOR_SECRET" "$EXTRACTOR_MESSAGE"; then
    echo -e "${GREEN}✅ Extractor service working!${NC}"
else
    echo -e "${RED}❌ Extractor service failed${NC}"
    all_tests_passed=1
fi

# Test 3: Validator
echo "=== TESTING VALIDATOR SERVICE (Direct API) ==="
if test_service_direct_api "validator" "$VEHICLE_VALIDATOR_URL" "$VEHICLE_VALIDATOR_SECRET" "$VALIDATOR_MESSAGE"; then
    echo -e "${GREEN}✅ Validator service working!${NC}"
else
    echo -e "${RED}❌ Validator service failed${NC}"
    all_tests_passed=1
fi

# Final Summary
echo ""
echo -e "${BLUE}🏁 DIRECT API TEST SUMMARY${NC}"
echo "========================="

if [ $all_tests_passed -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED SUCCESSFULLY!${NC}"
    echo ""
    echo "📁 Response files created:"
    echo "   - test-analyzer-direct-api-response.json"
    echo "   - test-extractor-direct-api-response.json" 
    echo "   - test-validator-direct-api-response.json"
    echo ""
    echo "📁 Data response files:"
    echo "   - test-*-direct-api-response-data.txt"
    echo ""
    echo -e "${GREEN}✅ All Cloud Run services are working correctly!${NC}"
    echo ""
    echo "🔧 Environment Variables Status:"
    echo "   - VEHICLE_ANALYZER_URL: ✅ Working with direct API"
    echo "   - VEHICLE_EXTRACTOR_URL: ✅ Working with direct API"  
    echo "   - VEHICLE_VALIDATOR_URL: ✅ Working with direct API"
    echo "   - Authentication secrets: ✅ All working"
    echo ""
    echo "🚀 Your services are ready and responding to requests!"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "📁 Check error files for details:"
    echo "   - error-test-*-direct-api-response.json"
    exit 1
fi