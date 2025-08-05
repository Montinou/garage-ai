/**
 * Analyzer Service - Cloud Run (JavaScript)
 * Analyzes web pages to understand structure and plan data extraction
 */

const express = require('express');
const { VertexAI } = require('@google-cloud/vertexai');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
});

const model = vertexAI.getGenerativeModel({
  model: 'gemini-1.5-flash-002',
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 4096,
    topP: 0.9,
    topK: 30
  }
});

// Analysis prompt template
const ANALYSIS_PROMPT = `You are an AI web content analyzer specializing in vehicle listing websites.

Analyze the provided HTML content and identify:
1. Data field locations (CSS selectors, XPath, or API endpoints)
2. Page structure and navigation patterns
3. Potential challenges (JavaScript rendering, anti-bot measures)
4. Recommended extraction strategy
5. Confidence level in successful extraction

HTML Content:
{htmlContent}

URL: {url}

Focus on finding these vehicle data fields:
- Make and model
- Year
- Price
- Mileage
- VIN (if available)
- Features/specifications
- Images
- Seller information
- Description

Provide a structured JSON analysis with specific selectors and extraction recommendations.
Respond with valid JSON only.`;

app.post('/analyze', async (req, res) => {
  try {
    const { url, htmlContent, userAgent, additionalContext } = req.body;
    
    if (!url || !htmlContent) {
      return res.status(400).json({
        error: 'Missing required fields: url and htmlContent'
      });
    }
    
    console.log(`Analyzing page: ${url}`);
    const startTime = Date.now();
    
    // Prepare the analysis prompt
    const prompt = ANALYSIS_PROMPT
      .replace('{htmlContent}', htmlContent.substring(0, 8000))
      .replace('{url}', url);
    
    // Generate analysis
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    const responseText = result.response.text();
    
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (e) {
      // If JSON parsing fails, create a basic structure
      analysis = {
        pageStructure: {
          dataFields: {},
          selectors: {},
          extractionMethod: 'dom'
        },
        challenges: ['JSON parsing failed from AI response'],
        confidence: 0.5,
        estimatedTime: 30,
        rawResponse: responseText
      };
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`Analysis completed in ${processingTime}ms for ${url}`);
    
    res.json({
      success: true,
      analysis,
      processingTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Analysis failed:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'analyzer',
    timestamp: new Date().toISOString()
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Analyzer service is running',
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION
  });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Analyzer service listening on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});