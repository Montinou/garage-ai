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
  
  // AI services
  GOOGLE_AI_API_KEY: string;
  
  // Database
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  
  // Application settings
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_APP_URL?: string;
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
  cleanupInterval: 3600000 // 1 hour
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
      NODE_ENV: env.NODE_ENV as 'development' | 'production' | 'test'
    };

    // Check for missing required variables
    for (const [key, value] of Object.entries(requiredVars)) {
      if (!value) {
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

    if (requiredVars.GOOGLE_AI_API_KEY && !requiredVars.GOOGLE_AI_API_KEY.startsWith('AIza')) {
      console.warn('GOOGLE_AI_API_KEY format may be invalid - expected to start with "AIza"');
    }

    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }

    return {
      ...requiredVars,
      NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL
    } as EnvironmentConfig;
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
   * Get Vercel Blob configuration
   */
  getBlobConfig(): { token: string } {
    return {
      token: this.getEnvVar('BLOB_READ_WRITE_TOKEN')
    };
  }

  /**
   * Get Google AI configuration
   */
  getGoogleAIConfig(): { apiKey: string } {
    return {
      apiKey: this.getEnvVar('GOOGLE_AI_API_KEY')
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
      hasBlob: !!this.environment.BLOB_READ_WRITE_TOKEN,
      hasEdgeConfig: !!this.environment.EDGE_CONFIG,
      hasGoogleAI: !!this.environment.GOOGLE_AI_API_KEY,
      hasVercelOIDC: !!this.environment.VERCEL_OIDC_TOKEN,
      hasSupabase: !!(this.environment.SUPABASE_URL && this.environment.SUPABASE_SERVICE_ROLE_KEY),
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