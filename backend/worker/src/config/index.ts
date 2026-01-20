/**
 * Environment Configuration
 * 
 * Loads and validates environment variables for the worker service
 */

import { createLogger } from './logger.js';

const logger = createLogger('config');

// Configuration interface
export interface WorkerConfig {
  // Database
  databasePath: string;
  
  // OpenAI
  openaiApiKey: string;
  openaiModel: string;
  
  // RSS Fetching
  rssFetchSchedule: string;
  maxItemsPerFeed: number;
  maxItemsPerRun: number;
  fetchTimeout: number;
  fetchConcurrency: number;
  
  // Classification
  classificationConcurrency: number;
  minConfidenceEnv: number;
  minConfidenceSentiment: number;
  minContentLength: number;
  
  // Cost Controls
  dailyItemCap: number;
  maxCostPerDay: number;
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // SSRF Protection
  allowedDomains: string[];
  maxRedirects: number;
  maxResponseSize: number;
}

// Default configuration
const DEFAULT_CONFIG: Partial<WorkerConfig> = {
  databasePath: './data/greennewstracker.db',
  openaiModel: 'gpt-4o-mini',
  rssFetchSchedule: '*/15 * * * *',
  maxItemsPerFeed: 50,
  maxItemsPerRun: 200,
  fetchTimeout: 30000,
  fetchConcurrency: 3,
  classificationConcurrency: 3,
  minConfidenceEnv: 0.70,
  minConfidenceSentiment: 0.65,
  minContentLength: 100,
  dailyItemCap: 1000,
  maxCostPerDay: 10.00,
  logLevel: 'info',
  allowedDomains: [
    'enn.com',
    'insideclimatenews.org',
    'grist.org',
    'theguardian.com',
    'bbci.co.uk',
    'umweltbundesamt.de',
    'climatechangenews.com',
    'downtoearth.org.in',
    'thehindu.com',
  ],
  maxRedirects: 3,
  maxResponseSize: 10 * 1024 * 1024, // 10MB
};

// Cached configuration
let config: WorkerConfig | null = null;

/**
 * Get configuration value from environment
 */
function getEnvValue(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue || '';
}

/**
 * Get numeric configuration value
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    logger.warn({ key, value }, 'Invalid number, using default');
    return defaultValue;
  }
  
  return parsed;
}

/**
 * Get boolean configuration value
 */
export function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Load and validate configuration
 */
export function loadConfig(): WorkerConfig {
  if (config) {
    return config;
  }
  
  logger.info({}, 'Loading worker configuration');
  
  try {
    // Load required values
    const openaiApiKey = getEnvValue('OPENAI_API_KEY');
    
    // Validate OpenAI API key format
    if (!openaiApiKey.startsWith('sk-')) {
      throw new Error('Invalid OPENAI_API_KEY format');
    }
    
    // Load optional values with defaults
    const databasePath = getEnvValue('DATABASE_PATH', DEFAULT_CONFIG.databasePath!);
    const openaiModel = getEnvValue('OPENAI_MODEL', DEFAULT_CONFIG.openaiModel!);
    const rssFetchSchedule = getEnvValue('RSS_FETCH_SCHEDULE', DEFAULT_CONFIG.rssFetchSchedule!);
    const maxItemsPerFeed = getEnvNumber('MAX_ITEMS_PER_FEED', DEFAULT_CONFIG.maxItemsPerFeed!);
    const maxItemsPerRun = getEnvNumber('MAX_ITEMS_PER_RUN', DEFAULT_CONFIG.maxItemsPerRun!);
    const fetchTimeout = getEnvNumber('FETCH_TIMEOUT', DEFAULT_CONFIG.fetchTimeout!);
    const fetchConcurrency = getEnvNumber('FETCH_CONCURRENCY', DEFAULT_CONFIG.fetchConcurrency!);
    const classificationConcurrency = getEnvNumber('CLASSIFICATION_CONCURRENCY', DEFAULT_CONFIG.classificationConcurrency!);
    const minConfidenceEnv = getEnvNumber('MIN_CONFIDENCE_ENV', DEFAULT_CONFIG.minConfidenceEnv!);
    const minConfidenceSentiment = getEnvNumber('MIN_CONFIDENCE_SENTIMENT', DEFAULT_CONFIG.minConfidenceSentiment!);
    const minContentLength = getEnvNumber('MIN_CONTENT_LENGTH', DEFAULT_CONFIG.minContentLength!);
    const dailyItemCap = getEnvNumber('DAILY_ITEM_CAP', DEFAULT_CONFIG.dailyItemCap!);
    const maxCostPerDay = getEnvNumber('MAX_COST_PER_DAY', DEFAULT_CONFIG.maxCostPerDay!);
    const logLevel = (getEnvValue('LOG_LEVEL', DEFAULT_CONFIG.logLevel!) as 'debug' | 'info' | 'warn' | 'error');
    const maxRedirects = getEnvNumber('MAX_REDIRECTS', DEFAULT_CONFIG.maxRedirects!);
    const maxResponseSize = getEnvNumber('MAX_RESPONSE_SIZE', DEFAULT_CONFIG.maxResponseSize!);
    
    // Parse allowed domains
    const allowedDomainsEnv = process.env.ALLOWED_DOMAINS;
    const allowedDomains = allowedDomainsEnv 
      ? allowedDomainsEnv.split(',').map(d => d.trim().toLowerCase())
      : DEFAULT_CONFIG.allowedDomains!;
    
    // Validate configuration
    validateConfig({
      databasePath,
      openaiApiKey,
      openaiModel,
      rssFetchSchedule,
      maxItemsPerFeed,
      maxItemsPerRun,
      fetchTimeout,
      fetchConcurrency,
      classificationConcurrency,
      minConfidenceEnv,
      minConfidenceSentiment,
      minContentLength,
      dailyItemCap,
      maxCostPerDay,
      logLevel,
      allowedDomains,
      maxRedirects,
      maxResponseSize,
    });
    
    config = {
      databasePath,
      openaiApiKey,
      openaiModel,
      rssFetchSchedule,
      maxItemsPerFeed,
      maxItemsPerRun,
      fetchTimeout,
      fetchConcurrency,
      classificationConcurrency,
      minConfidenceEnv,
      minConfidenceSentiment,
      minContentLength,
      dailyItemCap,
      maxCostPerDay,
      logLevel,
      allowedDomains,
      maxRedirects,
      maxResponseSize,
    };
    
    logger.info({ 
      databasePath,
      openaiModel,
      rssFetchSchedule,
      maxItemsPerRun,
      logLevel,
    }, 'Configuration loaded successfully');
    
    return config;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to load configuration');
    throw error;
  }
}

/**
 * Validate configuration values
 */
function validateConfig(cfg: WorkerConfig): void {
  const errors: string[] = [];
  
  // Validate OpenAI API key
  if (!cfg.openaiApiKey || cfg.openaiApiKey.length < 20) {
    errors.push('OPENAI_API_KEY must be at least 20 characters');
  }
  
  // Validate numeric ranges
  if (cfg.maxItemsPerFeed < 1 || cfg.maxItemsPerFeed > 1000) {
    errors.push('MAX_ITEMS_PER_FEED must be between 1 and 1000');
  }
  
  if (cfg.maxItemsPerRun < 1 || cfg.maxItemsPerRun > 10000) {
    errors.push('MAX_ITEMS_PER_RUN must be between 1 and 10000');
  }
  
  if (cfg.fetchTimeout < 1000 || cfg.fetchTimeout > 300000) {
    errors.push('FETCH_TIMEOUT must be between 1000 and 300000 ms');
  }
  
  if (cfg.fetchConcurrency < 1 || cfg.fetchConcurrency > 10) {
    errors.push('FETCH_CONCURRENCY must be between 1 and 10');
  }
  
  if (cfg.classificationConcurrency < 1 || cfg.classificationConcurrency > 10) {
    errors.push('CLASSIFICATION_CONCURRENCY must be between 1 and 10');
  }
  
  if (cfg.minConfidenceEnv < 0 || cfg.minConfidenceEnv > 1) {
    errors.push('MIN_CONFIDENCE_ENV must be between 0 and 1');
  }
  
  if (cfg.minConfidenceSentiment < 0 || cfg.minConfidenceSentiment > 1) {
    errors.push('MIN_CONFIDENCE_SENTIMENT must be between 0 and 1');
  }
  
  if (cfg.minContentLength < 10 || cfg.minContentLength > 10000) {
    errors.push('MIN_CONTENT_LENGTH must be between 10 and 10000');
  }
  
  if (cfg.dailyItemCap < 1 || cfg.dailyItemCap > 100000) {
    errors.push('DAILY_ITEM_CAP must be between 1 and 100000');
  }
  
  if (cfg.maxCostPerDay < 0.01 || cfg.maxCostPerDay > 1000) {
    errors.push('MAX_COST_PER_DAY must be between 0.01 and 1000');
  }
  
  // Validate allowed domains
  if (cfg.allowedDomains.length === 0) {
    errors.push('At least one allowed domain must be specified');
  }
  
  if (cfg.maxRedirects < 0 || cfg.maxRedirects > 10) {
    errors.push('MAX_REDIRECTS must be between 0 and 10');
  }
  
  if (cfg.maxResponseSize < 1024 || cfg.maxResponseSize > 100 * 1024 * 1024) {
    errors.push('MAX_RESPONSE_SIZE must be between 1024 and 100MB');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Get configuration (loads if not already loaded)
 */
export function getConfig(): WorkerConfig {
  if (!config) {
    return loadConfig();
  }
  return config;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
  config = null;
}

/**
 * Get configuration summary (for logging, excludes sensitive data)
 */
export function getConfigSummary(): Record<string, unknown> {
  const cfg = getConfig();
  
  return {
    databasePath: cfg.databasePath,
    openaiModel: cfg.openaiModel,
    rssFetchSchedule: cfg.rssFetchSchedule,
    maxItemsPerFeed: cfg.maxItemsPerFeed,
    maxItemsPerRun: cfg.maxItemsPerRun,
    fetchTimeout: cfg.fetchTimeout,
    fetchConcurrency: cfg.fetchConcurrency,
    classificationConcurrency: cfg.classificationConcurrency,
    minConfidenceEnv: cfg.minConfidenceEnv,
    minConfidenceSentiment: cfg.minConfidenceSentiment,
    minContentLength: cfg.minContentLength,
    dailyItemCap: cfg.dailyItemCap,
    maxCostPerDay: cfg.maxCostPerDay,
    logLevel: cfg.logLevel,
    allowedDomains: cfg.allowedDomains,
    maxRedirects: cfg.maxRedirects,
    maxResponseSize: cfg.maxResponseSize,
    openaiApiKey: cfg.openaiApiKey ? '[REDACTED]' : undefined,
  };
}
