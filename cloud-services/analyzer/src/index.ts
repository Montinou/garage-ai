/**
 * Analyzer Service - Cloud Run
 * Analyzes web pages to understand structure and plan data extraction
 */

import express from 'express';
import { VertexAIClient, MODEL_CONFIGS, SCHEMAS, AnalysisResult } from './vertex-client';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize Vertex AI client
const aiClient = new VertexAIClient(MODEL_CONFIGS.ANALYZER);

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

Provide a structured analysis with specific selectors and extraction recommendations.`;

interface AnalysisRequest {
  url: string;
  htmlContent: string;
  userAgent?: string;
  additionalContext?: string;
}

app.post('/analyze', async (req, res) => {
  try {
    const { url, htmlContent, userAgent, additionalContext }: AnalysisRequest = req.body;
    
    if (!url || !htmlContent) {
      return res.status(400).json({
        error: 'Missing required fields: url and htmlContent'
      });
    }
    
    // Prepare the analysis prompt
    const prompt = ANALYSIS_PROMPT
      .replace('{htmlContent}', htmlContent.substring(0, 8000)) // Limit content to avoid token limits
      .replace('{url}', url);
    
    // Add additional context if provided
    const finalPrompt = additionalContext 
      ? `${prompt}\n\nAdditional Context: ${additionalContext}`
      : prompt;
    
    console.log(`Analyzing page: ${url}`);
    const startTime = Date.now();
    
    // Generate structured analysis
    const analysis = await aiClient.generateStructured<AnalysisResult>(
      finalPrompt,
      SCHEMAS.ANALYSIS
    );
    
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
      message: error instanceof Error ? error.message : 'Unknown error'
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

// Batch analysis endpoint for multiple pages
app.post('/analyze/batch', async (req, res) => {
  try {
    const { pages }: { pages: AnalysisRequest[] } = req.body;
    
    if (!pages || !Array.isArray(pages)) {
      return res.status(400).json({
        error: 'Invalid request: pages array required'
      });
    }
    
    console.log(`Processing batch analysis for ${pages.length} pages`);
    
    const results = [];
    for (const page of pages.slice(0, 10)) { // Limit to 10 pages per batch
      try {
        const prompt = ANALYSIS_PROMPT
          .replace('{htmlContent}', page.htmlContent.substring(0, 8000))
          .replace('{url}', page.url);
        
        const analysis = await aiClient.generateStructured<AnalysisResult>(
          prompt,
          SCHEMAS.ANALYSIS
        );
        
        results.push({
          url: page.url,
          success: true,
          analysis
        });
        
      } catch (error) {
        results.push({
          url: page.url,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      success: true,
      results,
      processed: results.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Batch analysis failed:', error);
    res.status(500).json({
      error: 'Batch analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Analyzer service listening on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});