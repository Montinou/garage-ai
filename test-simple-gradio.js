const { Client } = require("@gradio/client");

async function testSimple() {
    const url = "https://genai-app-vehicleanalyzeragent-1-1754371628143-345774789999.us-central1.run.app";
    const key = "33a3aq0i3s2lh9up";
    
    console.log("Testing URL:", url);
    console.log("Using key:", key);
    
    try {
        // Try with key in URL
        const urlWithKey = `${url}?key=${key}`;
        console.log("Connecting to:", urlWithKey);
        
        const client = await Client.connect(urlWithKey);
        console.log("✅ Connected!");
        
        // First, let's see what endpoints are available
        console.log("Available endpoints:", client.endpoints);
        
        const result = await client.predict("/chat", {
            message: {
                "text": "Hello, test message", 
                "files": []
            }
        });
        
        console.log("Result:", JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error("Stack:", error.stack);
    }
}

testSimple();