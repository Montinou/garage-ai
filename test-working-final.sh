#!/bin/bash

# Final working test script for the Cloud Run services
# Uses proper Gradio client with correct authentication and endpoints

set -e

echo "🚀 Testing Cloud Run services - Final Version"
echo "============================================="

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

# Function to test service with proper Gradio client
test_service_final() {
    local service_name=$1
    local url=$2
    local secret_key=$3
    local message=$4
    local log_file="test-${service_name}-final-response.json"
    
    echo -e "${BLUE}🔍 Testing ${service_name} service...${NC}"
    echo "URL: $url"
    echo "Message: ${message:0:50}..."
    echo ""
    
    # Create temporary Node.js script
    local temp_script="temp_final_${service_name}.js"
    
    cat > "$temp_script" << 'EOF'
const { Client } = require("@gradio/client");

async function testService() {
    const serviceUrl = process.env.SERVICE_URL;
    const secretKey = process.env.SECRET_KEY;
    const message = process.env.TEST_MESSAGE;
    const logFile = process.env.LOG_FILE;
    
    try {
        console.log("🔌 Connecting to service...");
        
        // Connect to Gradio client with secret key
        const connectUrl = `${serviceUrl}?key=${secretKey}`;
        const client = await Client.connect(connectUrl);
        console.log("✅ Connected successfully!");
        
        console.log("📤 Sending message to chat endpoint...");
        
        // Call the chat API with proper message format
        const result = await client.predict("chat", {
            message: {
                text: message,
                files: []
            }
        });
        
        console.log("✅ Response received!");
        
        // Save response to file
        const fs = require('fs');
        fs.writeFileSync(logFile, JSON.stringify({
            success: true,
            timestamp: new Date().toISOString(),
            service: process.env.SERVICE_NAME,
            request: {
                message: message.substring(0, 200) + "..."
            },
            response: result
        }, null, 2));
        
        console.log("📁 Response saved to:", logFile);
        
        // Display response preview
        if (result && result.data) {
            console.log("📄 Response preview:");
            const responseText = Array.isArray(result.data) ? result.data[result.data.length - 1] : result.data;
            if (typeof responseText === 'object' && responseText.content) {
                console.log(responseText.content.substring(0, 500) + "...");
            } else if (typeof responseText === 'string') {
                console.log(responseText.substring(0, 500) + "...");
            } else {
                console.log(JSON.stringify(responseText, null, 2).substring(0, 500) + "...");
            }
        }
        
        return true;
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        
        // Save error to file
        const fs = require('fs');
        const errorLog = `error-${logFile}`;
        fs.writeFileSync(errorLog, JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            service: process.env.SERVICE_NAME
        }, null, 2));
        console.log("📁 Error saved to:", errorLog);
        
        return false;
    }
}

testService().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
});
EOF
    
    echo "📦 Installing @gradio/client dependency if needed..."
    if ! npm list @gradio/client >/dev/null 2>&1; then
        npm install @gradio/client --no-save --legacy-peer-deps >/dev/null 2>&1
    fi
    
    echo "🚀 Running test..."
    
    # Set environment variables for the script
    export SERVICE_URL="$url"
    export SECRET_KEY="$secret_key"
    export TEST_MESSAGE="$message"
    export LOG_FILE="$log_file"
    export SERVICE_NAME="$service_name"
    
    # Run the test
    if node "$temp_script"; then
        echo -e "${GREEN}✅ ${service_name} test successful!${NC}"
        success=true
    else
        echo -e "${RED}❌ ${service_name} test failed!${NC}"
        success=false
    fi
    
    # Clean up temp script
    rm -f "$temp_script"
    
    echo ""
    echo "----------------------------------------"
    echo ""
    
    return $success
}

# Test messages for each service
ANALYZER_MESSAGE="Analiza esta página web para extracción de datos de vehículos: URL: https://example.com/vehiculo-toyota-corolla, Contenido HTML: <html><head><title>Toyota Corolla 2020</title></head><body><h1>Toyota Corolla</h1><p>Precio: \$15,000</p><p>Año: 2020</p><p>Kilometraje: 50,000 km</p></body></html>. Por favor, analiza la estructura de la página y proporciona un análisis estructurado."

EXTRACTOR_MESSAGE="Extrae los datos del vehículo del siguiente contenido web: URL: https://example.com/vehiculo-toyota-corolla, Contenido: <html><body><h1>Toyota Corolla 2020</h1><div class=\"price\">\$15,000</div><div class=\"year\">2020</div><div class=\"mileage\">50,000 km</div></body></html>. Por favor, devuelve un JSON con los datos estructurados del vehículo."

VALIDATOR_MESSAGE="Valida y califica la calidad de los siguientes datos de vehículo: {\"marca\":\"Toyota\",\"modelo\":\"Corolla\",\"año\":2020,\"precio\":15000,\"kilometraje\":50000,\"condicion\":\"Usado\"}. Por favor, devuelve un JSON con la validación."

# Run tests
echo -e "${BLUE}🚀 Starting final service tests...${NC}"
echo ""

all_tests_passed=true

# Test 1: Analyzer
if ! test_service_final "analyzer" "$VEHICLE_ANALYZER_URL" "$VEHICLE_ANALYZER_SECRET" "$ANALYZER_MESSAGE"; then
    all_tests_passed=false
fi

# Test 2: Extractor
if ! test_service_final "extractor" "$VEHICLE_EXTRACTOR_URL" "$VEHICLE_EXTRACTOR_SECRET" "$EXTRACTOR_MESSAGE"; then
    all_tests_passed=false
fi

# Test 3: Validator
if ! test_service_final "validator" "$VEHICLE_VALIDATOR_URL" "$VEHICLE_VALIDATOR_SECRET" "$VALIDATOR_MESSAGE"; then
    all_tests_passed=false
fi

# Summary
echo -e "${BLUE}📊 Test Summary${NC}"
echo "=============="

if [ "$all_tests_passed" = true ]; then
    echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
    echo ""
    echo "📁 Response files created:"
    echo "   - test-analyzer-final-response.json"
    echo "   - test-extractor-final-response.json" 
    echo "   - test-validator-final-response.json"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "📁 Check error files for details:"
    echo "   - error-test-*-final-response.json"
    exit 1
fi