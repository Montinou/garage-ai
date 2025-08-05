import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...');
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the development server to be ready
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    console.log(`⏳ Waiting for server at ${baseURL}...`);
    
    await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Verify the app is running
    await page.waitForSelector('body', { timeout: 10000 });
    console.log('✅ Application is ready for testing');
    
    // Optional: Set up test data or authentication
    // You can add any global setup logic here
    
    // Store authentication state or other global data if needed
    // await page.context().storageState({ path: 'tests/e2e/auth.json' });
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ E2E test setup completed');
}

export default globalSetup;