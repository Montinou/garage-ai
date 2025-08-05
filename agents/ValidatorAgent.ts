/**
 * ValidatorAgent - Quality assurance and validation specialist
 * 
 * Responsibilities:
 * - Multi-level validation (structural, semantic, business rules)
 * - Anomaly detection using ML techniques
 * - Auto-correction capabilities
 * - Quality scoring and reporting
 * - Data consistency checks
 * - Historical data comparison
 */

import { BaseAgent } from './base/BaseAgent';
import { 
  AgentJob, 
  AgentResult, 
  AgentConfig 
} from './types/AgentTypes';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../lib/config';
import { VehicleData } from '../scrapers/base-scraper';

interface ValidatorConfig extends AgentConfig {
  enableAIValidation: boolean;
  enableAutoCorrection: boolean;
  anomalyDetectionEnabled: boolean;
  qualityThreshold: number;
  businessRulesEnabled: boolean;
  historicalComparisonEnabled: boolean;
  strictValidation: boolean;
}

interface ValidationResult {
  isValid: boolean;
  qualityScore: number;
  issues: ValidationIssue[];
  corrections: AutoCorrection[];
  anomalies: Anomaly[];
  businessRuleViolations: BusinessRuleViolation[];
  recommendations: Recommendation[];
  metadata: ValidationMetadata;
}

interface ValidationIssue {
  type: 'missing_required' | 'invalid_format' | 'out_of_range' | 'suspicious_value' | 'inconsistent_data' | 'duplicate_entry';
  field: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  currentValue?: any;
  expectedFormat?: string;
  suggestion?: string;
  confidence: number;
}

interface AutoCorrection {
  field: string;
  originalValue: any;
  correctedValue: any;
  correctionType: 'format_fix' | 'data_enhancement' | 'anomaly_fix' | 'business_rule_fix';
  confidence: number;
  applied: boolean;
  reason: string;
}

interface Anomaly {
  type: 'price_anomaly' | 'year_anomaly' | 'mileage_anomaly' | 'data_pattern_anomaly';
  field: string;
  value: any;
  expectedRange?: [number, number];
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

interface BusinessRuleViolation {
  rule: string;
  description: string;
  severity: 'warning' | 'error';
  affectedFields: string[];
  recommendation: string;
}

interface Recommendation {
  type: 'data_quality' | 'completeness' | 'accuracy' | 'consistency';
  priority: 'low' | 'medium' | 'high';
  description: string;
  action: string;
  impact: string;
}

interface ValidationMetadata {
  validatedAt: Date;
  validatorVersion: string;
  rulesApplied: string[];
  processingTime: number;
  itemsValidated: number;
  aiModelUsed?: string;
}

interface HistoricalStats {
  averagePrice: number;
  priceRange: [number, number];
  commonYearRange: [number, number];
  averageMileage: number;
  mileageRange: [number, number];
  commonBrands: string[];
  dataQualityTrends: Record<string, number>;
}

interface BusinessRule {
  id: string;
  name: string;
  description: string;
  condition: (data: VehicleData) => boolean;
  severity: 'warning' | 'error';
  message: string;
  autoFix?: (data: VehicleData) => VehicleData;
}

export class ValidatorAgent extends BaseAgent {
  private readonly validatorConfig: ValidatorConfig;
  private genAI: GoogleGenerativeAI;
  private model: any;
  private businessRules: Map<string, BusinessRule>;
  private historicalStats: HistoricalStats | null = null;
  private validationPatterns: Map<string, RegExp>;

  constructor(config: AgentConfig = {}) {
    super('validator', config);
    
    this.validatorConfig = {
      enableAIValidation: true,
      enableAutoCorrection: true,
      anomalyDetectionEnabled: true,
      qualityThreshold: 0.8,
      businessRulesEnabled: true,
      historicalComparisonEnabled: true,
      strictValidation: false,
      ...config
    };

    this.businessRules = new Map();
    this.validationPatterns = new Map();

    // Initialize Google AI
    const googleAIConfig = config.getGoogleAIConfig();
    this.genAI = new GoogleGenerativeAI(googleAIConfig.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    this.initializeBusinessRules();
    this.initializeValidationPatterns();
  }

  protected async onInitialize(): Promise<void> {
    await this.loadHistoricalStats();
    this.log('ValidatorAgent initialized successfully');
  }

  /**
   * Initialize business rules for vehicle data
   */
  private initializeBusinessRules(): void {
    const rules: BusinessRule[] = [
      {
        id: 'price_range',
        name: 'Price Range Validation',
        description: 'Vehicle price should be within reasonable range',
        condition: (data) => data.price > 0 && data.price < 10000000,
        severity: 'error',
        message: 'Price is outside reasonable range (0 - 10,000,000)',
        autoFix: (data) => {
          if (data.price > 10000000) data.price = Math.floor(data.price / 100); // Remove extra digits
          if (data.price < 0) data.price = Math.abs(data.price);
          return data;
        }
      },
      {
        id: 'year_range',
        name: 'Year Range Validation',
        description: 'Vehicle year should be within valid range',
        condition: (data) => !data.year || (data.year >= 1900 && data.year <= new Date().getFullYear() + 1),
        severity: 'error',
        message: 'Year is outside valid range (1900 - current year + 1)'
      },
      {
        id: 'mileage_reasonable',
        name: 'Mileage Reasonableness',
        description: 'Mileage should be reasonable for vehicle age',
        condition: (data) => {
          if (!data.mileage || !data.year) return true;
          const age = new Date().getFullYear() - data.year;
          const maxReasonableMileage = age * 30000; // 30k km/year max
          return data.mileage <= maxReasonableMileage;
        },
        severity: 'warning',
        message: 'Mileage seems high for vehicle age'
      },
      {
        id: 'required_fields',
        name: 'Required Fields Validation',
        description: 'Essential fields must be present',
        condition: (data) => !!(data.title && data.price),
        severity: 'error',
        message: 'Missing required fields: title or price'
      },
      {
        id: 'brand_model_consistency',
        name: 'Brand Model Consistency',
        description: 'Brand should match the model',
        condition: (data) => {
          if (!data.brand || !data.model) return true;
          const brandLower = data.brand.toLowerCase();
          const titleLower = (data.title || '').toLowerCase();
          return titleLower.includes(brandLower);
        },
        severity: 'warning',
        message: 'Brand and title may be inconsistent'
      },
      {
        id: 'currency_price_consistency',
        name: 'Currency Price Consistency',
        description: 'Currency should match price format',
        condition: (data) => {
          if (!data.currency || !data.price) return true;
          // Basic check - could be more sophisticated
          if (data.currency === 'USD' && data.price < 1000) return false;
          if (data.currency === 'EUR' && data.price < 1000) return false;
          return true;
        },
        severity: 'warning',
        message: 'Currency and price may be inconsistent'
      }
    ];

    for (const rule of rules) {
      this.businessRules.set(rule.id, rule);
    }

    this.log(`Initialized ${rules.length} business rules`);
  }

  /**
   * Initialize validation patterns
   */
  private initializeValidationPatterns(): void {
    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[\+]?[\d\s\-\(\)]{7,15}$/,
      url: /^https?:\/\/.+/,
      vin: /^[A-HJ-NPR-Z0-9]{17}$/,
      licensePlate: /^[A-Z0-9\-\s]{2,10}$/i,
      year: /^(19|20)\d{2}$/,
      price: /^\d+(\.\d{2})?$/
    };

    for (const [name, pattern] of Object.entries(patterns)) {
      this.validationPatterns.set(name, pattern);
    }

    this.log(`Initialized ${Object.keys(patterns).length} validation patterns`);
  }

  /**
   * Load historical statistics for comparison
   */
  private async loadHistoricalStats(): Promise<void> {
    try {
      const stats = await this.getMemory('historical_validation_stats');
      if (stats) {
        this.historicalStats = stats;
        this.log('Loaded historical validation statistics');
      } else {
        // Initialize with default stats
        this.historicalStats = {
          averagePrice: 25000,
          priceRange: [1000, 100000],
          commonYearRange: [2010, new Date().getFullYear()],
          averageMileage: 80000,
          mileageRange: [0, 300000],
          commonBrands: ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan'],
          dataQualityTrends: {}
        };
      }
    } catch (error) {
      this.logError('Failed to load historical stats', error);
    }
  }

  /**
   * Main execution method for validation jobs
   */
  async execute(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    
    try {
      this.log(`Executing validation job ${job.id}`, { 
        type: job.type, 
        priority: job.priority 
      });

      switch (job.type) {
        case 'validate_data':
          return await this.validateData(job);
        case 'validate_single_item':
          return await this.validateSingleItem(job);
        case 'detect_anomalies':
          return await this.detectAnomalies(job);
        case 'auto_correct':
          return await this.autoCorrectData(job);
        case 'quality_assessment':
          return await this.performQualityAssessment(job);
        case 'business_rules_check':
          return await this.checkBusinessRules(job);
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (error) {
      this.logError(`Validation job ${job.id} failed`, error);
      
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
   * Validate array of vehicle data
   */
  private async validateData(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { data, options = {} } = job.payload;
    
    try {
      const results: ValidationResult[] = [];
      
      for (const item of data) {
        const validation = await this.validateSingleVehicle(item, options);
        results.push(validation);
      }

      // Calculate overall statistics
      const overallStats = this.calculateOverallStats(results);
      
      // Update historical stats if enabled
      if (this.validatorConfig.historicalComparisonEnabled) {
        await this.updateHistoricalStats(data, results);
      }

      return {
        success: overallStats.averageQuality >= this.validatorConfig.qualityThreshold,
        data: {
          results,
          overallStats,
          summary: {
            totalItems: results.length,
            validItems: results.filter(r => r.isValid).length,
            averageQuality: overallStats.averageQuality,
            totalIssues: overallStats.totalIssues,
            correctionsApplied: overallStats.correctionsApplied
          }
        },
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          validationApproach: 'comprehensive',
          rulesApplied: Array.from(this.businessRules.keys()),
          aiValidationUsed: this.validatorConfig.enableAIValidation
        }
      };
    } catch (error) {
      this.logError('Data validation failed', error);
      throw error;
    }
  }

  /**
   * Validate single item
   */
  private async validateSingleItem(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { item, options = {} } = job.payload;
    
    try {
      const validation = await this.validateSingleVehicle(item, options);
      
      return {
        success: validation.isValid,
        data: validation,
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          qualityScore: validation.qualityScore,
          issuesFound: validation.issues.length,
          correctionsApplied: validation.corrections.filter(c => c.applied).length
        }
      };
    } catch (error) {
      this.logError('Single item validation failed', error);
      throw error;
    }
  }

  /**
   * Validate a single vehicle item
   */
  private async validateSingleVehicle(
    data: VehicleData, 
    options: any = {}
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    
    const issues: ValidationIssue[] = [];
    const corrections: AutoCorrection[] = [];
    const anomalies: Anomaly[] = [];
    const businessRuleViolations: BusinessRuleViolation[] = [];
    const recommendations: Recommendation[] = [];

    // 1. Structural validation
    await this.performStructuralValidation(data, issues);

    // 2. Format validation
    await this.performFormatValidation(data, issues);

    // 3. Business rules validation
    if (this.validatorConfig.businessRulesEnabled) {
      await this.performBusinessRulesValidation(data, businessRuleViolations, corrections);
    }

    // 4. Anomaly detection
    if (this.validatorConfig.anomalyDetectionEnabled) {
      await this.performAnomalyDetection(data, anomalies);
    }

    // 5. AI-powered validation
    if (this.validatorConfig.enableAIValidation) {
      await this.performAIValidation(data, issues, recommendations);
    }

    // 6. Auto-correction
    let correctedData = data;
    if (this.validatorConfig.enableAutoCorrection) {
      correctedData = await this.applyAutoCorrections(data, corrections);
    }

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(data, issues, businessRuleViolations, anomalies);

    return {
      isValid: qualityScore >= this.validatorConfig.qualityThreshold && businessRuleViolations.filter(v => v.severity === 'error').length === 0,
      qualityScore,
      issues,
      corrections,
      anomalies,
      businessRuleViolations,
      recommendations,
      metadata: {
        validatedAt: new Date(),
        validatorVersion: '1.0.0',
        rulesApplied: Array.from(this.businessRules.keys()),
        processingTime: Date.now() - startTime,
        itemsValidated: 1,
        aiModelUsed: this.validatorConfig.enableAIValidation ? 'gemini-1.5-flash' : undefined
      }
    };
  }

  /**
   * Perform structural validation
   */
  private async performStructuralValidation(data: VehicleData, issues: ValidationIssue[]): Promise<void> {
    const requiredFields = ['title', 'price', 'sourceUrl', 'sourcePortal'];
    const recommendedFields = ['description', 'year', 'mileage', 'imageUrls'];

    // Check required fields
    for (const field of requiredFields) {
      const value = (data as any)[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        issues.push({
          type: 'missing_required',
          field,
          severity: 'critical',
          description: `Required field '${field}' is missing or empty`,
          confidence: 1.0,
          suggestion: `Provide a valid value for ${field}`
        });
      }
    }

    // Check recommended fields
    for (const field of recommendedFields) {
      const value = (data as any)[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        issues.push({
          type: 'missing_required',
          field,
          severity: 'low',
          description: `Recommended field '${field}' is missing`,
          confidence: 0.8,
          suggestion: `Consider providing ${field} for better data quality`
        });
      }
    }

    // Check data types
    if (data.price && typeof data.price !== 'number') {
      issues.push({
        type: 'invalid_format',
        field: 'price',
        severity: 'high',
        description: 'Price should be a number',
        currentValue: data.price,
        expectedFormat: 'number',
        confidence: 1.0
      });
    }

    if (data.year && typeof data.year !== 'number') {
      issues.push({
        type: 'invalid_format',
        field: 'year',
        severity: 'medium',
        description: 'Year should be a number',
        currentValue: data.year,
        expectedFormat: 'number',
        confidence: 1.0
      });
    }

    if (data.imageUrls && !Array.isArray(data.imageUrls)) {
      issues.push({
        type: 'invalid_format',
        field: 'imageUrls',
        severity: 'medium',
        description: 'Image URLs should be an array',
        currentValue: typeof data.imageUrls,
        expectedFormat: 'array',
        confidence: 1.0
      });
    }
  }

  /**
   * Perform format validation
   */
  private async performFormatValidation(data: VehicleData, issues: ValidationIssue[]): Promise<void> {
    // Email validation
    if (data.sellerEmail && !this.validationPatterns.get('email')?.test(data.sellerEmail)) {
      issues.push({
        type: 'invalid_format',
        field: 'sellerEmail',
        severity: 'medium',
        description: 'Invalid email format',
        currentValue: data.sellerEmail,
        expectedFormat: 'email@domain.com',
        confidence: 0.9
      });
    }

    // Phone validation
    if (data.sellerPhone && !this.validationPatterns.get('phone')?.test(data.sellerPhone)) {
      issues.push({
        type: 'invalid_format',
        field: 'sellerPhone',
        severity: 'medium',
        description: 'Invalid phone number format',
        currentValue: data.sellerPhone,
        expectedFormat: 'Valid phone number',
        confidence: 0.8
      });
    }

    // URL validation
    if (data.sourceUrl && !this.validationPatterns.get('url')?.test(data.sourceUrl)) {
      issues.push({
        type: 'invalid_format',
        field: 'sourceUrl',
        severity: 'high',
        description: 'Invalid URL format',
        currentValue: data.sourceUrl,
        expectedFormat: 'http://... or https://...',
        confidence: 0.95
      });
    }

    // VIN validation
    if (data.vin && !this.validationPatterns.get('vin')?.test(data.vin)) {
      issues.push({
        type: 'invalid_format', 
        field: 'vin',
        severity: 'medium',
        description: 'Invalid VIN format',
        currentValue: data.vin,
        expectedFormat: '17 character alphanumeric code',
        confidence: 0.9
      });
    }

    // Image URL validation
    if (data.imageUrls) {
      const urlPattern = this.validationPatterns.get('url');
      for (let i = 0; i < data.imageUrls.length; i++) {
        if (!urlPattern?.test(data.imageUrls[i])) {
          issues.push({
            type: 'invalid_format',
            field: `imageUrls[${i}]`,
            severity: 'low',
            description: 'Invalid image URL format',
            currentValue: data.imageUrls[i],
            expectedFormat: 'Valid URL',
            confidence: 0.8
          });
        }
      }
    }
  }

  /**
   * Perform business rules validation
   */
  private async performBusinessRulesValidation(
    data: VehicleData, 
    violations: BusinessRuleViolation[], 
    corrections: AutoCorrection[]
  ): Promise<void> {
    for (const [ruleId, rule] of this.businessRules) {
      try {
        if (!rule.condition(data)) {
          violations.push({
            rule: ruleId,
            description: rule.description,
            severity: rule.severity,
            affectedFields: this.getAffectedFields(rule),
            recommendation: rule.message
          });

          // Apply auto-fix if available
          if (rule.autoFix && this.validatorConfig.enableAutoCorrection) {
            const originalData = { ...data };
            const fixedData = rule.autoFix(data);
            
            // Check what changed
            for (const [field, value] of Object.entries(fixedData)) {
              if ((originalData as any)[field] !== value) {
                corrections.push({
                  field,
                  originalValue: (originalData as any)[field],
                  correctedValue: value,
                  correctionType: 'business_rule_fix',
                  confidence: 0.8,
                  applied: false,
                  reason: `Applied auto-fix for rule: ${rule.name}`
                });
              }
            }
          }
        }
      } catch (error) {
        this.logError(`Business rule ${ruleId} validation failed`, error);
      }
    }
  }

  /**
   * Perform anomaly detection
   */
  private async performAnomalyDetection(data: VehicleData, anomalies: Anomaly[]): Promise<void> {
    if (!this.historicalStats) return;

    // Price anomaly detection
    if (data.price) {
      const priceDeviation = this.calculateDeviation(data.price, this.historicalStats.averagePrice);
      if (priceDeviation > 2) { // More than 2 standard deviations
        anomalies.push({
          type: 'price_anomaly',
          field: 'price',
          value: data.price,
          expectedRange: this.historicalStats.priceRange,
          deviation: priceDeviation,
          severity: priceDeviation > 3 ? 'high' : 'medium',
          description: `Price ${data.price} is significantly different from average ${this.historicalStats.averagePrice}`
        });
      }
    }

    // Year anomaly detection
    if (data.year) {
      const [minYear, maxYear] = this.historicalStats.commonYearRange;
      if (data.year < minYear || data.year > maxYear) {
        anomalies.push({
          type: 'year_anomaly',
          field: 'year',
          value: data.year,
          expectedRange: this.historicalStats.commonYearRange,
          deviation: Math.min(Math.abs(data.year - minYear), Math.abs(data.year - maxYear)),
          severity: 'medium',
          description: `Year ${data.year} is outside common range ${minYear}-${maxYear}`
        });
      }
    }

    // Mileage anomaly detection
    if (data.mileage) {
      const mileageDeviation = this.calculateDeviation(data.mileage, this.historicalStats.averageMileage);
      if (mileageDeviation > 2) {
        anomalies.push({
          type: 'mileage_anomaly',
          field: 'mileage',
          value: data.mileage,
          expectedRange: this.historicalStats.mileageRange,
          deviation: mileageDeviation,
          severity: mileageDeviation > 3 ? 'high' : 'medium',
          description: `Mileage ${data.mileage} is significantly different from average ${this.historicalStats.averageMileage}`
        });
      }
    }
  }

  /**
   * Perform AI-powered validation
   */
  private async performAIValidation(
    data: VehicleData, 
    issues: ValidationIssue[], 
    recommendations: Recommendation[]
  ): Promise<void> {
    try {
      const prompt = `
        Validate this vehicle data for quality and consistency:
        
        Title: ${data.title}
        Description: ${data.description}
        Price: ${data.price} ${data.currency}
        Year: ${data.year}
        Mileage: ${data.mileage}
        Brand: ${data.brand}
        Model: ${data.model}
        
        Check for:
        1. Data consistency and logical relationships
        2. Suspicious or unrealistic values
        3. Missing important information
        4. Quality improvements suggestions
        
        Respond with a JSON object containing:
        - issues: array of issues found
        - recommendations: array of improvement suggestions
        - overallAssessment: brief quality assessment
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse AI response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiValidation = JSON.parse(jsonMatch[0]);
          
          // Add AI-detected issues
          if (aiValidation.issues && Array.isArray(aiValidation.issues)) {
            for (const issue of aiValidation.issues) {
              issues.push({
                type: 'suspicious_value',
                field: issue.field || 'unknown',
                severity: issue.severity || 'medium',
                description: issue.description || 'AI detected potential issue',
                confidence: 0.7,
                suggestion: issue.suggestion
              });
            }
          }

          // Add AI recommendations
          if (aiValidation.recommendations && Array.isArray(aiValidation.recommendations)) {
            for (const rec of aiValidation.recommendations) {
              recommendations.push({
                type: 'data_quality',
                priority: rec.priority || 'medium',
                description: rec.description || 'AI recommendation',
                action: rec.action || 'Review data',
                impact: rec.impact || 'Improved data quality'
              });
            }
          }
        }
      } catch (parseError) {
        this.logError('Failed to parse AI validation response', parseError);
      }
    } catch (error) {
      this.logError('AI validation failed', error);
    }
  }

  /**
   * Apply auto-corrections
   */
  private async applyAutoCorrections(data: VehicleData, corrections: AutoCorrection[]): Promise<VehicleData> {
    let correctedData = { ...data };
    
    for (const correction of corrections) {
      if (correction.confidence >= 0.8) { // Only apply high-confidence corrections
        try {
          (correctedData as any)[correction.field] = correction.correctedValue;
          correction.applied = true;
          this.log(`Applied correction to ${correction.field}`, {
            original: correction.originalValue,
            corrected: correction.correctedValue,
            reason: correction.reason
          });
        } catch (error) {
          this.logError(`Failed to apply correction to ${correction.field}`, error);
          correction.applied = false;
        }
      }
    }
    
    return correctedData;
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(
    data: VehicleData, 
    issues: ValidationIssue[], 
    violations: BusinessRuleViolation[], 
    anomalies: Anomaly[]
  ): number {
    let score = 1.0;
    
    // Deduct for issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 0.3;
          break;
        case 'high':
          score -= 0.2;
          break;
        case 'medium':
          score -= 0.1;
          break;
        case 'low':
          score -= 0.05;
          break;
      }
    }
    
    // Deduct for business rule violations
    for (const violation of violations) {
      if (violation.severity === 'error') {
        score -= 0.25;
      } else {
        score -= 0.1;
      }
    }
    
    // Deduct for anomalies
    for (const anomaly of anomalies) {
      switch (anomaly.severity) {
        case 'high':
          score -= 0.15;
          break;
        case 'medium':
          score -= 0.1;
          break;
        case 'low':
          score -= 0.05;
          break;
      }
    }
    
    // Bonus for completeness
    const requiredFields = ['title', 'price', 'year', 'mileage', 'description'];
    const completedFields = requiredFields.filter(field => (data as any)[field]).length;
    const completenessBonus = (completedFields / requiredFields.length) * 0.2;
    score += completenessBonus;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Detect anomalies in data
   */
  private async detectAnomalies(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { data } = job.payload;
    
    try {
      const allAnomalies: Anomaly[] = [];
      
      for (const item of data) {
        const itemAnomalies: Anomaly[] = [];
        await this.performAnomalyDetection(item, itemAnomalies);
        allAnomalies.push(...itemAnomalies);
      }
      
      // Group anomalies by type
      const anomaliesByType = this.groupAnomaliesByType(allAnomalies);
      
      return {
        success: true,
        data: {
          totalAnomalies: allAnomalies.length,
          anomaliesByType,
          allAnomalies,
          severity: this.classifyAnomalySeverity(allAnomalies)
        },
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          itemsAnalyzed: data.length,
          anomalyRate: allAnomalies.length / data.length
        }
      };
    } catch (error) {
      this.logError('Anomaly detection failed', error);
      throw error;
    }
  }

  /**
   * Auto-correct data issues
   */
  private async autoCorrectData(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { data, options = {} } = job.payload;
    
    try {
      const correctedData: VehicleData[] = [];
      const allCorrections: AutoCorrection[] = [];
      
      for (const item of data) {
        const corrections: AutoCorrection[] = [];
        
        // Apply business rule fixes
        if (this.validatorConfig.businessRulesEnabled) {
          const violations: BusinessRuleViolation[] = [];
          await this.performBusinessRulesValidation(item, violations, corrections);
        }
        
        // Apply corrections
        const corrected = await this.applyAutoCorrections(item, corrections);
        correctedData.push(corrected);
        allCorrections.push(...corrections);
      }
      
      return {
        success: true,
        data: {
          originalData: data,
          correctedData,
          corrections: allCorrections,
          correctionsSummary: {
            total: allCorrections.length,
            applied: allCorrections.filter(c => c.applied).length,
            byType: this.groupCorrectionsByType(allCorrections)
          }
        },
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          itemsProcessed: data.length,
          correctionsApplied: allCorrections.filter(c => c.applied).length
        }
      };
    } catch (error) {
      this.logError('Auto-correction failed', error);
      throw error;
    }
  }

  /**
   * Perform quality assessment
   */
  private async performQualityAssessment(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { data } = job.payload;
    
    try {
      const assessments = [];
      let totalScore = 0;
      
      for (const item of data) {
        const validation = await this.validateSingleVehicle(item);
        assessments.push({
          item,
          validation,
          qualityScore: validation.qualityScore
        });
        totalScore += validation.qualityScore;
      }
      
      const averageQuality = totalScore / data.length;
      const qualityDistribution = this.calculateQualityDistribution(assessments);
      
      return {
        success: averageQuality >= this.validatorConfig.qualityThreshold,
        data: {
          averageQuality,
          qualityDistribution,
          assessments,
          recommendations: this.generateQualityRecommendations(assessments)
        },
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          itemsAssessed: data.length,
          highQualityItems: assessments.filter(a => a.qualityScore >= 0.8).length
        }
      };
    } catch (error) {
      this.logError('Quality assessment failed', error);
      throw error;
    }
  }

  /**
   * Check business rules
   */
  private async checkBusinessRules(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { data } = job.payload;
    
    try {
      const allViolations: BusinessRuleViolation[] = [];
      
      for (const item of data) {
        const violations: BusinessRuleViolation[] = [];
        const corrections: AutoCorrection[] = [];
        await this.performBusinessRulesValidation(item, violations, corrections);
        allViolations.push(...violations);
      }
      
      const violationsByRule = this.groupViolationsByRule(allViolations);
      
      return {
        success: allViolations.filter(v => v.severity === 'error').length === 0,
        data: {
          violations: allViolations,
          violationsByRule,
          summary: {
            totalViolations: allViolations.length,
            errors: allViolations.filter(v => v.severity === 'error').length,
            warnings: allViolations.filter(v => v.severity === 'warning').length
          }
        },
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        metadata: {
          itemsChecked: data.length,
          rulesApplied: Array.from(this.businessRules.keys())
        }
      };
    } catch (error) {
      this.logError('Business rules check failed', error);
      throw error;
    }
  }

  /**
   * Utility methods
   */
  private calculateDeviation(value: number, average: number): number {
    return Math.abs(value - average) / average;
  }

  private getAffectedFields(rule: BusinessRule): string[] {
    // Simple heuristic - could be more sophisticated
    const ruleString = rule.condition.toString();
    const fields = ['title', 'price', 'year', 'mileage', 'brand', 'model', 'currency'];
    return fields.filter(field => ruleString.includes(field));
  }

  private calculateOverallStats(results: ValidationResult[]): any {
    const totalQuality = results.reduce((sum, r) => sum + r.qualityScore, 0);
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const totalCorrections = results.reduce((sum, r) => sum + r.corrections.filter(c => c.applied).length, 0);
    
    return {
      averageQuality: totalQuality / results.length,
      totalIssues,
      correctionsApplied: totalCorrections,
      validationRate: results.filter(r => r.isValid).length / results.length
    };
  }

  private async updateHistoricalStats(data: VehicleData[], results: ValidationResult[]): Promise<void> {
    // Update historical statistics with new data
    const prices = data.filter(d => d.price).map(d => d.price);
    const years = data.filter(d => d.year).map(d => d.year);
    const mileages = data.filter(d => d.mileage).map(d => d.mileage);
    
    if (this.historicalStats && prices.length > 0) {
      this.historicalStats.averagePrice = (this.historicalStats.averagePrice + (prices.reduce((a, b) => a + b, 0) / prices.length)) / 2;
      this.historicalStats.priceRange = [
        Math.min(this.historicalStats.priceRange[0], Math.min(...prices)),
        Math.max(this.historicalStats.priceRange[1], Math.max(...prices))
      ];
    }
    
    // Store updated stats
    await this.storeMemory('historical_validation_stats', this.historicalStats);
  }

  private groupAnomaliesByType(anomalies: Anomaly[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const anomaly of anomalies) {
      grouped[anomaly.type] = (grouped[anomaly.type] || 0) + 1;
    }
    return grouped;
  }

  private classifyAnomalySeverity(anomalies: Anomaly[]): 'low' | 'medium' | 'high' {
    const highSeverity = anomalies.filter(a => a.severity === 'high').length;
    const mediumSeverity = anomalies.filter(a => a.severity === 'medium').length;
    
    if (highSeverity > 0) return 'high';
    if (mediumSeverity > 0) return 'medium';
    return 'low';
  }

  private groupCorrectionsByType(corrections: AutoCorrection[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const correction of corrections) {
      grouped[correction.correctionType] = (grouped[correction.correctionType] || 0) + 1;
    }
    return grouped;
  }

  private calculateQualityDistribution(assessments: any[]): Record<string, number> {
    const distribution = { high: 0, medium: 0, low: 0 };
    
    for (const assessment of assessments) {
      if (assessment.qualityScore >= 0.8) {
        distribution.high++;
      } else if (assessment.qualityScore >= 0.6) {
        distribution.medium++;
      } else {
        distribution.low++;
      }
    }
    
    return distribution;
  }

  private generateQualityRecommendations(assessments: any[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Analyze common issues
    const commonIssues: Record<string, number> = {};
    for (const assessment of assessments) {
      for (const issue of assessment.validation.issues) {
        commonIssues[issue.type] = (commonIssues[issue.type] || 0) + 1;
      }
    }
    
    // Generate recommendations based on common issues
    for (const [issueType, count] of Object.entries(commonIssues)) {
      if (count > assessments.length * 0.3) { // More than 30% of items have this issue
        recommendations.push({
          type: 'data_quality',
          priority: 'high',
          description: `${issueType} is common across ${count} items`,
          action: `Review and fix ${issueType} issues in data extraction`,
          impact: 'Significant improvement in data quality'
        });
      }
    }
    
    return recommendations;
  }

  private groupViolationsByRule(violations: BusinessRuleViolation[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const violation of violations) {
      grouped[violation.rule] = (grouped[violation.rule] || 0) + 1;
    }
    return grouped;
  }
}

export default ValidatorAgent;