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
