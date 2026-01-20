/**
 * Structured Logger Configuration
 * 
 * Provides structured logging with redaction for sensitive data
 */

export interface LogContext {
  [key: string]: unknown;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Create a logger instance with a specific namespace
 */
export function createLogger(namespace: string) {
  return {
    debug: (context: LogContext, message: string) => {
      log('debug', namespace, message, context);
    },
    info: (context: LogContext, message: string) => {
      log('info', namespace, message, context);
    },
    warn: (context: LogContext, message: string) => {
      log('warn', namespace, message, context);
    },
    error: (context: LogContext, message: string) => {
      log('error', namespace, message, context);
    },
  };
}

/**
 * Core logging function with redaction
 */
function log(level: LogLevel, namespace: string, message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const redactedContext = context ? redactSensitiveData(context) : {};
  
  const logEntry = {
    timestamp,
    level,
    namespace,
    message,
    ...redactedContext,
  };
  
  // Output to console (in production, this could go to a file or service)
  const output = JSON.stringify(logEntry);
  
  switch (level) {
    case 'debug':
      if (process.env.LOG_LEVEL === 'debug') {
        console.debug(output);
      }
      break;
    case 'info':
      console.info(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'error':
      console.error(output);
      break;
  }
}

/**
 * Redact sensitive data from log context
 */
function redactSensitiveData(context: LogContext): LogContext {
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'authorization',
    'cookie',
    'session',
    'credit',
    'ssn',
    'social',
  ];
  
  const redacted: LogContext = {};
  
  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sensitive => 
      lowerKey.includes(sensitive)
    );
    
    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 500) {
      // Truncate long strings
      redacted[key] = value.substring(0, 500) + '...[TRUNCATED]';
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

/**
 * Set log level from environment
 */
export function setLogLevel(level: LogLevel): void {
  process.env.LOG_LEVEL = level;
}
