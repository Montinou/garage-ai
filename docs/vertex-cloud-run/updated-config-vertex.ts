// lib/config.ts - Updated with Vertex AI support
/**
 * Configuration module for environment variables and system settings
 * Validates and manages all required environment variables for the AI agents system
 */

import { get } from '@vercel/edge-config';

// Environment variable validation interface
export interface EnvironmentConfig {
  // Vercel services
  BLOB_READ_WRITE_TOKEN: string;
  EDGE_CONFIG: string;
  VERCEL_OIDC_TOKEN: string;
  
  // AI services - Updated for Vertex AI
  GOOGLE_AI_API_KEY: string; // Keep for backward compatibility
  GCP_PROJECT_ID: string;
  GCP_LOCATION: string;
  GCP_SERVICE_ACCOUNT_KEY?: string;
  GOOGLE_APPLICATION_CREDENTIALS?: string;
  
  // Vertex AI specific
  VERTEX_AI_ENDPOINT?: string;
  VERTEX_AI_MODEL: string;
  VERTEX_AI_MAX_TOKENS: string;
  VERTEX_AI_TEMPERATURE: string;
  VERTEX_AI_TOP_P?: string;
  VERTEX_AI_TOP_K?: string;
  
  // Database
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  
  // Application settings
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_APP_URL?: string;
  PORT?: string; // For Cloud Run
}

// Agent system configuration
export interface AgentSystemConfig {
  maxConcurrentJobs: number;
  defaultJobTimeout: number;
  maxRetries: number;
  memoryTTL: number;
  messagingPollInterval: number;
  healthCheckInterval: number;
  enableLogging: boolean;
  enableMetrics: boolean;
  cleanupInterval: number;
  // New AI-specific configs
  aiProvider: 'vertex-ai' | 'google-ai' | 'openai';
  aiModelConfig: {
    maxTokens: number;
    temperature: number;
    topP: number;
    topK?: number;
  };
}

// Default agent system configuration
const DEFAULT_AGENT_CONFIG: AgentSystemConfig = {
  maxConcurrentJobs: 10,
  defaultJobTimeout: 300000, // 5 minutes
  maxRetries: 3,
  memoryTTL: 3600000, // 1 hour
  messagingPollInterval: 1000, // 1 second
  healthCheckInterval: 30000, // 30 seconds
  enableLogging: true,
  enableMetrics: true,
  cleanupInterval: 3600000, // 1 hour
  aiProvider: 'vertex-ai',
  aiModelConfig: {
    maxTokens: 8192,
    temperature: 0.3,
    topP: 0.95,
    topK: 40
  }
};

class ConfigManager {
  private static instance: ConfigManager;
  private environment: EnvironmentConfig;
  private agentConfig: AgentSystemConfig;
  private isInitialized: boolean = false;

  private constructor() {
    this.environment = {} as EnvironmentConfig;
    this.agentConfig = DEFAULT_AGENT_CONFIG;
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Initialize configuration by validating environment variables
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Validate and load environment variables
      this.environment = this.validateEnvironmentVariables();
      
      // Load agent configuration from Edge Config if available
      await this.loadAgentConfiguration();
      
      // Set up Google Cloud credentials if running in Cloud Run
      this.setupGoogleCloudCredentials();
      
      this.isInitialized = true;
      console.log('Configuration initialized successfully');
    } catch (error) {
      console.error('Configuration initialization failed:', error);
      throw error;
    }
  }

  /**
   * Validate all required environment variables
   */
  private validateEnvironmentVariables(): EnvironmentConfig {
    const errors: string[] = [];
    const env = process.env;

    // Required variables
    const requiredVars = {
      BLOB_READ_WRITE_TOKEN: env.BLOB_READ_WRITE_TOKEN,
      EDGE_CONFIG: env.EDGE_CONFIG,
      GOOGLE_AI_API_KEY: env.GOOGLE_AI_API_KEY,
      VERCEL_OIDC_TOKEN: env.VERCEL_OIDC_TOKEN,
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NODE_ENV: env.NODE_ENV as 'development' | 'production' | 'test',
      // New GCP/Vertex AI requirements
      GCP_PROJECT_ID: env.GCP_PROJECT_ID,
      GCP_LOCATION: env.GCP_LOCATION || 'us-central1',
      VERTEX_AI_MODEL: env.VERTEX_AI_MODEL || 'gemini-2.0-flash-latest',
      VERTEX_AI_MAX_TOKENS: env.VERTEX_AI_MAX_TOKENS || '8192',
      VERTEX_AI_TEMPERATURE: env.VERTEX_AI_TEMPERATURE || '0.3'
    };

    // Check for missing required variables
    for (const [key, value] of Object.entries(requiredVars)) {
      if (!value && key !== 'GCP_LOCATION' && key !== 'VERTEX_AI_MODEL' && key !== 'VERTEX_AI_MAX_TOKENS' && key !== 'VERTEX_AI_TEMPERATURE') {
        errors.push(`Missing required environment variable: ${key}`);
      }
    }

    // Validate NODE_ENV
    if (requiredVars.NODE_ENV && !['development', 'production', 'test'].includes(requiredVars.NODE_ENV)) {
      errors.push('NODE_ENV must be one of: development, production, test');
    }

    // Validate URL formats
    if (requiredVars.SUPABASE_URL && !this.isValidUrl(requiredVars.SUPABASE_URL)) {
      errors.push('SUPABASE_URL must be a valid URL');
    }

    if (env.NEXT_PUBLIC_APP_URL && !this.isValidUrl(env.NEXT_PUBLIC_APP_URL)) {
      errors.push('NEXT_PUBLIC_APP_URL must be a valid URL');
    }

    // Validate token formats (basic checks)
    if (requiredVars.BLOB_READ_WRITE_TOKEN && requiredVars.BLOB_READ_WRITE_TOKEN.length < 20) {
      errors.push('BLOB_READ_WRITE_TOKEN appears to be invalid (too short)');
    }

    // Validate GCP Project ID format
    if (requiredVars.GCP_PROJECT_ID && !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(requiredVars.GCP_PROJECT_ID)) {
      errors.push('GCP_PROJECT_ID format is invalid');
    }

    // Validate numeric values
    if (requiredVars.VERTEX_AI_MAX_TOKENS && isNaN(parseInt(requiredVars.VERTEX_AI_MAX_TOKENS))) {
      errors.push('VERTEX_AI_MAX_TOKENS must be a number');
    }

    if (requiredVars.VERTEX_AI_TEMPERATURE && (isNaN(parseFloat(requiredVars.VERTEX_AI_TEMPERATURE)) || parseFloat(requiredVars.VERTEX_AI_TEMPERATURE) < 0 || parseFloat(requiredVars.VERTEX_AI_TEMPERATURE) > 1)) {
      errors.push('VERTEX_AI_TEMPERATURE must be a number between 0 and 1');
    }

    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }

    return {
      ...requiredVars,
      NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
      PORT: env.PORT || '8080',
      GCP_SERVICE_ACCOUNT_KEY: env.GCP_SERVICE_ACCOUNT_KEY,
      GOOGLE_APPLICATION_CREDENTIALS: env.GOOGLE_APPLICATION_CREDENTIALS,
      VERTEX_AI_ENDPOINT: env.VERTEX_AI_ENDPOINT,
      VERTEX_AI_TOP_P: env.VERTEX_AI_TOP_P || '0.95',
      VERTEX_AI_TOP_K: env.VERTEX_AI_TOP_K || '40'
    } as EnvironmentConfig;
  }

  /**
   * Setup Google Cloud credentials for authentication
   */
  private setupGoogleCloudCredentials(): void {
    // If running in Cloud Run, credentials are automatically provided
    if (process.env.K_SERVICE) {
      console.log('Running in Cloud Run, using metadata service for credentials');
      return;
    }

    // If service account key is provided as env var, write it to a temp file
    if (this.environment.GCP_SERVICE_ACCOUNT_KEY && !this.environment.GOOGLE_APPLICATION_CREDENTIALS) {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      const keyPath = path.join(os.tmpdir(), 'gcp-service-account-key.json');
      fs.writeFileSync(keyPath, this.environment.GCP_SERVICE_ACCOUNT_KEY);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
      
      console.log('Google Cloud credentials configured from environment variable');
    }
  }

  /**
   * Load agent configuration from Vercel Edge Config
   */
  private async loadAgentConfiguration(): Promise<void> {
    try {
      if (!this.environment.EDGE_CONFIG) {
        console.log('No Edge Config available, using default agent configuration');
        return;
      }

      // Try to load agent configuration from Edge Config
      const edgeConfig = await get('agentSystemConfig');
      
      if (edgeConfig && typeof edgeConfig === 'object') {
        this.agentConfig = {
          ...DEFAULT_AGENT_CONFIG,
          ...(edgeConfig as Partial<AgentSystemConfig>)
        };
        console.log('Loaded agent configuration from Edge Config');
      } else {
        console.log('No agent configuration found in Edge Config, using defaults');
      }
    } catch (error) {
      console.warn('Failed to load configuration from Edge Config, using defaults:', error);
      // Continue with default configuration
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get environment configuration
   */
  getEnvironment(): EnvironmentConfig {
    this.ensureInitialized();
    return { ...this.environment };
  }

  /**
   * Get agent system configuration
   */
  getAgentConfig(): AgentSystemConfig {
    this.ensureInitialized();
    return { ...this.agentConfig };
  }

  /**
   * Update agent configuration
   */
  updateAgentConfig(updates: Partial<AgentSystemConfig>): void {
    this.ensureInitialized();
    this.agentConfig = {
      ...this.agentConfig,
      ...updates
    };
  }

  /**
   * Get specific environment variable with fallback
   */
  getEnvVar(key: keyof EnvironmentConfig, fallback?: string): string {
    this.ensureInitialized();
    const value = this.environment[key];
    if (value === undefined || value === null) {
      if (fallback !== undefined) {
        return fallback;
      }
      throw new Error(`Environment variable ${key} is not set and no fallback provided`);
    }
    return value;
  }

  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return this.getEnvVar('NODE_ENV') === 'development';
  }

  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return this.getEnvVar('NODE_ENV') === 'production';
  }

  /**
   * Check if running in test mode
   */
  isTest(): boolean {
    return this.getEnvVar('NODE_ENV') === 'test';
  }

  /**
   * Check if running in Google Cloud Run
   */
  isCloudRun(): boolean {
    return !!process.env.K_SERVICE;
  }

  /**
   * Get Vercel Blob configuration
   */
  getBlobConfig(): { token: string } {
    return {
      token: this.getEnvVar('BLOB_READ_WRITE_TOKEN')
    };
  }

  /**
   * Get Google AI configuration (for backward compatibility)
   */
  getGoogleAIConfig(): { apiKey: string } {
    return {
      apiKey: this.getEnvVar('GOOGLE_AI_API_KEY')
    };
  }

  /**
   * Get Vertex AI configuration
   */
  getVertexAIConfig(): {
    projectId: string;
    location: string;
    model: string;
    maxTokens: number;
    temperature: number;
    topP: number;
    topK?: number;
    endpoint?: string;
  } {
    return {
      projectId: this.getEnvVar('GCP_PROJECT_ID'),
      location: this.getEnvVar('GCP_LOCATION', 'us-central1'),
      model: this.getEnvVar('VERTEX_AI_MODEL', 'gemini-2.0-flash-latest'),
      maxTokens: parseInt(this.getEnvVar('VERTEX_AI_MAX_TOKENS', '8192')),
      temperature: parseFloat(this.getEnvVar('VERTEX_AI_TEMPERATURE', '0.3')),
      topP: parseFloat(this.getEnvVar('VERTEX_AI_TOP_P', '0.95')),
      topK: this.environment.VERTEX_AI_TOP_K ? parseInt(this.environment.VERTEX_AI_TOP_K) : undefined,
      endpoint: this.environment.VERTEX_AI_ENDPOINT
    };
  }

  /**
   * Get Supabase configuration
   */
  getSupabaseConfig(): {
    url: string;
    serviceRoleKey: string;
    anonKey: string;
  } {
    return {
      url: this.getEnvVar('SUPABASE_URL'),
      serviceRoleKey: this.getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
      anonKey: this.getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    };
  }

  /**
   * Get health check configuration
   */
  getHealthCheckConfig(): {
    interval: number;
    timeout: number;
    retries: number;
  } {
    const config = this.getAgentConfig();
    return {
      interval: config.healthCheckInterval,
      timeout: config.defaultJobTimeout / 10, // 10% of job timeout
      retries: config.maxRetries
    };
  }

  /**
   * Get Cloud Run configuration
   */
  getCloudRunConfig(): {
    port: number;
    service?: string;
    revision?: string;
    region?: string;
  } {
    return {
      port: parseInt(this.getEnvVar('PORT', '8080')),
      service: process.env.K_SERVICE,
      revision: process.env.K_REVISION,
      region: process.env.K_CONFIGURATION
    };
  }

  /**
   * Ensure configuration is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }
  }

  /**
   * Get configuration summary for logging
   */
  getConfigSummary(): Record<string, any> {
    if (!this.isInitialized) {
      return { initialized: false };
    }

    return {
      initialized: true,
      environment: this.environment.NODE_ENV,
      isCloudRun: this.isCloudRun(),
      hasBlob: !!this.environment.BLOB_READ_WRITE_TOKEN,
      hasEdgeConfig: !!this.environment.EDGE_CONFIG,
      hasGoogleAI: !!this.environment.GOOGLE_AI_API_KEY,
      hasVertexAI: !!(this.environment.GCP_PROJECT_ID && this.environment.GCP_LOCATION),
      hasVercelOIDC: !!this.environment.VERCEL_OIDC_TOKEN,
      hasSupabase: !!(this.environment.SUPABASE_URL && this.environment.SUPABASE_SERVICE_ROLE_KEY),
      aiProvider: this.agentConfig.aiProvider,
      vertexAIConfig: {
        projectId: this.environment.GCP_PROJECT_ID,
        location: this.environment.GCP_LOCATION,
        model: this.environment.VERTEX_AI_MODEL
      },
      agentConfig: {
        maxConcurrentJobs: this.agentConfig.maxConcurrentJobs,
        defaultJobTimeout: this.agentConfig.defaultJobTimeout,
        maxRetries: this.agentConfig.maxRetries,
        enableLogging: this.agentConfig.enableLogging,
        enableMetrics: this.agentConfig.enableMetrics
      }
    };
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance();

// Utility functions
export function validateEnvironment(): Promise<void> {
  return config.initialize();
}

export function getConfig(): ConfigManager {
  return config;
}

// Type exports
export type { EnvironmentConfig, AgentSystemConfig };