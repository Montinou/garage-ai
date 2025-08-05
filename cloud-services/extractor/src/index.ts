/**
 * Extractor Service - Cloud Run
 * Extracts vehicle data from web content using AI
 */

import express from 'express';
import { VertexAIClient, MODEL_CONFIGS, SCHEMAS, VehicleData } from '../../shared/vertex-client';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize Vertex AI clients
const aiClient = new VertexAIClient(MODEL_CONFIGS.EXTRACTOR);
const visionClient = new VertexAIClient(MODEL_CONFIGS.VISION);

// Extraction prompt template
const EXTRACTION_PROMPT = `You are an AI data extractor specializing in vehicle information from web listings.

Extract ALL available vehicle data from the provided content:

Content to analyze:
{content}

URL: {url}

Extract the following data fields (use null if not found):
- make: Vehicle manufacturer (e.g., "Toyota", "Ford")
- model: Vehicle model (e.g., "Camry", "F-150") 
- year: Model year as number
- price: Price in USD as number (no currency symbols)
- mileage: Odometer reading as number (miles)
- vin: Vehicle identification number if available
- features: Array of features/options (e.g., ["Leather Seats", "Navigation"])
- condition: Vehicle condition (e.g., "Used", "New", "Certified Pre-Owned")
- sellerInfo: Dealer name or seller information
- imageUrls: Array of image URLs found in the listing
- description: Full vehicle description text
- location: Location/address where vehicle is sold
- listingDate: Date when listing was posted

Be accurate and extract only what is clearly present. Convert text numbers to actual numbers (e.g., "25,000" -> 25000).`;

// Image analysis prompt
const IMAGE_ANALYSIS_PROMPT = `Analyze this vehicle image and extract any visible information:
- License plate numbers (if clearly visible)
- Vehicle condition details
- Additional features visible in photos
- Any text/specifications shown in the image

Provide a structured analysis of what you can see.`;

interface ExtractionRequest {
  url: string;
  content: string;
  extractionStrategy?: {
    selectors?: { [key: string]: string };
    method: 'dom' | 'api' | 'text';
  };
  images?: string[]; // Base64 encoded images
}

app.post('/extract', async (req, res) => {
  try {
    const { url, content, extractionStrategy, images }: ExtractionRequest = req.body;
    
    if (!url || !content) {
      return res.status(400).json({
        error: 'Missing required fields: url and content'
      });
    }
    
    console.log(`Extracting data from: ${url}`);
    const startTime = Date.now();
    
    // Prepare extraction prompt
    const prompt = EXTRACTION_PROMPT
      .replace('{content}', content.substring(0, 12000)) // Limit to stay within token limits
      .replace('{url}', url);
    
    // Extract structured vehicle data
    const vehicleData = await aiClient.generateStructured<VehicleData>(
      prompt,
      SCHEMAS.VEHICLE_DATA
    );
    
    // Analyze images if provided
    let imageAnalysis = null;
    if (images && images.length > 0) {
      try {
        console.log(`Analyzing ${images.length} images`);
        imageAnalysis = await visionClient.analyzeWithImages(
          IMAGE_ANALYSIS_PROMPT,
          images.slice(0, 5) // Limit to 5 images to control costs
        );
      } catch (error) {
        console.warn('Image analysis failed:', error);
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`Extraction completed in ${processingTime}ms for ${url}`);
    
    res.json({
      success: true,
      vehicleData,
      imageAnalysis,
      processingTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Extraction failed:', error);
    res.status(500).json({
      error: 'Extraction failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'extractor',
    timestamp: new Date().toISOString()
  });
});

// Batch extraction endpoint
app.post('/extract/batch', async (req, res) => {
  try {
    const { items }: { items: ExtractionRequest[] } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        error: 'Invalid request: items array required'
      });
    }
    
    console.log(`Processing batch extraction for ${items.length} items`);
    
    const results = [];
    for (const item of items.slice(0, 20)) { // Limit to 20 items per batch
      try {
        const prompt = EXTRACTION_PROMPT
          .replace('{content}', item.content.substring(0, 12000))
          .replace('{url}', item.url);
        
        const vehicleData = await aiClient.generateStructured<VehicleData>(
          prompt,
          SCHEMAS.VEHICLE_DATA
        );
        
        results.push({
          url: item.url,
          success: true,
          vehicleData
        });
        
      } catch (error) {
        results.push({
          url: item.url,
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
    console.error('Batch extraction failed:', error);
    res.status(500).json({
      error: 'Batch extraction failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Quick extraction endpoint (text only, no images)
app.post('/extract/quick', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        error: 'Missing required field: content'
      });
    }
    
    const prompt = `Extract vehicle data from this content: ${content.substring(0, 8000)}`;
    
    const vehicleData = await aiClient.generateStructured<VehicleData>(
      prompt,
      SCHEMAS.VEHICLE_DATA
    );
    
    res.json({
      success: true,
      vehicleData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Quick extraction failed:', error);
    res.status(500).json({
      error: 'Quick extraction failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Extractor service listening on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});