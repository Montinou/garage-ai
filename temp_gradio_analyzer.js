const { Client } = require("@gradio/client");

async function testGradioClient() {
    const serviceUrl = process.env.SERVICE_URL;
    const message = process.env.TEST_MESSAGE;
    const logFile = process.env.LOG_FILE;
    
    console.log("🔌 Connecting to Gradio client at:", serviceUrl);
    console.log("🔑 Secret key provided:", process.env.SERVICE_SECRET ? "YES" : "NO");
    
    try {
        // Add secret key to URL if provided
        let connectUrl = serviceUrl;
        if (process.env.SERVICE_SECRET) {
            const separator = serviceUrl.includes('?') ? '&' : '?';
            connectUrl = `${serviceUrl}${separator}key=${process.env.SERVICE_SECRET}`;
            console.log("🔗 Final URL with key:", connectUrl.replace(process.env.SERVICE_SECRET, 'HIDDEN'));
        }
        
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
        console.log(JSON.stringify(result.data, null, 2).substring(0, 500) + "...");
        
        return result;
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        
        // Save error to file
        const fs = require('fs');
        const errorLog = `error-${logFile}`;
        fs.writeFileSync(errorLog, JSON.stringify({
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        }, null, 2));
        console.log("📁 Error saved to:", errorLog);
        
        throw error;
    }
}

testGradioClient().catch(console.error);
