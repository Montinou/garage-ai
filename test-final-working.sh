#!/bin/bash

# FINAL WORKING - Cloud Run services test with proper positional arguments
# This script uses the correct Gradio client format

set -e

echo "🚀 FINAL WORKING TEST - Cloud Run Services"
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

# Function to test service with correct array-based positional arguments
test_service_final_working() {
    local service_name=$1
    local url=$2
    local secret_key=$3
    local message_text=$4
    local log_file="test-${service_name}-final-working-response.json"
    
    echo -e "${BLUE}🔍 Testing ${service_name} service...${NC}"
    echo "URL: $url"
    echo "Message: ${message_text:0:50}..."
    echo ""
    
    # Create temporary Node.js script
    local temp_script="temp_final_working_${service_name}.js"
    
    cat > "$temp_script" << 'EOF'
const { Client } = require("@gradio/client");

async function testServiceFinalWorking() {
    const serviceUrl = process.env.SERVICE_URL;
    const secretKey = process.env.SECRET_KEY;
    const messageText = process.env.MESSAGE_TEXT;
    const logFile = process.env.LOG_FILE;
    
    try {
        console.log("🔌 Connecting to service...");
        
        // Connect to Gradio client with secret key
        const connectUrl = `${serviceUrl}?key=${secretKey}`;
        const client = await Client.connect(connectUrl);
        console.log("✅ Connected successfully!");
        
        console.log("📤 Sending message to chat endpoint...");
        
        // Call the chat API with correct pure positional arguments
        // Argument 1: multimodal textbox data as object
        // Argument 2: state (can be null)
        const result = await client.predict("chat", 
            { text: messageText, files: [] },  // First positional argument 
            null                               // Second positional argument (state)
        );
        
        console.log("✅ Response received!");
        
        // Save response to file
        const fs = require('fs');
        fs.writeFileSync(logFile, JSON.stringify({
            success: true,
            timestamp: new Date().toISOString(),
            service: process.env.SERVICE_NAME,
            request: {
                message: messageText.substring(0, 200) + "..."
            },
            response: result
        }, null, 2));
        
        console.log("📁 Response saved to:", logFile);
        
        // Display response preview
        console.log("📄 Response preview:");
        if (result && result.data) {
            // The output should be JSON response in first component
            const responseData = result.data[0];
            console.log("Response type:", typeof responseData);
            
            if (typeof responseData === 'string') {
                console.log(responseData.substring(0, 1000) + "...");
            } else {
                console.log(JSON.stringify(responseData, null, 2).substring(0, 1000) + "...");
            }
        }
        
        return true;
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error("❌ Stack:", error.stack);
        
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

testServiceFinalWorking().then(success => {
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
    export MESSAGE_TEXT="$message_text"
    export LOG_FILE="$log_file"
    export SERVICE_NAME="$service_name"
    
    # Run the test
    if node "$temp_script"; then
        echo -e "${GREEN}✅ ${service_name} test successful!${NC}"
        success_flag=0
    else
        echo -e "${RED}❌ ${service_name} test failed!${NC}"
        success_flag=1
    fi
    
    # Clean up temp script
    rm -f "$temp_script"
    
    echo ""
    echo "----------------------------------------"
    echo ""
    
    return $success_flag
}

# Test messages for each service (optimized for each service purpose)
ANALYZER_MESSAGE="Analiza esta página web para extracción de datos de vehículos:

URL: https://example.com/vehiculo-toyota-corolla
Contenido HTML: <html><head><title>Toyota Corolla 2020</title></head><body><h1>Toyota Corolla</h1><p>Precio: \$15,000</p><p>Año: 2020</p><p>Kilometraje: 50,000 km</p></body></html>

Por favor, proporciona un análisis estructurado con:
- Selectores CSS para cada campo
- Campos de datos detectados  
- Método de extracción recomendado
- Desafíos identificados
- Nivel de confianza
- Tiempo estimado de procesamiento"

EXTRACTOR_MESSAGE="Extrae los datos del vehículo del siguiente contenido web:

URL: https://example.com/vehiculo-toyota-corolla
Contenido: <html><body><h1>Toyota Corolla 2020</h1><div class=\"price\">\$15,000</div><div class=\"year\">2020</div><div class=\"mileage\">50,000 km</div><div class=\"condition\">Usado</div><div class=\"location\">Ciudad de México</div></body></html>

Por favor, devuelve un JSON estructurado con:
- marca, modelo, año, precio, kilometraje
- características, condición, vendedor
- ubicación y descripción"

VALIDATOR_MESSAGE="Valida y califica la calidad de los siguientes datos de vehículo:

Datos del vehículo:
{\"marca\":\"Toyota\",\"modelo\":\"Corolla\",\"año\":2020,\"precio\":15000,\"kilometraje\":50000,\"condicion\":\"Usado\",\"ubicacion\":\"Ciudad de México\",\"descripcion\":\"Vehículo en excelente estado\"}

Contexto:
{\"sourceUrl\":\"https://example.com/vehiculo-toyota-corolla\",\"extractionMethod\":\"dom\",\"extractionConfidence\":0.85}

Por favor, devuelve un JSON con validación que incluya:
- esValido, completitud, precision, consistencia
- problemas[], puntuacionCalidad, esDuplicado
- recomendaciones[], insightsMercado"

# Run tests
echo -e "${BLUE}🚀 Starting FINAL WORKING tests...${NC}"
echo ""

all_tests_passed=0

# Test 1: Analyzer
echo "=== TESTING ANALYZER SERVICE ==="
if test_service_final_working "analyzer" "$VEHICLE_ANALYZER_URL" "$VEHICLE_ANALYZER_SECRET" "$ANALYZER_MESSAGE"; then
    echo -e "${GREEN}✅ Analyzer service working!${NC}"
else
    echo -e "${RED}❌ Analyzer service failed${NC}"
    all_tests_passed=1
fi

# Test 2: Extractor  
echo "=== TESTING EXTRACTOR SERVICE ==="
if test_service_final_working "extractor" "$VEHICLE_EXTRACTOR_URL" "$VEHICLE_EXTRACTOR_SECRET" "$EXTRACTOR_MESSAGE"; then
    echo -e "${GREEN}✅ Extractor service working!${NC}"
else
    echo -e "${RED}❌ Extractor service failed${NC}"
    all_tests_passed=1
fi

# Test 3: Validator
echo "=== TESTING VALIDATOR SERVICE ==="
if test_service_final_working "validator" "$VEHICLE_VALIDATOR_URL" "$VEHICLE_VALIDATOR_SECRET" "$VALIDATOR_MESSAGE"; then
    echo -e "${GREEN}✅ Validator service working!${NC}"
else
    echo -e "${RED}❌ Validator service failed${NC}"
    all_tests_passed=1
fi

# Final Summary
echo ""
echo -e "${BLUE}🏁 FINAL WORKING TEST SUMMARY${NC}"
echo "============================="

if [ $all_tests_passed -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED SUCCESSFULLY!${NC}"
    echo ""
    echo "📁 Success response files created:"
    echo "   - test-analyzer-final-working-response.json"
    echo "   - test-extractor-final-working-response.json" 
    echo "   - test-validator-final-working-response.json"
    echo ""
    echo -e "${GREEN}✅ All Cloud Run services are working correctly with proper authentication!${NC}"
    echo ""
    echo "🔧 Environment Variables Status:"
    echo "   - VEHICLE_ANALYZER_URL: ✅ Set and working"
    echo "   - VEHICLE_EXTRACTOR_URL: ✅ Set and working"  
    echo "   - VEHICLE_VALIDATOR_URL: ✅ Set and working"
    echo "   - Authentication secrets: ✅ All working"
    echo ""
    echo "🚀 Your services are ready for production use!"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "📁 Check error files for details:"
    echo "   - error-test-*-final-working-response.json"
    exit 1
fi