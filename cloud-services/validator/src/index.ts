/**
 * Validator Service - Cloud Run
 * Validates and scores the quality of extracted vehicle data
 */

import express from 'express';
import { VertexAIClient, MODEL_CONFIGS, SCHEMAS, VehicleData, ValidationResult } from '../../shared/vertex-client';

const app = express();
app.use(express.json({ limit: '5mb' }));

// Initialize Vertex AI client
const aiClient = new VertexAIClient(MODEL_CONFIGS.VALIDATOR);

// Validation prompt template
const VALIDATION_PROMPT = `You are an AI data validator specializing in vehicle listing quality assessment.

Validate this vehicle data for accuracy, completeness, and quality:

Vehicle Data:
{vehicleData}

Perform these validation checks:

1. COMPLETENESS (0-1 score):
   - Are required fields present? (make, model, year, price)
   - Are optional fields filled when expected?
   
2. ACCURACY (0-1 score):
   - Is the price realistic for the vehicle type and year?
   - Is the mileage reasonable for the vehicle age?
   - Is the year within expected range (1900-2025)?
   - Do make/model combinations exist?
   
3. CONSISTENCY:
   - Do features match the vehicle type?
   - Is the condition consistent with mileage/price?
   - Does the description match extracted data?
   
4. QUALITY ISSUES:
   - Identify specific problems or missing data
   - Flag potential duplicate indicators
   - Note any suspicious or unrealistic values
   
5. DUPLICATE DETECTION:
   - Check for potential duplicate indicators
   - Consider VIN, exact price+mileage combinations
   
Provide a quality score (0-100) and specific recommendations for improvement.`;

interface ValidationRequest {
  vehicleData: VehicleData;
  context?: {
    sourceUrl?: string;
    extractionMethod?: string;
    extractionConfidence?: number;
  };
  compareAgainst?: VehicleData[]; // For duplicate detection
}

app.post('/validate', async (req, res) => {
  try {
    const { vehicleData, context, compareAgainst }: ValidationRequest = req.body;
    
    if (!vehicleData) {
      return res.status(400).json({
        error: 'Missing required field: vehicleData'
      });
    }
    
    console.log(`Validating vehicle: ${vehicleData.make} ${vehicleData.model}`);
    const startTime = Date.now();
    
    // Prepare validation prompt
    let prompt = VALIDATION_PROMPT.replace(
      '{vehicleData}', 
      JSON.stringify(vehicleData, null, 2)
    );
    
    // Add context if provided
    if (context) {
      prompt += `\n\nExtraction Context: ${JSON.stringify(context, null, 2)}`;
    }
    
    // Add comparison data for duplicate detection
    if (compareAgainst && compareAgainst.length > 0) {
      prompt += `\n\nCompare against these existing listings for duplicates:\n${
        compareAgainst.slice(0, 10).map((v, i) => 
          `${i + 1}. ${v.make} ${v.model} ${v.year} - $${v.price} - ${v.mileage} miles`
        ).join('\n')
      }`;
    }
    
    // Generate validation result
    const validation = await aiClient.generateStructured<ValidationResult>(
      prompt,
      SCHEMAS.VALIDATION
    );
    
    const processingTime = Date.now() - startTime;
    
    console.log(`Validation completed in ${processingTime}ms - Score: ${validation.qualityScore}`);
    
    res.json({
      success: true,
      validation,
      processingTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Validation failed:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'validator',
    timestamp: new Date().toISOString()
  });
});

// Batch validation endpoint
app.post('/validate/batch', async (req, res) => {
  try {
    const { items }: { items: ValidationRequest[] } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        error: 'Invalid request: items array required'
      });
    }
    
    console.log(`Processing batch validation for ${items.length} items`);
    
    const results = [];
    for (const item of items.slice(0, 50)) { // Limit to 50 items per batch
      try {
        const prompt = VALIDATION_PROMPT.replace(
          '{vehicleData}', 
          JSON.stringify(item.vehicleData, null, 2)
        );
        
        const validation = await aiClient.generateStructured<ValidationResult>(
          prompt,
          SCHEMAS.VALIDATION
        );
        
        results.push({
          vehicleId: `${item.vehicleData.make}-${item.vehicleData.model}-${item.vehicleData.year}`,
          success: true,
          validation
        });
        
      } catch (error) {
        results.push({
          vehicleId: `${item.vehicleData.make}-${item.vehicleData.model}-${item.vehicleData.year}`,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      success: true,
      results,
      processed: results.length,
      averageQuality: results
        .filter(r => r.success)
        .reduce((sum, r) => sum + (r.validation?.qualityScore || 0), 0) / results.filter(r => r.success).length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Batch validation failed:', error);
    res.status(500).json({
      error: 'Batch validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Quick validation endpoint (basic checks only)
app.post('/validate/quick', async (req, res) => {
  try {
    const { vehicleData }: { vehicleData: VehicleData } = req.body;
    
    if (!vehicleData) {
      return res.status(400).json({
        error: 'Missing required field: vehicleData'
      });
    }
    
    // Perform basic validation without AI
    const basicValidation = {
      isValid: !!(vehicleData.make && vehicleData.model && vehicleData.year && vehicleData.price),
      completeness: Object.values(vehicleData).filter(v => v != null && v !== '').length / Object.keys(vehicleData).length,
      accuracy: 0.8, // Default estimate
      issues: [] as string[],
      qualityScore: 75, // Default score
      isDuplicate: false
    };
    
    // Add basic issue detection
    if (!vehicleData.make) basicValidation.issues.push('Missing vehicle make');
    if (!vehicleData.model) basicValidation.issues.push('Missing vehicle model');
    if (!vehicleData.year || vehicleData.year < 1900 || vehicleData.year > 2025) {
      basicValidation.issues.push('Invalid or missing year');
    }
    if (!vehicleData.price || vehicleData.price <= 0) {
      basicValidation.issues.push('Invalid or missing price');
    }
    
    res.json({
      success: true,
      validation: basicValidation,
      note: 'Quick validation - basic checks only',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Quick validation failed:', error);
    res.status(500).json({
      error: 'Quick validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Duplicate detection endpoint
app.post('/validate/duplicates', async (req, res) => {
  try {
    const { vehicles }: { vehicles: VehicleData[] } = req.body;
    
    if (!vehicles || !Array.isArray(vehicles)) {
      return res.status(400).json({
        error: 'Invalid request: vehicles array required'
      });
    }
    
    console.log(`Checking duplicates in ${vehicles.length} vehicles`);
    
    const duplicateGroups = [];
    const processed = new Set();
    
    for (let i = 0; i < vehicles.length; i++) {
      if (processed.has(i)) continue;
      
      const vehicle = vehicles[i];
      const duplicates = [i];
      
      for (let j = i + 1; j < vehicles.length; j++) {
        if (processed.has(j)) continue;
        
        const other = vehicles[j];
        
        // Check for potential duplicates
        const isDuplicate = (
          vehicle.vin && other.vin && vehicle.vin === other.vin
        ) || (
          vehicle.make === other.make &&
          vehicle.model === other.model &&
          vehicle.year === other.year &&
          Math.abs(vehicle.price - other.price) < 100 &&
          Math.abs(vehicle.mileage - other.mileage) < 1000
        );
        
        if (isDuplicate) {
          duplicates.push(j);
          processed.add(j);
        }
      }
      
      if (duplicates.length > 1) {
        duplicateGroups.push({
          indices: duplicates,
          vehicles: duplicates.map(idx => vehicles[idx]),
          reason: vehicle.vin ? 'Same VIN' : 'Similar specs and price'
        });
      }
      
      processed.add(i);
    }
    
    res.json({
      success: true,
      duplicateGroups,
      totalDuplicates: duplicateGroups.reduce((sum, group) => sum + group.indices.length, 0),
      uniqueVehicles: vehicles.length - duplicateGroups.reduce((sum, group) => sum + group.indices.length - 1, 0),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Duplicate detection failed:', error);
    res.status(500).json({
      error: 'Duplicate detection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Validator service listening on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});