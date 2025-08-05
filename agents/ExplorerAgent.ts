/**
 * ExplorerAgent - Web navigation and discovery specialist
 * 
 * Responsibilities:
 * - Intelligent site navigation using Playwright
 * - Challenge detection (captchas, auth, dynamic content)
 * - Visual analysis using computer vision
 * - Page state capture and analysis
 * - Anti-bot detection and evasion
 * - Dynamic content discovery
 */

import { BaseAgent } from './base/BaseAgent';
import { 
  AgentJob, 
  AgentResult, 
  AgentConfig 
} from './types/AgentTypes';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { put } from '@vercel/blob';
import { config } from '../lib/config';

interface ExplorerConfig extends AgentConfig {
  headless: boolean;
  userAgent: string;
  viewportWidth: number;
  viewportHeight: number;
  navigationTimeout: number;
  enableScreenshots: boolean;
  maxPagesPerSession: number;
  enableStealth: boolean;
  captchaSolverEnabled: boolean;
}

interface PageAnalysis {
  url: string;
  title: string;
  structure: {
    totalElements: number;
    formElements: number;
    linkElements: number;
    listElements: number;
    dataElements: number;
  };
  challenges: Challenge[];
  navigationInfo: NavigationInfo;
  performance: PerformanceMetrics;
  screenshots: string[];
  metadata: PageMetadata;
}

interface Challenge {
  type: 'captcha' | 'auth' | 'rate_limit' | 'dynamic_content' | 'infinite_scroll' | 'modal' | 'cookie_banner';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    selector?: string;
    coordinates?: { x: number; y: number };
  };
  suggestedSolution: string;
  confidence: number;
}

interface NavigationInfo {
  pagination: {
    hasNext: boolean;
    hasPrevious: boolean;
    totalPages?: number;
    currentPage?: number;
    nextPageSelector?: string;
    previousPageSelector?: string;
  };
  searchForm: {
    present: boolean;
    selector?: string;
    fields: Array<{
      name: string;
      type: string;
      selector: string;
      required: boolean;
    }>;
  };
  filters: Array<{
    name: string;
    type: 'dropdown' | 'checkbox' | 'radio' | 'range' | 'text';
    selector: string;
    options?: string[];
  }>;
  dataContainers: Array<{
    selector: string;
    itemCount: number;
    itemSelector: string;
    confidence: number;
  }>;
}

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  networkRequests: number;
  jsErrors: string[];
  resourceSizes: {
    html: number;
    css: number;
    js: number;
    images: number;
    total: number;
  };
}

interface PageMetadata {
  language: string;
  encoding: string;
  robots: string;
  generator: string;
  socialTags: Record<string, string>;
  structuredData: any[];
}

export class ExplorerAgent extends BaseAgent {
  private readonly explorerConfig: ExplorerConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private activeSessions: Map<string, { page: Page; startTime: Date; pageCount: number }>;

  constructor(config: AgentConfig = {}) {
    super('explorer', config);
    
    this.explorerConfig = {
      headless: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewportWidth: 1920,
      viewportHeight: 1080,
      navigationTimeout: 30000,
      enableScreenshots: true,
      maxPagesPerSession: 50,
      enableStealth: true,
      captchaSolverEnabled: false,
      ...config
    };

    this.activeSessions = new Map();
  }

  protected async onInitialize(): Promise<void> {
    await this.initializeBrowser();
    this.log('ExplorerAgent initialized successfully');
  }

  /**
   * Initialize Playwright browser with stealth configurations
   */
  private async initializeBrowser(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: this.explorerConfig.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });

      this.context = await this.browser.newContext({
        viewport: { 
          width: this.explorerConfig.viewportWidth, 
          height: this.explorerConfig.viewportHeight 
        },
        userAgent: this.explorerConfig.userAgent,
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: ['geolocation'],
        geolocation: { longitude: -74.0060, latitude: 40.7128 }, // NYC
        colorScheme: 'light'
      });

      // Add stealth configurations
      if (this.explorerConfig.enableStealth) {
        await this.applyStealth();
      }

      this.log('Browser initialized successfully', {
        headless: this.explorerConfig.headless,
        viewport: `${this.explorerConfig.viewportWidth}x${this.explorerConfig.viewportHeight}`,
        stealth: this.explorerConfig.enableStealth
      });
    } catch (error) {
      this.logError('Failed to initialize browser', error);
      throw error;
    }
  }

  /**
   * Apply stealth configurations to avoid detection
   */
  private async applyStealth(): Promise<void> {
    if (!this.context) return;

    // Override navigator properties
    await this.context.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' 
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters)
      );

      // Override chrome property
      Object.defineProperty(window, 'chrome', {
        get: () => ({
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {}
        }),
      });
    });

    this.log('Stealth configurations applied');
  }

  /**
   * Main execution method for exploration jobs
   */
  async execute(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    
    try {
      this.log(`Executing exploration job ${job.id}`, { 
        type: job.type, 
        priority: job.priority 
      });

      switch (job.type) {
        case 'explore_page':
          return await this.explorePage(job);
        case 'navigate_site':
          return await this.navigateSite(job);
        case 'detect_challenges':
          return await this.detectChallenges(job);
        case 'capture_page_state':
          return await this.capturePageState(job);
        case 'solve_captcha':
          return await this.solveCaptcha(job);
        case 'handle_dynamic_content':
          return await this.handleDynamicContent(job);
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (error) {
      this.logError(`Exploration job ${job.id} failed`, error);
      
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        warnings: ['Job execution failed']
      };
    }
  }

  /**
   * Explore a single page and analyze its structure
   */
  private async explorePage(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { url, options = {} } = job.payload;
    
    try {
      const page = await this.createPage(job.id);
      const analysis = await this.analyzePageStructure(page, url, options);
      
      await this.cleanupPage(job.id);
      
      return {
        success: true,
        data: analysis,
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          url,
          challenges: analysis.challenges.length,
          screenshots: analysis.screenshots.length
        }
      };
    } catch (error) {
      await this.cleanupPage(job.id);
      throw error;
    }
  }

  /**
   * Navigate through multiple pages of a site
   */
  private async navigateSite(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { startUrl, maxPages = 10, strategy = 'depth_first' } = job.payload;
    
    try {
      const page = await this.createPage(job.id);
      const results: PageAnalysis[] = [];
      const visitedUrls = new Set<string>();
      const urlQueue = [startUrl];
      
      while (urlQueue.length > 0 && results.length < maxPages) {
        const currentUrl = urlQueue.shift()!;
        
        if (visitedUrls.has(currentUrl)) {
          continue;
        }
        
        visitedUrls.add(currentUrl);
        
        try {
          const analysis = await this.analyzePageStructure(page, currentUrl);
          results.push(analysis);
          
          // Discover new URLs based on strategy
          const newUrls = await this.discoverUrls(page, strategy);
          for (const newUrl of newUrls) {
            if (!visitedUrls.has(newUrl) && !urlQueue.includes(newUrl)) {
              urlQueue.push(newUrl);
            }
          }
          
          // Respect rate limiting
          await this.delay(1000 + Math.random() * 1000);
          
        } catch (pageError) {
          this.logError(`Failed to analyze page ${currentUrl}`, pageError);
          continue;
        }
      }
      
      await this.cleanupPage(job.id);
      
      return {
        success: true,
        data: {
          totalPages: results.length,
          visitedUrls: Array.from(visitedUrls),
          analyses: results,
          strategy
        },
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          pagesAnalyzed: results.length,
          totalChallenges: results.reduce((sum, r) => sum + r.challenges.length, 0)
        }
      };
    } catch (error) {
      await this.cleanupPage(job.id);
      throw error;
    }
  }

  /**
   * Detect challenges on a page
   */
  private async detectChallenges(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { url } = job.payload;
    
    try {
      const page = await this.createPage(job.id);
      await page.goto(url, { waitUntil: 'networkidle' });
      
      const challenges = await this.identifyChallenges(page);
      
      await this.cleanupPage(job.id);
      
      return {
        success: true,
        data: { challenges, url },
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          challengeCount: challenges.length,
          highSeverityChallenges: challenges.filter(c => c.severity === 'high' || c.severity === 'critical').length
        }
      };
    } catch (error) {
      await this.cleanupPage(job.id);
      throw error;
    }
  }

  /**
   * Capture complete page state including screenshots
   */
  private async capturePageState(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { url, fullPage = true } = job.payload;
    
    try {
      const page = await this.createPage(job.id);
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Capture screenshots
      const screenshots: string[] = [];
      if (this.explorerConfig.enableScreenshots) {
        const screenshotBuffer = await page.screenshot({ 
          fullPage, 
          type: 'png' 
        });
        
        const screenshotUrl = await this.uploadScreenshot(screenshotBuffer, job.id);
        screenshots.push(screenshotUrl);
      }
      
      // Capture DOM state
      const domState = await page.evaluate(() => ({
        html: document.documentElement.outerHTML,
        title: document.title,
        url: window.location.href,
        cookies: document.cookie,
        localStorage: JSON.stringify(localStorage),
        sessionStorage: JSON.stringify(sessionStorage)
      }));
      
      // Capture network state
      const networkState = await page.evaluate(() => ({
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled
      }));
      
      await this.cleanupPage(job.id);
      
      return {
        success: true,
        data: {
          url,
          screenshots,
          domState,
          networkState,
          timestamp: new Date().toISOString()
        },
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          screenshotCount: screenshots.length,
          domSize: domState.html.length
        }
      };
    } catch (error) {
      await this.cleanupPage(job.id);
      throw error;
    }
  }

  /**
   * Solve captcha challenges
   */
  private async solveCaptcha(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    
    // TODO: Implement captcha solving logic
    // This would integrate with captcha solving services
    
    return {
      success: false,
      data: null,
      error: 'Captcha solving not implemented yet',
      executionTime: Date.now() - startTime,
      agentId: this.agentId,
      warnings: ['Captcha solving requires external service integration']
    };
  }

  /**
   * Handle dynamic content loading
   */
  private async handleDynamicContent(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { url, strategy = 'scroll_and_wait' } = job.payload;
    
    try {
      const page = await this.createPage(job.id);
      await page.goto(url, { waitUntil: 'networkidle' });
      
      let loadedContent = 0;
      const maxAttempts = 10;
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        const beforeCount = await page.locator('[data-item], .item, .listing, .product').count();
        
        // Apply dynamic content strategy
        switch (strategy) {
          case 'scroll_and_wait':
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(2000);
            break;
            
          case 'load_more_button':
            const loadMoreBtn = page.locator('button:has-text("Load More"), button:has-text("Show More"), .load-more').first();
            if (await loadMoreBtn.isVisible()) {
              await loadMoreBtn.click();
              await page.waitForTimeout(3000);
            }
            break;
            
          case 'infinite_scroll':
            await this.simulateInfiniteScroll(page);
            break;
        }
        
        const afterCount = await page.locator('[data-item], .item, .listing, .product').count();
        const newItems = afterCount - beforeCount;
        
        if (newItems === 0) {
          break; // No more content loaded
        }
        
        loadedContent += newItems;
        attempts++;
        
        this.log(`Loaded ${newItems} new items (total: ${loadedContent})`);
      }
      
      // Capture final state
      const finalState = await this.capturePageStructure(page);
      
      await this.cleanupPage(job.id);
      
      return {
        success: true,
        data: {
          url,
          strategy,
          loadedItems: loadedContent,
          attempts,
          finalState
        },
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          itemsLoaded: loadedContent,
          scrollAttempts: attempts
        }
      };
    } catch (error) {
      await this.cleanupPage(job.id);
      throw error;
    }
  }

  /**
   * Analyze page structure comprehensively
   */
  private async analyzePageStructure(page: Page, url: string, options: any = {}): Promise<PageAnalysis> {
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: this.explorerConfig.navigationTimeout 
    });

    // Wait for potential dynamic content
    await page.waitForTimeout(2000);

    const [structure, challenges, navigationInfo, performance, metadata] = await Promise.all([
      this.capturePageStructure(page),
      this.identifyChallenges(page),
      this.analyzeNavigation(page),
      this.capturePerformanceMetrics(page),
      this.extractPageMetadata(page)
    ]);

    // Capture screenshots if enabled
    const screenshots: string[] = [];
    if (this.explorerConfig.enableScreenshots) {
      try {
        const screenshotBuffer = await page.screenshot({ 
          fullPage: options.fullPageScreenshot || false,
          type: 'png' 
        });
        const screenshotUrl = await this.uploadScreenshot(screenshotBuffer, `${Date.now()}`);
        screenshots.push(screenshotUrl);
      } catch (error) {
        this.logError('Failed to capture screenshot', error);
      }
    }

    return {
      url,
      title: await page.title(),
      structure,
      challenges,
      navigationInfo,
      performance,
      screenshots,
      metadata
    };
  }

  /**
   * Capture basic page structure metrics
   */
  private async capturePageStructure(page: Page): Promise<PageAnalysis['structure']> {
    return await page.evaluate(() => {
      const forms = document.querySelectorAll('form').length;
      const links = document.querySelectorAll('a[href]').length;
      const lists = document.querySelectorAll('ul, ol').length;
      const dataElements = document.querySelectorAll('[data-*], .item, .listing, .product, .card').length;
      const totalElements = document.querySelectorAll('*').length;

      return {
        totalElements,
        formElements: forms,
        linkElements: links,
        listElements: lists,
        dataElements
      };
    });
  }

  /**
   * Identify challenges on the page
   */
  private async identifyChallenges(page: Page): Promise<Challenge[]> {
    const challenges: Challenge[] = [];

    try {
      // Check for captchas
      const captchaSelectors = [
        '.g-recaptcha',
        '.h-captcha', 
        '[data-callback]',
        'iframe[src*="recaptcha"]',
        'iframe[src*="hcaptcha"]'
      ];
      
      for (const selector of captchaSelectors) {
        if (await page.locator(selector).count() > 0) {
          challenges.push({
            type: 'captcha',
            severity: 'high',
            description: 'CAPTCHA detected on page',
            location: { selector },
            suggestedSolution: 'Use captcha solving service or human intervention',
            confidence: 0.9
          });
        }
      }

      // Check for authentication requirements
      const authSelectors = [
        '[type="password"]',
        '.login-form',
        '.signin-form',
        'input[name*="password"]'
      ];
      
      for (const selector of authSelectors) {
        if (await page.locator(selector).count() > 0) {
          challenges.push({
            type: 'auth',
            severity: 'medium',
            description: 'Authentication required',
            location: { selector },
            suggestedSolution: 'Provide authentication credentials',
            confidence: 0.8
          });
        }
      }

      // Check for rate limiting indicators
      const rateLimitIndicators = [
        'text=rate limit',
        'text=too many requests',
        'text=blocked',
        '.rate-limit'
      ];
      
      for (const selector of rateLimitIndicators) {
        if (await page.locator(selector).count() > 0) {
          challenges.push({
            type: 'rate_limit',
            severity: 'critical',
            description: 'Rate limiting detected',
            location: { selector },
            suggestedSolution: 'Implement request throttling and retry logic',
            confidence: 0.95
          });
        }
      }

      // Check for dynamic content
      const dynamicIndicators = [
        '.loading',
        '.spinner',
        '[data-loading]',
        'text=Loading'
      ];
      
      for (const selector of dynamicIndicators) {
        if (await page.locator(selector).count() > 0) {
          challenges.push({
            type: 'dynamic_content',
            severity: 'low',
            description: 'Dynamic content loading detected',
            location: { selector },
            suggestedSolution: 'Wait for content to load completely',
            confidence: 0.7
          });
        }
      }

      // Check for modals and popups
      const modalSelectors = [
        '.modal',
        '.popup',
        '.overlay',
        '[role="dialog"]'
      ];
      
      for (const selector of modalSelectors) {
        const modals = page.locator(selector);
        if (await modals.count() > 0) {
          const isVisible = await modals.first().isVisible();
          if (isVisible) {
            challenges.push({
              type: 'modal',
              severity: 'medium',
              description: 'Modal or popup blocking content',
              location: { selector },
              suggestedSolution: 'Close modal before proceeding',
              confidence: 0.85
            });
          }
        }
      }

    } catch (error) {
      this.logError('Error identifying challenges', error);
    }

    return challenges;
  }

  /**
   * Analyze navigation elements and patterns
   */
  private async analyzeNavigation(page: Page): Promise<NavigationInfo> {
    return await page.evaluate(() => {
      // Analyze pagination
      const paginationInfo = {
        hasNext: false,
        hasPrevious: false,
        totalPages: undefined as number | undefined,
        currentPage: undefined as number | undefined,
        nextPageSelector: undefined as string | undefined,
        previousPageSelector: undefined as string | undefined
      };

      // Look for common pagination patterns
      const nextSelectors = ['a[rel="next"]', '.next', '.page-next', 'a:has-text("Next")', 'a:has-text("›")', 'a:has-text("→")'];
      const prevSelectors = ['a[rel="prev"]', '.prev', '.page-prev', 'a:has-text("Previous")', 'a:has-text("‹")', 'a:has-text("←")'];

      for (const selector of nextSelectors) {
        const element = document.querySelector(selector);
        if (element && element instanceof HTMLElement) {
          paginationInfo.hasNext = true;
          paginationInfo.nextPageSelector = selector;
          break;
        }
      }

      for (const selector of prevSelectors) {
        const element = document.querySelector(selector);
        if (element && element instanceof HTMLElement) {
          paginationInfo.hasPrevious = true;
          paginationInfo.previousPageSelector = selector;
          break;
        }
      }

      // Analyze search forms
      const searchForm = {
        present: false,
        selector: undefined as string | undefined,
        fields: [] as Array<{
          name: string;
          type: string;
          selector: string;
          required: boolean;
        }>
      };

      const searchForms = document.querySelectorAll('form');
      for (const form of searchForms) {
        const hasSearchIndicators = form.querySelector('input[type="search"], input[name*="search"], input[placeholder*="search"]');
        if (hasSearchIndicators) {
          searchForm.present = true;
          searchForm.selector = `form:nth-of-type(${Array.from(searchForms).indexOf(form) + 1})`;
          
          const inputs = form.querySelectorAll('input, select, textarea');
          for (const input of inputs) {
            if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement) {
              searchForm.fields.push({
                name: input.name || input.id || 'unnamed',
                type: input.type || 'text',
                selector: input.tagName.toLowerCase() + (input.id ? `#${input.id}` : input.name ? `[name="${input.name}"]` : ''),
                required: input.hasAttribute('required')
              });
            }
          }
          break;
        }
      }

      // Analyze filters
      const filters: NavigationInfo['filters'] = [];
      const filterContainers = document.querySelectorAll('.filters, .filter-bar, .sidebar, [class*="filter"]');
      
      for (const container of filterContainers) {
        const selects = container.querySelectorAll('select');
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        const radios = container.querySelectorAll('input[type="radio"]');
        
        selects.forEach((select, index) => {
          const options = Array.from(select.options).map(opt => opt.text);
          filters.push({
            name: select.name || select.id || `select_${index}`,
            type: 'dropdown',
            selector: select.tagName.toLowerCase() + (select.id ? `#${select.id}` : select.name ? `[name="${select.name}"]` : `[data-index="${index}"]`),
            options
          });
        });

        checkboxes.forEach((checkbox, index) => {
          filters.push({
            name: checkbox.name || checkbox.id || `checkbox_${index}`,
            type: 'checkbox',
            selector: `input[type="checkbox"]${checkbox.id ? `#${checkbox.id}` : checkbox.name ? `[name="${checkbox.name}"]` : `[data-index="${index}"]`}`
          });
        });
      }

      // Analyze data containers
      const dataContainers: NavigationInfo['dataContainers'] = [];
      const containerSelectors = [
        { selector: '.items', itemSelector: '.item' },
        { selector: '.listings', itemSelector: '.listing' },
        { selector: '.products', itemSelector: '.product' },
        { selector: '.results', itemSelector: '.result' },
        { selector: '[data-items]', itemSelector: '[data-item]' },
        { selector: 'ul', itemSelector: 'li' },
        { selector: '.grid', itemSelector: '.grid-item' }
      ];

      for (const { selector, itemSelector } of containerSelectors) {
        const containers = document.querySelectorAll(selector);
        for (const container of containers) {
          const items = container.querySelectorAll(itemSelector);
          if (items.length > 2) { // Minimum threshold for data container
            dataContainers.push({
              selector,
              itemCount: items.length,
              itemSelector,
              confidence: items.length > 10 ? 0.9 : 0.6
            });
          }
        }
      }

      return {
        pagination: paginationInfo,
        searchForm,
        filters,
        dataContainers
      };
    });
  }

  /**
   * Capture performance metrics
   */
  private async capturePerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
    const performanceData = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource');
      
      let resourceSizes = {
        html: 0,
        css: 0,
        js: 0,
        images: 0,
        total: 0
      };

      resources.forEach(resource => {
        const size = (resource as any).transferSize || 0;
        resourceSizes.total += size;
        
        if (resource.name.includes('.css')) {
          resourceSizes.css += size;
        } else if (resource.name.includes('.js')) {
          resourceSizes.js += size;
        } else if (resource.name.includes('.png') || resource.name.includes('.jpg') || resource.name.includes('.jpeg') || resource.name.includes('.gif') || resource.name.includes('.webp')) {
          resourceSizes.images += size;
        } else if (resource.initiatorType === 'navigation') {
          resourceSizes.html += size;
        }
      });

      return {
        loadTime: navigation.loadEventEnd - navigation.navigationStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        firstContentfulPaint: 0, // Would need Paint Timing API
        networkRequests: resources.length,
        resourceSizes
      };
    });

    // Capture JavaScript errors
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    return {
      ...performanceData,
      jsErrors
    };
  }

  /**
   * Extract page metadata
   */
  private async extractPageMetadata(page: Page): Promise<PageMetadata> {
    return await page.evaluate(() => {
      const getMetaContent = (name: string) => {
        const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return meta ? meta.getAttribute('content') || '' : '';
      };

      const socialTags: Record<string, string> = {};
      const socialSelectors = [
        'og:title', 'og:description', 'og:image', 'og:url', 'og:type',
        'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'
      ];

      socialSelectors.forEach(selector => {
        const content = getMetaContent(selector);
        if (content) {
          socialTags[selector] = content;
        }
      });

      // Extract structured data
      const structuredData: any[] = [];
      const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
      ldJsonScripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent || '');
          structuredData.push(data);
        } catch (e) {
          // Invalid JSON, skip
        }
      });

      return {
        language: document.documentElement.lang || getMetaContent('language') || 'unknown',
        encoding: document.characterSet || 'unknown',
        robots: getMetaContent('robots') || '',
        generator: getMetaContent('generator') || '',
        socialTags,
        structuredData
      };
    });
  }

  /**
   * Discover URLs on the page based on strategy
   */
  private async discoverUrls(page: Page, strategy: string): Promise<string[]> {
    return await page.evaluate((strategy) => {
      const urls: string[] = [];
      const currentDomain = window.location.hostname;

      const links = Array.from(document.querySelectorAll('a[href]'));
      
      for (const link of links) {
        const href = link.getAttribute('href');
        if (!href) continue;

        try {
          const url = new URL(href, window.location.href);
          
          // Filter based on strategy
          switch (strategy) {
            case 'same_domain':
              if (url.hostname === currentDomain) {
                urls.push(url.href);
              }
              break;
            case 'depth_first':
              // Prioritize deeper paths on same domain
              if (url.hostname === currentDomain && url.pathname.split('/').length > 2) {
                urls.push(url.href);
              }
              break;
            case 'breadth_first':
              // Prioritize same-level pages
              if (url.hostname === currentDomain) {
                urls.push(url.href);
              }
              break;
            default:
              urls.push(url.href);
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }

      return [...new Set(urls)]; // Remove duplicates
    }, strategy);
  }

  /**
   * Simulate infinite scroll behavior
   */
  private async simulateInfiniteScroll(page: Page): Promise<void> {
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    let currentScroll = 0;
    const scrollStep = viewportHeight * 0.8; // Scroll 80% of viewport height
    
    while (currentScroll < scrollHeight) {
      currentScroll += scrollStep;
      await page.evaluate((scroll) => window.scrollTo(0, scroll), currentScroll);
      await page.waitForTimeout(1500); // Wait for content to load
      
      // Check if new content was loaded
      const newScrollHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newScrollHeight > scrollHeight) {
        // New content loaded, continue
        continue;
      }
    }
  }

  /**
   * Upload screenshot to Vercel Blob storage
   */
  private async uploadScreenshot(buffer: Buffer, jobId: string): Promise<string> {
    try {
      const filename = `screenshots/${jobId}_${Date.now()}.png`;
      const { url } = await put(filename, buffer, {
        access: 'public',
        token: config.getBlobConfig().token
      });
      
      this.log(`Screenshot uploaded: ${url}`);
      return url;
    } catch (error) {
      this.logError('Failed to upload screenshot', error);
      throw error;
    }
  }

  /**
   * Create a new page for a job
   */
  private async createPage(jobId: string): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    const page = await this.context.newPage();
    
    // Set up request interception for performance monitoring
    await page.route('**/*', (route) => {
      const request = route.request();
      
      // Block unnecessary resources in headless mode
      if (this.explorerConfig.headless) {
        const resourceType = request.resourceType();
        if (['image', 'media', 'font'].includes(resourceType)) {
          route.abort();
          return;
        }
      }
      
      route.continue();
    });

    this.activeSessions.set(jobId, {
      page,
      startTime: new Date(),
      pageCount: 1
    });

    return page;
  }

  /**
   * Cleanup page resources
   */
  private async cleanupPage(jobId: string): Promise<void> {
    const session = this.activeSessions.get(jobId);
    if (session) {
      try {
        await session.page.close();
      } catch (error) {
        this.logError('Error closing page', error);
      }
      this.activeSessions.delete(jobId);
    }
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    try {
      // Close all active pages
      for (const [jobId] of this.activeSessions) {
        await this.cleanupPage(jobId);
      }

      // Close browser context and browser
      if (this.context) {
        await this.context.close();
        this.context = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      await super.cleanup();
      this.log('ExplorerAgent cleanup completed');
    } catch (error) {
      this.logError('ExplorerAgent cleanup failed', error);
    }
  }

  /**
   * Utility method to add delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ExplorerAgent;