/**
 * Garage AI Analyzer Service - Cloud Run with Vertex AI
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

// Initialize the model
const model = vertexAI.getGenerativeModel({
  model: 'gemini-1.5-flash-002',
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 4096,
    topP: 0.9,
    topK: 30
  },
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_ONLY_HIGH'
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_ONLY_HIGH'
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_ONLY_HIGH'
    },
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_ONLY_HIGH'
    }
  ]
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'analyzer',
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION,
    timestamp: new Date().toISOString()
  });
});

// Main analysis endpoint
app.post('/analyze', async (req, res) => {
  try {
    const { url, htmlContent, userAgent, additionalContext } = req.body;
    
    if (!url || !htmlContent) {
      return res.status(400).json({
        error: 'Missing required fields: url and htmlContent'
      });
    }
    
    console.log(`Analyzing page: ${url} (${htmlContent.length} chars)`);
    const startTime = Date.now();
    
    // Prepare the analysis prompt
    const prompt = ANALYSIS_PROMPT
      .replace('{htmlContent}', htmlContent.substring(0, 8000))
      .replace('{url}', url);
    
    // Add additional context if provided
    const finalPrompt = additionalContext 
      ? `${prompt}\n\nAdditional Context: ${additionalContext}`
      : prompt;
    
    // Generate content using Vertex AI
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: finalPrompt }] }]
    });
    
    const responseText = result.response.text();
    
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (e) {
      console.warn('Failed to parse AI response as JSON:', e.message);
      // Create a basic structure
      analysis = {
        pageStructure: {
          dataFields: { "make": "auto-detected", "model": "auto-detected", "price": "auto-detected" },
          selectors: { "make": "auto-detect", "model": "auto-detect", "price": "auto-detect" },
          extractionMethod: 'dom'
        },
        challenges: ['JSON parsing failed - manual review needed'],
        confidence: 0.5,
        estimatedTime: 30,
        rawResponse: responseText.substring(0, 500) // First 500 chars
      };
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`Analysis completed in ${processingTime}ms for ${url} - Confidence: ${analysis.confidence}`);
    
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
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Batch analysis endpoint
app.post('/analyze/batch', async (req, res) => {
  try {
    const { pages } = req.body;
    
    if (!pages || !Array.isArray(pages)) {
      return res.status(400).json({
        error: 'Invalid request: pages array required'
      });
    }
    
    console.log(`Processing batch analysis for ${pages.length} pages`);
    const startTime = Date.now();
    
    const results = [];
    const batchLimit = Math.min(pages.length, 10); // Limit to 10 pages per batch
    
    for (let i = 0; i < batchLimit; i++) {
      const page = pages[i];
      try {
        const prompt = ANALYSIS_PROMPT
          .replace('{htmlContent}', page.htmlContent.substring(0, 8000))
          .replace('{url}', page.url);
        
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        const responseText = result.response.text();
        
        let analysis;
        try {
          analysis = JSON.parse(responseText);
        } catch (e) {
          analysis = {
            pageStructure: {
              dataFields: {},
              selectors: {},
              extractionMethod: 'dom'
            },
            challenges: ['JSON parsing failed'],
            confidence: 0.3,
            estimatedTime: 30
          };
        }
        
        results.push({
          url: page.url,
          success: true,
          analysis
        });
        
      } catch (error) {
        results.push({
          url: page.url,
          success: false,
          error: error.message
        });
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      results,
      processed: results.length,
      processingTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Batch analysis failed:', error);
    res.status(500).json({
      error: 'Batch analysis failed',
      message: error.message
    });
  }
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Vertex AI Analyzer service is running',
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION,
    model: 'gemini-1.5-flash-002',
    timestamp: new Date().toISOString()
  });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 Garage AI Analyzer service listening on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${port}/test`);
  console.log(`📋 Project: ${process.env.GOOGLE_CLOUD_PROJECT}`);
  console.log(`🌍 Location: ${process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'}`);
});