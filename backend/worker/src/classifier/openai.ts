/**
 * OpenAI API Client with Structured Output
 * 
 * Provides OpenAI API integration with:
 * - Structured output using JSON schema
 * - Exponential backoff retry logic
 * - Rate limiting
 * - Cost tracking
 */

import { createLogger } from '../config/logger.js';
import {
  ClassificationResult,
  ClassificationInput,
  BatchClassificationResult,
  OpenAIResponse,
  calculateCost,
  validateClassification,
  meetsThresholds,
  CLASSIFICATION_THRESHOLDS,
} from './types.js';
import { createUserPrompt, getStructuredOutputSchema } from './prompts.js';

// Re-export meetsThresholds for use in runner
export { meetsThresholds };

const logger = createLogger('openai-classifier');

// OpenAI API configuration
const OPENAI_CONFIG = {
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  maxRetries: 3,
  initialRetryDelay: 1000, // 1 second
  maxRetryDelay: 30000, // 30 seconds
  timeout: 60000, // 60 seconds
  rateLimitRequestsPerMinute: 60,
  rateLimitTokensPerMinute: 150000,
} as const;

// Rate limiter state
let requestTimestamps: number[] = [];
let tokenUsage: number[] = [];

/**
 * Rate limiter for API requests
 */
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  // Clean old timestamps
  requestTimestamps = requestTimestamps.filter(t => t > oneMinuteAgo);
  tokenUsage = tokenUsage.filter(t => t > oneMinuteAgo);
  
  // Check request rate limit
  if (requestTimestamps.length >= OPENAI_CONFIG.rateLimitRequestsPerMinute) {
    const oldestRequest = requestTimestamps[0];
    const waitTime = oldestRequest + 60000 - now;
    if (waitTime > 0) {
      logger.info({ waitTime: Math.ceil(waitTime / 1000) }, 'Rate limit reached, waiting');
      await sleep(waitTime);
    }
  }
  
  // Check token rate limit
  const totalTokens = tokenUsage.reduce((sum, t) => sum + t, 0);
  if (totalTokens >= OPENAI_CONFIG.rateLimitTokensPerMinute) {
    const oldestToken = tokenUsage[0];
    const waitTime = oldestToken + 60000 - now;
    if (waitTime > 0) {
      logger.info({ waitTime: Math.ceil(waitTime / 1000) }, 'Token rate limit reached, waiting');
      await sleep(waitTime);
    }
  }
  
  requestTimestamps.push(now);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(attempt: number): number {
  const delay = OPENAI_CONFIG.initialRetryDelay * Math.pow(2, attempt);
  return Math.min(delay, OPENAI_CONFIG.maxRetryDelay);
}

/**
 * Make API request with retry logic
 */
async function makeRequest(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  schema?: any
): Promise<OpenAIResponse> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= OPENAI_CONFIG.maxRetries; attempt++) {
    try {
      // Rate limit before request
      await rateLimit();
      
      const body: any = {
        model: OPENAI_CONFIG.model,
        messages,
        temperature: 0.3, // Lower temperature for more consistent classification
        max_tokens: 1000,
      };
      
      // Add structured output if schema provided
      if (schema) {
        body.response_format = {
          type: 'json_schema',
          json_schema: schema,
        };
      }
      
      const response = await fetch(`${OPENAI_CONFIG.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(OPENAI_CONFIG.timeout),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`OpenAI API error: ${response.status} ${errorText}`);
        
        // Check if we should retry
        if (shouldRetry(response.status, attempt)) {
          const delay = calculateRetryDelay(attempt);
          logger.warn({ 
            attempt, 
            status: response.status, 
            delay: Math.ceil(delay / 1000) 
          }, 'Retrying request');
          await sleep(delay);
          continue;
        }
        
        throw error;
      }
      
      const data = await response.json() as OpenAIResponse;
      
      // Track token usage
      if (data.usage) {
        tokenUsage.push(data.usage.total_tokens);
      }
      
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      if (shouldRetryError(lastError, attempt)) {
        const delay = calculateRetryDelay(attempt);
        logger.warn({ 
          attempt, 
          error: lastError.message, 
          delay: Math.ceil(delay / 1000) 
        }, 'Retrying request');
        await sleep(delay);
        continue;
      }
      
      throw lastError;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Check if HTTP status should trigger retry
 */
function shouldRetry(status: number, attempt: number): boolean {
  if (attempt >= OPENAI_CONFIG.maxRetries) return false;
  
  // Retry on 429 (rate limit), 5xx errors, and 408 (timeout)
  return (
    status === 429 ||
    status === 408 ||
    (status >= 500 && status < 600)
  );
}

/**
 * Check if error should trigger retry
 */
function shouldRetryError(error: Error, attempt: number): boolean {
  if (attempt >= OPENAI_CONFIG.maxRetries) return false;
  
  const message = error.message.toLowerCase();
  
  // Retry on network errors and timeouts
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('fetch failed')
  );
}

/**
 * Classify a single article
 */
export async function classifyArticle(
  input: ClassificationInput,
  apiKey: string
): Promise<ClassificationResult> {
  logger.info({ title: input.title }, 'Classifying article');
  
  // Check content length
  const contentLength = (input.content || input.description || '').length;
  if (contentLength < CLASSIFICATION_THRESHOLDS.MIN_CONTENT_LENGTH) {
    throw new Error(
      `Content too short for classification: ${contentLength} characters ` +
      `(minimum ${CLASSIFICATION_THRESHOLDS.MIN_CONTENT_LENGTH})`
    );
  }
  
  // Create prompt
  const userPrompt = createUserPrompt(input);
  const schema = getStructuredOutputSchema();
  
  // Make API request
  const response = await makeRequest(
    apiKey,
    [
      { role: 'system', content: 'You are an expert environmental news classifier.' },
      { role: 'user', content: userPrompt },
    ],
    schema
  );
  
  // Parse response
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }
  
  let result: ClassificationResult;
  try {
    result = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response as JSON: ${content}`);
  }
  
  // Validate result
  const validation = validateClassification(result);
  if (!validation.valid) {
    logger.warn({ 
      title: input.title, 
      errors: validation.errors 
    }, 'Classification validation failed');
    
    // If confidence is below threshold, still return but log warning
    if (!meetsThresholds(result)) {
      logger.warn({ 
        title: input.title,
        confidence_env: result.confidence_env,
        confidence_sentiment: result.confidence_sentiment,
        thresholds: {
          env: CLASSIFICATION_THRESHOLDS.MIN_CONFIDENCE_ENV,
          sentiment: CLASSIFICATION_THRESHOLDS.MIN_CONFIDENCE_SENTIMENT,
        },
      }, 'Classification below confidence thresholds');
    }
  }
  
  // Calculate cost
  const cost = calculateCost(
    response.usage.prompt_tokens,
    response.usage.completion_tokens
  );
  
  logger.info({ 
    title: input.title,
    category: result.category,
    sentiment: result.sentiment,
    confidence_env: result.confidence_env,
    confidence_sentiment: result.confidence_sentiment,
    tokens: response.usage.total_tokens,
    cost: cost.totalCost.toFixed(6),
  }, 'Article classified successfully');
  
  return result;
}

/**
 * Classify multiple articles in batch
 */
export async function classifyBatch(
  inputs: ClassificationInput[],
  apiKey: string,
  concurrency: number = 3
): Promise<BatchClassificationResult> {
  logger.info({ itemCount: inputs.length, concurrency }, 'Starting batch classification');
  
  const results: ClassificationResult[] = [];
  const errors: Array<{ index: number; error: string }> = [];
  let totalTokens = 0;
  let totalCost = 0;
  
  // Process in batches
  for (let i = 0; i < inputs.length; i += concurrency) {
    const batch = inputs.slice(i, i + concurrency);
    const promises = batch.map(async (input, batchIndex) => {
      const index = i + batchIndex;
      try {
        const result = await classifyArticle(input, apiKey);
        return { index, result };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error({ 
          index, 
          title: input.title, 
          error: err.message 
        }, 'Failed to classify article');
        return { index, error: err.message };
      }
    });
    
    const batchResults = await Promise.all(promises);
    
    for (const { index, result, error } of batchResults) {
      if (result) {
        results[index] = result;
      } else if (error) {
        errors.push({ index, error });
      }
    }
  }
  
  // Calculate total cost (estimate based on average)
  const avgTokens = totalTokens / (results.length || 1);
  totalCost = calculateCost(avgTokens * results.length, avgTokens * results.length).totalCost;
  
  logger.info({ 
    total: inputs.length,
    success: results.length,
    failed: errors.length,
    totalCost: totalCost.toFixed(6),
  }, 'Batch classification completed');
  
  return {
    results: results.filter(Boolean),
    totalTokens,
    totalCost,
    errors,
  };
}

/**
 * Check if API key is valid
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${OPENAI_CONFIG.baseURL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(): {
  requestsInLastMinute: number;
  tokensInLastMinute: number;
  requestLimit: number;
  tokenLimit: number;
} {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  const recentRequests = requestTimestamps.filter(t => t > oneMinuteAgo);
  const recentTokens = tokenUsage.filter(t => t > oneMinuteAgo);
  
  return {
    requestsInLastMinute: recentRequests.length,
    tokensInLastMinute: recentTokens.reduce((sum, t) => sum + t, 0),
    requestLimit: OPENAI_CONFIG.rateLimitRequestsPerMinute,
    tokenLimit: OPENAI_CONFIG.rateLimitTokensPerMinute,
  };
}
