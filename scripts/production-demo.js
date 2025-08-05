#!/usr/bin/env node

/**
 * Production Demo Script
 * Demonstrates how to use the local agent pipeline in production
 */

const { ScraperPipeline } = require('../lib/scraper-pipeline');
const { localAgentService } = require('../lib/agents/local-agent-service');

async function runProductionDemo() {
  console.log('🚀 Production Demo: Local Agent Pipeline');
  console.log('='.repeat(50));
  console.log('');

  // Example 1: Process a single URL
  console.log('📋 Example 1: Single URL Processing');
  console.log('-'.repeat(30));
  
  const pipeline = new ScraperPipeline({
    qualityThreshold: 70,
    saveToDatabase: true,
    validateBeforeSaving: true
  });

  const sampleHtml = `
    <html>
      <head><title>Toyota Corolla 2020 - Usado</title></head>
      <body>
        <h1>Toyota Corolla 2020</h1>
        <div class="price">$250,000</div>
        <div class="year">2020</div>
        <div class="mileage">45,000 km</div>
        <div class="condition">Usado</div>
        <div class="location">Ciudad de México, CDMX</div>
        <div class="features">
          <ul>
            <li>Asientos de Cuero</li>
            <li>Navegación GPS</li>
            <li>Cámara Trasera</li>
            <li>Aire Acondicionado</li>
          </ul>
        </div>
        <div class="description">
          Vehículo en excelente estado, bien mantenido, un solo dueño.
          Servicio al día, llantas nuevas, sistema de sonido premium.
        </div>
      </body>
    </html>
  `;

  try {
    const result = await pipeline.processUrl('https://example.com/toyota-corolla-2020', sampleHtml);
    
    console.log('Results:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Vehicle ID: ${result.vehicleId || 'Not saved'}`);
    console.log(`  Quality Score: ${result.qualityScore}`);
    console.log('');

  } catch (error) {
    console.error('❌ Single URL processing failed:', error.message);
  }

  // Example 2: Batch processing
  console.log('📦 Example 2: Batch Processing');
  console.log('-'.repeat(30));

  const testUrls = [
    'https://example.com/honda-civic-2019',
    'https://example.com/nissan-sentra-2021',
    'https://example.com/volkswagen-jetta-2018'
  ];

  try {
    const batchResult = await pipeline.processBatch(testUrls);
    
    console.log('Batch Results:');
    console.log(`  Total Processed: ${batchResult.totalProcessed}`);
    console.log(`  Total Saved: ${batchResult.totalSaved}`);
    console.log(`  Total Skipped: ${batchResult.totalSkipped}`);
    console.log(`  Total Errors: ${batchResult.totalErrors}`);
    console.log(`  Processing Time: ${batchResult.processingTime}ms`);
    console.log('');

  } catch (error) {
    console.error('❌ Batch processing failed:', error.message);
  }

  // Example 3: Direct agent usage
  console.log('🤖 Example 3: Direct Agent Usage');
  console.log('-'.repeat(30));

  try {
    // Step 1: Analyze
    const analysisResult = await localAgentService.analyze(
      'https://example.com/vehicle-listing',
      sampleHtml
    );
    
    if (analysisResult.success) {
      console.log('Analysis Results:');
      console.log(`  Confidence: ${analysisResult.data.confidence}`);
      console.log(`  Estimated Time: ${analysisResult.data.estimatedTime}s`);
      console.log(`  Extraction Method: ${analysisResult.data.pageStructure.extractionMethod}`);
    }

    // Step 2: Extract
    const extractionResult = await localAgentService.extract(
      'https://example.com/vehicle-listing',
      sampleHtml,
      analysisResult.data?.pageStructure
    );
    
    if (extractionResult.success) {
      console.log('Extraction Results:');
      console.log(`  Brand: ${extractionResult.data.marca}`);
      console.log(`  Model: ${extractionResult.data.modelo}`);
      console.log(`  Year: ${extractionResult.data.año}`);
      console.log(`  Price: $${extractionResult.data.precio?.toLocaleString()}`);
    }

    // Step 3: Validate
    const validationResult = await localAgentService.validate(
      extractionResult.data,
      {
        sourceUrl: 'https://example.com/vehicle-listing',
        extractionMethod: 'dom',
        extractionConfidence: analysisResult.data?.confidence
      }
    );
    
    if (validationResult.success) {
      console.log('Validation Results:');
      console.log(`  Valid: ${validationResult.data.esValido}`);
      console.log(`  Quality Score: ${validationResult.data.puntuacionCalidad}`);
      console.log(`  Completeness: ${(validationResult.data.completitud * 100).toFixed(1)}%`);
      console.log(`  Precision: ${(validationResult.data.precision * 100).toFixed(1)}%`);
    }

  } catch (error) {
    console.error('❌ Direct agent usage failed:', error.message);
  }

  console.log('');
  console.log('🎉 Production Demo Completed!');
  console.log('');
  console.log('🔧 To run this in production:');
  console.log('');
  console.log('1. **API Endpoint**: POST /api/scraping/pipeline');
  console.log('   {');
  console.log('     "urls": ["https://site1.com/car1", "https://site2.com/car2"],');
  console.log('     "config": {');
  console.log('       "qualityThreshold": 75,');
  console.log('       "saveToDatabase": true');
  console.log('     }');
  console.log('   }');
  console.log('');
  console.log('2. **Scheduled Jobs**: GET /api/cron/scraping-scheduler');
  console.log('   - Runs automatically via Vercel Cron');
  console.log('   - Creates jobs in agent_jobs table');
  console.log('   - Processed by /api/cron/process-jobs');
  console.log('');
  console.log('3. **Database Storage**:');
  console.log('   - Vehicles stored in `vehicles` table');
  console.log('   - Images stored in `images` table');
  console.log('   - AI metadata in `aiAnalysisSummary` field');
  console.log('');
  console.log('4. **Monitoring**:');
  console.log('   - Metrics stored in `agent_metrics` table');
  console.log('   - Job status in `agent_jobs` table');
  console.log('   - Agent dashboard at /agents');
  console.log('');
}

// Run the demo if this script is executed directly
if (require.main === module) {
  runProductionDemo().catch(console.error);
}

module.exports = { runProductionDemo };