/**
 * AnalyzerAgent - Multi-modal analysis and pattern recognition specialist
 * 
 * Responsibilities:
 * - Structure and semantic analysis of web pages
 * - Pattern matching with historical data
 * - Strategy generation for data extraction
 * - AI-powered content understanding using Google AI
 * - Learning from past scraping experiences
 * - Visual layout analysis and element classification
 */

import { BaseAgent } from './base/BaseAgent';
import { 
  AgentJob, 
  AgentResult, 
  AgentConfig 
} from './types/AgentTypes';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../lib/config';

interface AnalyzerConfig extends AgentConfig {
  aiModel: string;
  maxTokens: number;
  temperature: number;
  enableVisionAnalysis: boolean;
  patternMatchingThreshold: number;
  learningEnabled: boolean;
  cacheAnalysisResults: boolean;
}

interface StructureAnalysis {
  semanticStructure: SemanticStructure;
  layoutAnalysis: LayoutAnalysis;
  contentPatterns: ContentPattern[];
  extractionStrategy: ExtractionStrategy;
  confidence: number;
  metadata: AnalysisMetadata;
}

interface SemanticStructure {
  pageType: 'listing' | 'detail' | 'search' | 'category' | 'homepage' | 'unknown';
  contentAreas: ContentArea[];
  navigationElements: NavigationElement[];
  dataElements: DataElement[];
  relationships: ElementRelationship[];
}

interface ContentArea {
  type: 'header' | 'footer' | 'sidebar' | 'main' | 'navigation' | 'advertisement' | 'content';
  selector: string;
  bounds: { x: number; y: number; width: number; height: number };
  importance: number;
  content: string;
}

interface LayoutAnalysis {
  gridStructure: GridStructure;
  responsiveDesign: boolean;
  visualHierarchy: VisualElement[];
  colorScheme: ColorScheme;
  typography: Typography;
}

interface GridStructure {
  type: 'grid' | 'list' | 'table' | 'card' | 'mixed';
  columns: number;
  rows: number;
  itemSelector: string;
  containerSelector: string;
}

interface ContentPattern {
  type: 'vehicle_listing' | 'price' | 'specification' | 'contact' | 'image' | 'description';
  pattern: RegExp | string;
  selector: string;
  frequency: number;
  examples: string[];
  confidence: number;
}

interface ExtractionStrategy {
  approach: 'css_selectors' | 'xpath' | 'text_patterns' | 'ai_guided' | 'hybrid';
  selectors: Record<string, string>;
  fallbackSelectors: Record<string, string[]>;
  preprocessing: PreprocessingStep[];
  postprocessing: PostprocessingStep[];
  validation: ValidationRule[];
  estimatedSuccessRate: number;
}

interface PreprocessingStep {
  type: 'remove_elements' | 'wait_for_load' | 'scroll' | 'click' | 'hover';
  selector?: string;
  value?: string | number;
  condition?: string;
}

interface PostprocessingStep {
  type: 'clean_text' | 'normalize_price' | 'extract_numbers' | 'geocode' | 'validate';
  field: string;
  parameters: Record<string, any>;
}

interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'pattern';
  condition: string | RegExp | number[];
}

interface DataElement {
  type: string;
  selector: string;
  attributes: Record<string, string>;
  textContent: string;
  value: any;
  confidence: number;
  position: { x: number; y: number };
}

interface NavigationElement {
  type: 'pagination' | 'search' | 'filter' | 'sort' | 'breadcrumb';
  selector: string;
  functionality: string;
  parameters: Record<string, any>;
}

interface ElementRelationship {
  parentElement: string;
  childElement: string;
  relationship: 'contains' | 'sibling' | 'adjacent' | 'grouped';
  strength: number;
}

interface VisualElement {
  selector: string;
  level: number;
  visualWeight: number;
  area: number;
  position: 'above_fold' | 'below_fold';
}

interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

interface Typography {
  primaryFont: string;
  headingFont: string;
  sizes: Record<string, number>;
  weights: Record<string, number>;
}

interface AnalysisMetadata {
  analysisTime: number;
  pageUrl: string;
  pageTitle: string;
  pageSize: number;
  elementCount: number;
  complexity: 'low' | 'medium' | 'high';
  aiModelUsed: string;
  version: string;
}

interface HistoricalPattern {
  sitePattern: string;
  domain: string;
  pageType: string;
  successRate: number;
  lastUsed: Date;
  usage: number;
  strategy: ExtractionStrategy;
}

export class AnalyzerAgent extends BaseAgent {
  private readonly analyzerConfig: AnalyzerConfig;
  private genAI: GoogleGenerativeAI;
  private model: any;
  private historicalPatterns: Map<string, HistoricalPattern>;

  constructor(config: AgentConfig = {}) {
    super('analyzer', config);
    
    this.analyzerConfig = {
      aiModel: 'gemini-1.5-flash',
      maxTokens: 4096,
      temperature: 0.3,
      enableVisionAnalysis: true,
      patternMatchingThreshold: 0.7,
      learningEnabled: true,
      cacheAnalysisResults: true,
      ...config
    };

    this.historicalPatterns = new Map();
    
    // Initialize Google AI
    const googleAIConfig = config.getGoogleAIConfig();
    this.genAI = new GoogleGenerativeAI(googleAIConfig.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.analyzerConfig.aiModel });
  }

  protected async onInitialize(): Promise<void> {
    await this.loadHistoricalPatterns();
    this.log('AnalyzerAgent initialized successfully');
  }

  /**
   * Load historical patterns from memory
   */
  private async loadHistoricalPatterns(): Promise<void> {
    try {
      const patterns = await this.getMemory('historical_patterns');
      if (patterns && Array.isArray(patterns)) {
        for (const pattern of patterns) {
          this.historicalPatterns.set(pattern.sitePattern, pattern);
        }
        this.log(`Loaded ${patterns.length} historical patterns`);
      }
    } catch (error) {
      this.logError('Failed to load historical patterns', error);
    }
  }

  /**
   * Main execution method for analysis jobs
   */
  async execute(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    
    try {
      this.log(`Executing analysis job ${job.id}`, { 
        type: job.type, 
        priority: job.priority 
      });

      switch (job.type) {
        case 'analyze_structure':
          return await this.analyzeStructure(job);
        case 'generate_strategy':
          return await this.generateExtractionStrategy(job);
        case 'match_patterns':
          return await this.matchPatterns(job);
        case 'analyze_content':
          return await this.analyzeContent(job);
        case 'visual_analysis':
          return await this.performVisualAnalysis(job);
        case 'learn_from_data':
          return await this.learnFromData(job);
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (error) {
      this.logError(`Analysis job ${job.id} failed`, error);
      
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
   * Analyze page structure comprehensively
   */
  private async analyzeStructure(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { pageData, screenshots, url } = job.payload;
    
    try {
      // Check for cached analysis
      const cacheKey = `structure_analysis_${this.hashUrl(url)}`;
      if (this.analyzerConfig.cacheAnalysisResults) {
        const cached = await this.getMemory(cacheKey);
        if (cached && this.isCacheValid(cached)) {
          return {
            success: true,
            data: cached,
            executionTime: Date.now() - startTime,
            agentId: this.agentId,
            warnings: ['Result from cache']
          };
        }
      }

      // Perform multi-modal analysis
      const [semanticStructure, layoutAnalysis, contentPatterns] = await Promise.all([
        this.analyzeSemanticStructure(pageData),
        this.analyzeLayout(pageData, screenshots),
        this.identifyContentPatterns(pageData)
      ]);

      // Generate extraction strategy
      const extractionStrategy = await this.createExtractionStrategy(
        semanticStructure,
        contentPatterns,
        url
      );

      // Calculate overall confidence
      const confidence = this.calculateAnalysisConfidence(
        semanticStructure,
        contentPatterns,
        extractionStrategy
      );

      const analysis: StructureAnalysis = {
        semanticStructure,
        layoutAnalysis,
        contentPatterns,
        extractionStrategy,
        confidence,
        metadata: {
          analysisTime: Date.now() - startTime,
          pageUrl: url,
          pageTitle: pageData.title || 'Unknown',
          pageSize: JSON.stringify(pageData).length,
          elementCount: this.countElements(pageData),
          complexity: this.assessComplexity(pageData),
          aiModelUsed: this.analyzerConfig.aiModel,
          version: '1.0.0'
        }
      };

      // Cache the results
      if (this.analyzerConfig.cacheAnalysisResults) {
        await this.storeMemory(cacheKey, analysis, 3600000); // 1 hour cache
      }

      return {
        success: true,
        data: analysis,
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          confidence,
          complexity: analysis.metadata.complexity,
          patternsFound: contentPatterns.length
        }
      };
    } catch (error) {
      this.logError('Structure analysis failed', error);
      throw error;
    }
  }

  /**
   * Analyze semantic structure using AI
   */
  private async analyzeSemanticStructure(pageData: any): Promise<SemanticStructure> {
    try {
      const htmlContent = pageData.html || pageData.content || '';
      const prompt = `
        Analyze this HTML content and identify the semantic structure:
        
        ${htmlContent.substring(0, 8000)} // Truncate for token limits
        
        Identify:
        1. Page type (listing, detail, search, category, homepage)
        2. Main content areas and their purpose
        3. Navigation elements
        4. Data elements (listings, products, etc.)
        5. Relationships between elements
        
        Respond with a JSON structure containing these elements.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse AI response
      let aiAnalysis;
      try {
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiAnalysis = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        this.logError('Failed to parse AI response', parseError);
      }

      // Fallback to heuristic analysis if AI fails
      if (!aiAnalysis) {
        aiAnalysis = await this.heuristicSemanticAnalysis(pageData);
      }

      return this.normalizeSemanticStructure(aiAnalysis, pageData);
    } catch (error) {
      this.logError('Semantic analysis failed, using fallback', error);
      return await this.heuristicSemanticAnalysis(pageData);
    }
  }

  /**
   * Heuristic semantic analysis as fallback
   */
  private async heuristicSemanticAnalysis(pageData: any): Promise<SemanticStructure> {
    const html = pageData.html || '';
    const title = pageData.title || '';
    
    // Determine page type
    let pageType: SemanticStructure['pageType'] = 'unknown';
    if (html.includes('product') || html.includes('item') || title.includes('listing')) {
      pageType = 'listing';
    } else if (html.includes('search') && html.includes('form')) {
      pageType = 'search';
    } else if (html.includes('category') || html.includes('categories')) {
      pageType = 'category';
    } else if (title.toLowerCase().includes('home') || html.includes('hero')) {
      pageType = 'homepage';
    }

    // Extract content areas (simplified)
    const contentAreas: ContentArea[] = [
      {
        type: 'header',
        selector: 'header, .header, #header',
        bounds: { x: 0, y: 0, width: 1920, height: 100 },
        importance: 0.8,
        content: 'Header area'
      },
      {
        type: 'main',
        selector: 'main, .main, #main, .content',
        bounds: { x: 0, y: 100, width: 1920, height: 800 },
        importance: 1.0,
        content: 'Main content area'
      },
      {
        type: 'footer',
        selector: 'footer, .footer, #footer',
        bounds: { x: 0, y: 900, width: 1920, height: 100 },
        importance: 0.3,
        content: 'Footer area'
      }
    ];

    // Extract navigation elements
    const navigationElements: NavigationElement[] = [];
    if (html.includes('pagination') || html.includes('next') || html.includes('prev')) {
      navigationElements.push({
        type: 'pagination',
        selector: '.pagination, .pager, .page-nav',
        functionality: 'page_navigation',
        parameters: {}
      });
    }

    // Extract data elements (simplified)
    const dataElements: DataElement[] = [];
    
    return {
      pageType,
      contentAreas,
      navigationElements,
      dataElements,
      relationships: []
    };
  }

  /**
   * Normalize semantic structure from AI response
   */
  private normalizeSemanticStructure(aiAnalysis: any, pageData: any): SemanticStructure {
    return {
      pageType: aiAnalysis.pageType || 'unknown',
      contentAreas: aiAnalysis.contentAreas || [],
      navigationElements: aiAnalysis.navigationElements || [],
      dataElements: aiAnalysis.dataElements || [],
      relationships: aiAnalysis.relationships || []
    };
  }

  /**
   * Analyze visual layout
   */
  private async analyzeLayout(pageData: any, screenshots: string[]): Promise<LayoutAnalysis> {
    // For now, implement basic layout analysis
    // In a full implementation, this would analyze screenshots using computer vision
    
    const html = pageData.html || '';
    
    // Detect grid structure
    const gridStructure: GridStructure = {
      type: 'list',
      columns: 1,
      rows: 0,
      itemSelector: '.item, .listing, .product',
      containerSelector: '.items, .listings, .products'
    };

    // Detect if it's a grid layout
    if (html.includes('grid') || html.includes('col-') || html.includes('column')) {
      gridStructure.type = 'grid';
      gridStructure.columns = this.detectColumns(html);
    }

    // Visual hierarchy (simplified)
    const visualHierarchy: VisualElement[] = [
      {
        selector: 'h1, .title, .main-heading',
        level: 1,
        visualWeight: 1.0,
        area: 1000,
        position: 'above_fold'
      },
      {
        selector: 'h2, .subtitle',
        level: 2,
        visualWeight: 0.8,
        area: 800,
        position: 'above_fold'
      }
    ];

    return {
      gridStructure,
      responsiveDesign: html.includes('responsive') || html.includes('mobile'),
      visualHierarchy,
      colorScheme: {
        primary: '#000000',
        secondary: '#ffffff',
        accent: '#007bff',
        background: '#ffffff',
        text: '#333333'
      },
      typography: {
        primaryFont: 'Arial, sans-serif',
        headingFont: 'Arial, sans-serif',
        sizes: { h1: 24, h2: 20, body: 14 },
        weights: { normal: 400, bold: 700 }
      }
    };
  }

  /**
   * Detect number of columns in layout
   */
  private detectColumns(html: string): number {
    // Look for common grid patterns
    if (html.includes('col-12') || html.includes('col-sm-12')) return 1;
    if (html.includes('col-6') || html.includes('col-sm-6')) return 2;
    if (html.includes('col-4') || html.includes('col-sm-4')) return 3;
    if (html.includes('col-3') || html.includes('col-sm-3')) return 4;
    
    // Count flex items or grid items
    const flexMatches = html.match(/flex-item|grid-item/g);
    if (flexMatches && flexMatches.length > 0) {
      return Math.min(flexMatches.length, 4);
    }
    
    return 1;
  }

  /**
   * Identify content patterns
   */
  private async identifyContentPatterns(pageData: any): Promise<ContentPattern[]> {
    const patterns: ContentPattern[] = [];
    const html = pageData.html || '';
    const text = pageData.text || '';

    // Vehicle-specific patterns
    const vehiclePatterns = [
      {
        type: 'vehicle_listing' as const,
        pattern: /\b\d{4}\s+([\w\s]+)\s+([\w\s]+)\b/,
        selector: '.vehicle-title, .car-title, .listing-title',
        examples: ['2020 Toyota Camry', '2019 Honda Civic']
      },
      {
        type: 'price' as const,
        pattern: /\$[\d,]+|\$\d+,\d{3}|\$\d+\.\d{3}/,
        selector: '.price, .cost, .value, [class*="price"]',
        examples: ['$25,000', '$30.500']
      },
      {
        type: 'specification' as const,
        pattern: /\d+\s*(km|miles|cc|hp|bhp)/i,
        selector: '.specs, .specification, .details',
        examples: ['150,000 km', '200 hp', '2.0L']
      }
    ];

    for (const patternDef of vehiclePatterns) {
      const matches = text.match(new RegExp(patternDef.pattern, 'g'));
      if (matches) {
        patterns.push({
          ...patternDef,
          frequency: matches.length,
          examples: matches.slice(0, 5),
          confidence: Math.min(matches.length / 10, 1.0)
        });
      }
    }

    return patterns;
  }

  /**
   * Generate extraction strategy
   */
  private async generateExtractionStrategy(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { structureAnalysis, url } = job.payload;
    
    try {
      const strategy = await this.createExtractionStrategy(
        structureAnalysis.semanticStructure,
        structureAnalysis.contentPatterns,
        url
      );

      return {
        success: true,
        data: strategy,
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          approach: strategy.approach,
          selectorCount: Object.keys(strategy.selectors).length,
          successRate: strategy.estimatedSuccessRate
        }
      };
    } catch (error) {
      this.logError('Strategy generation failed', error);
      throw error;
    }
  }

  /**
   * Create extraction strategy based on analysis
   */
  private async createExtractionStrategy(
    semanticStructure: SemanticStructure,
    contentPatterns: ContentPattern[],
    url: string
  ): Promise<ExtractionStrategy> {
    // Check for historical patterns first
    const domain = new URL(url).hostname;
    const historicalStrategy = this.findHistoricalPattern(domain, semanticStructure.pageType);
    
    if (historicalStrategy && historicalStrategy.successRate > this.analyzerConfig.patternMatchingThreshold) {
      this.log(`Using historical pattern for ${domain}`, { successRate: historicalStrategy.successRate });
      return historicalStrategy.strategy;
    }

    // Generate new strategy
    const selectors: Record<string, string> = {};
    const fallbackSelectors: Record<string, string[]> = {};

    // Map content patterns to selectors
    for (const pattern of contentPatterns) {
      const fieldName = this.mapPatternToField(pattern.type);
      selectors[fieldName] = pattern.selector;
      fallbackSelectors[fieldName] = this.generateFallbackSelectors(pattern.type);
    }

    // Add common vehicle data selectors
    const commonSelectors = {
      title: '.title, .vehicle-title, .car-title, h1, h2',
      price: '.price, .cost, .value, [class*="price"], [data-price]',
      year: '[data-year], .year, .model-year',
      mileage: '.mileage, .kilometers, .miles, [data-mileage]',
      description: '.description, .details, .info, p',
      images: 'img[src*="vehicle"], img[src*="car"], .gallery img, .images img',
      location: '.location, .address, .city, [data-location]',
      seller: '.seller, .dealer, .contact, [data-seller]'
    };

    // Merge with generated selectors
    Object.assign(selectors, commonSelectors);

    const strategy: ExtractionStrategy = {
      approach: 'hybrid',
      selectors,
      fallbackSelectors,
      preprocessing: [
        {
          type: 'wait_for_load',
          value: 2000
        },
        {
          type: 'scroll',
          value: 'bottom'
        }
      ],
      postprocessing: [
        {
          type: 'clean_text',
          field: 'title',
          parameters: { trim: true, removeExtra: true }
        },
        {
          type: 'normalize_price',
          field: 'price',
          parameters: { currency: 'detect', removeSymbols: true }
        }
      ],
      validation: [
        {
          field: 'title',
          type: 'required',
          condition: 'not_empty'
        },
        {
          field: 'price',
          type: 'range',
          condition: [1000, 1000000]
        }
      ],
      estimatedSuccessRate: this.calculateSuccessRate(semanticStructure, contentPatterns)
    };

    // Store pattern for future use
    if (this.analyzerConfig.learningEnabled) {
      await this.storePattern(domain, semanticStructure.pageType, strategy);
    }

    return strategy;
  }

  /**
   * Map pattern type to field name
   */
  private mapPatternToField(patternType: string): string {
    const mapping: Record<string, string> = {
      'vehicle_listing': 'title',
      'price': 'price',
      'specification': 'specs',
      'contact': 'seller',
      'image': 'images',
      'description': 'description'
    };
    return mapping[patternType] || patternType;
  }

  /**
   * Generate fallback selectors for pattern type
   */
  private generateFallbackSelectors(patternType: string): string[] {
    const fallbacks: Record<string, string[]> = {
      'vehicle_listing': ['.title', 'h1', 'h2', '.name', '.model'],
      'price': ['.price', '.cost', '.amount', '[data-price]', '.value'],
      'specification': ['.specs', '.details', '.info', '.specifications'],
      'contact': ['.contact', '.seller', '.dealer', '.phone', '.email'],
      'image': ['img', '.image', '.photo', '.picture'],
      'description': ['.description', '.details', 'p', '.info']
    };
    return fallbacks[patternType] || [`.${patternType}`];
  }

  /**
   * Find historical pattern for domain and page type
   */
  private findHistoricalPattern(domain: string, pageType: string): HistoricalPattern | null {
    const key = `${domain}_${pageType}`;
    return this.historicalPatterns.get(key) || null;
  }

  /**
   * Store successful pattern for future use
   */
  private async storePattern(domain: string, pageType: string, strategy: ExtractionStrategy): Promise<void> {
    const key = `${domain}_${pageType}`;
    const pattern: HistoricalPattern = {
      sitePattern: key,
      domain,
      pageType,
      successRate: 0.8, // Initial estimate
      lastUsed: new Date(),
      usage: 1,
      strategy
    };

    this.historicalPatterns.set(key, pattern);
    
    // Persist to memory
    await this.storeMemory('historical_patterns', Array.from(this.historicalPatterns.values()));
  }

  /**
   * Calculate estimated success rate
   */
  private calculateSuccessRate(semanticStructure: SemanticStructure, contentPatterns: ContentPattern[]): number {
    let score = 0.5; // Base score

    // Boost for recognized page type
    if (semanticStructure.pageType !== 'unknown') {
      score += 0.2;
    }

    // Boost for found patterns
    const avgPatternConfidence = contentPatterns.reduce((sum, p) => sum + p.confidence, 0) / contentPatterns.length;
    score += avgPatternConfidence * 0.3;

    return Math.min(score, 1.0);
  }

  /**
   * Match patterns against historical data
   */
  private async matchPatterns(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { url, pageData } = job.payload;
    
    try {
      const domain = new URL(url).hostname;
      const matches: any[] = [];

      for (const [key, pattern] of this.historicalPatterns) {
        if (pattern.domain === domain) {
          const similarity = await this.calculateSimilarity(pageData, pattern);
          if (similarity > this.analyzerConfig.patternMatchingThreshold) {
            matches.push({
              pattern: pattern.sitePattern,
              similarity,
              strategy: pattern.strategy,
              successRate: pattern.successRate
            });
          }
        }
      }

      // Sort by similarity
      matches.sort((a, b) => b.similarity - a.similarity);

      return {
        success: true,
        data: {
          matches,
          bestMatch: matches[0] || null,
          totalPatterns: this.historicalPatterns.size
        },
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          matchCount: matches.length,
          bestSimilarity: matches[0]?.similarity || 0
        }
      };
    } catch (error) {
      this.logError('Pattern matching failed', error);
      throw error;
    }
  }

  /**
   * Calculate similarity between current page and historical pattern
   */
  private async calculateSimilarity(pageData: any, pattern: HistoricalPattern): Promise<number> {
    // Simple similarity calculation based on selectors and content
    let score = 0;
    const checks = [];

    // Check if strategy selectors exist in current page
    const html = pageData.html || '';
    for (const [field, selector] of Object.entries(pattern.strategy.selectors)) {
      const exists = html.includes(selector.split(',')[0].trim());
      checks.push(exists ? 1 : 0);
    }

    score = checks.reduce((sum, check) => sum + check, 0) / checks.length;
    return score;
  }

  /**
   * Analyze content using AI
   */
  private async analyzeContent(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { content, context = 'vehicle_listing' } = job.payload;
    
    try {
      const prompt = `
        Analyze this content for ${context}:
        
        ${content.substring(0, 4000)}
        
        Extract and structure the information. Identify:
        1. Key data points
        2. Quality indicators
        3. Missing information
        4. Potential issues
        
        Provide a structured analysis.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysis = response.text();

      return {
        success: true,
        data: {
          analysis,
          context,
          contentLength: content.length,
          processingTime: Date.now() - startTime
        },
        executionTime: Date.now() - startTime,
        agentId: this.agentId
      };
    } catch (error) {
      this.logError('Content analysis failed', error);
      throw error;
    }
  }

  /**
   * Perform visual analysis on screenshots
   */
  private async performVisualAnalysis(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    
    // TODO: Implement visual analysis using Google's Vision AI
    // This would analyze screenshots to understand layout and visual elements
    
    return {
      success: false,
      data: null,
      error: 'Visual analysis not implemented yet',
      executionTime: Date.now() - startTime,
      agentId: this.agentId,
      warnings: ['Visual analysis requires Vision AI integration']
    };
  }

  /**
   * Learn from successful/failed extraction data
   */
  private async learnFromData(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { extractionResult, strategy, url, success } = job.payload;
    
    try {
      if (!this.analyzerConfig.learningEnabled) {
        return {
          success: true,
          data: { message: 'Learning disabled' },
          executionTime: Date.now() - startTime,
          agentId: this.agentId
        };
      }

      const domain = new URL(url).hostname;
      const pageType = this.inferPageType(extractionResult);
      const key = `${domain}_${pageType}`;
      
      let pattern = this.historicalPatterns.get(key);
      
      if (pattern) {
        // Update existing pattern
        pattern.usage++;
        pattern.lastUsed = new Date();
        
        if (success) {
          pattern.successRate = (pattern.successRate * (pattern.usage - 1) + 1) / pattern.usage;
        } else {
          pattern.successRate = (pattern.successRate * (pattern.usage - 1) + 0) / pattern.usage;
        }
      } else if (success) {
        // Create new pattern from successful extraction
        pattern = {
          sitePattern: key,
          domain,
          pageType,
          successRate: 1.0,
          lastUsed: new Date(),
          usage: 1,
          strategy
        };
        this.historicalPatterns.set(key, pattern);
      }

      // Persist updated patterns
      await this.storeMemory('historical_patterns', Array.from(this.historicalPatterns.values()));

      return {
        success: true,
        data: {
          pattern: key,
          successRate: pattern?.successRate || 0,
          usage: pattern?.usage || 0,
          learned: true
        },
        executionTime: Date.now() - startTime,
        agentId: this.agentId
      };
    } catch (error) {
      this.logError('Learning from data failed', error);
      throw error;
    }
  }

  /**
   * Infer page type from extraction result
   */
  private inferPageType(extractionResult: any): string {
    if (extractionResult.items && extractionResult.items.length > 1) {
      return 'listing';
    } else if (extractionResult.title && extractionResult.price) {
      return 'detail';
    } else if (extractionResult.searchForm) {
      return 'search';
    }
    return 'unknown';
  }

  /**
   * Calculate analysis confidence
   */
  private calculateAnalysisConfidence(
    semanticStructure: SemanticStructure,
    contentPatterns: ContentPattern[],
    extractionStrategy: ExtractionStrategy
  ): number {
    let confidence = 0;

    // Page type confidence
    if (semanticStructure.pageType !== 'unknown') {
      confidence += 0.25;
    }

    // Pattern confidence
    const avgPatternConfidence = contentPatterns.length > 0
      ? contentPatterns.reduce((sum, p) => sum + p.confidence, 0) / contentPatterns.length
      : 0;
    confidence += avgPatternConfidence * 0.35;

    // Strategy confidence
    confidence += extractionStrategy.estimatedSuccessRate * 0.4;

    return Math.min(confidence, 1.0);
  }

  /**
   * Utility methods
   */
  private hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
  }

  private isCacheValid(cached: any): boolean {
    const now = Date.now();
    const age = now - cached.metadata.analysisTime;
    return age < 3600000; // 1 hour
  }

  private countElements(pageData: any): number {
    const html = pageData.html || '';
    const matches = html.match(/<[^>]+>/g);
    return matches ? matches.length : 0;
  }

  private assessComplexity(pageData: any): 'low' | 'medium' | 'high' {
    const elementCount = this.countElements(pageData);
    const htmlSize = (pageData.html || '').length;
    
    if (elementCount < 100 && htmlSize < 50000) return 'low';
    if (elementCount < 500 && htmlSize < 200000) return 'medium';
    return 'high';
  }
}

export default AnalyzerAgent;