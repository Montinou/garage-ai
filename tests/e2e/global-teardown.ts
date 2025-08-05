import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test teardown...');
  
  try {
    // Clean up any global test data
    // Example: Clear test database records, reset system state, etc.
    
    // Clean up temporary files if any were created
    // await fs.remove('temp-test-files');
    
    console.log('✅ E2E test teardown completed');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here to avoid masking test failures
  }
}

export default globalTeardown;