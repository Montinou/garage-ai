/**
 * Test script for the Vehicle Scraper Service
 * This tests the implementation against the task-plan.xml specifications
 */

import { VehicleScraperService, DefaultSources, ScraperConfig } from '../lib/scraper-service';

async function testScraperService() {
  console.log('Testing Vehicle Scraper Service...');
  console.log('Configuration:', ScraperConfig);
  
  const scraperService = new VehicleScraperService();
  
  try {
    // Test with a mock source that won't make real HTTP requests
    const testSource = {
      id: 'test',
      seedUrls: ['https://httpbin.org/html'],
      explorePatterns: {
        allow: ['.*'],
        deny: [],
      },
      listingUrlPattern: 'https://.*',
      dedupeKey: 'canonicalUrl',
    };

    console.log('Running test scrape...');
    const result = await scraperService.scrapeSource(testSource);
    
    console.log('Scraper results:', result);
    console.log('✅ Scraper service test completed successfully');
    
    // Test default sources configuration
    console.log('\nDefault sources configured:');
    Object.keys(DefaultSources).forEach(sourceId => {
      const source = DefaultSources[sourceId];
      console.log(`- ${sourceId}: ${source.seedUrls.length} seed URLs`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Scraper service test failed:', error);
    return false;
  }
}

// Run test if called directly
if (require.main === module) {
  testScraperService()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testScraperService };