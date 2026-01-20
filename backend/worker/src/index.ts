/**
 * GreenNewsTracker Worker Service
 * 
 * Main entry point for the RSS fetch and classification worker
 */

import { createLogger } from './config/logger.js';
import { loadConfig, getConfigSummary } from './config/index.js';
import { getDatabaseManager } from '@greennewstracker/shared';
import { initializeScheduler, cleanupScheduler, triggerJob } from './scheduler.js';

const logger = createLogger('worker');

// Worker state
let isRunning = false;
let isShuttingDown = false;

/**
 * Initialize the worker service
 */
async function initialize(): Promise<void> {
  logger.info({}, 'Initializing GreenNewsTracker Worker Service');
  
  try {
    // Load configuration
    const config = loadConfig();
    logger.info({ config: getConfigSummary() }, 'Configuration loaded');
    
    // Set log level
    if (config.logLevel) {
      logger.info({ level: config.logLevel }, 'Setting log level');
    }
    
    // Initialize database
    logger.info({}, 'Initializing database');
    const dbManager = getDatabaseManager({
      path: config.databasePath,
      readonly: false,
    });
    dbManager.connect();
    dbManager.initializeSchema();
    logger.info({}, 'Database initialized');
    
    // Initialize scheduler
    logger.info({}, 'Initializing job scheduler');
    initializeScheduler();
    logger.info({}, 'Job scheduler initialized');
    
    isRunning = true;
    logger.info({}, 'Worker service initialized successfully');
    
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to initialize worker service');
    throw error;
  }
}

/**
 * Shutdown the worker service gracefully
 */
async function shutdown(): Promise<void> {
  if (isShuttingDown) {
    logger.warn({}, 'Shutdown already in progress');
    return;
  }
  
  isShuttingDown = true;
  logger.info({}, 'Shutting down worker service');
  
  try {
    // Stop scheduler
    logger.info({}, 'Stopping job scheduler');
    cleanupScheduler();
    logger.info({}, 'Job scheduler stopped');
    
    // Close database connection
    logger.info({}, 'Closing database connection');
    // Database will be closed automatically when process exits
    logger.info({}, 'Database connection closed');
    
    isRunning = false;
    logger.info({}, 'Worker service shutdown complete');
    
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error) 
    }, 'Error during shutdown');
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    // Initialize worker
    await initialize();
    
    // Handle command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--run-once')) {
      // Run job once and exit
      logger.info({}, 'Running job once (manual mode)');
      await triggerJob('rss-fetch');
      logger.info({}, 'Job completed, exiting');
      await shutdown();
      process.exit(0);
    } else if (args.includes('--help') || args.includes('-h')) {
      // Show help
      console.log(`
GreenNewsTracker Worker Service

Usage:
  node dist/index.js              Start worker with scheduled jobs
  node dist/index.js --run-once   Run job once and exit
  node dist/index.js --help       Show this help message

Environment Variables:
  OPENAI_API_KEY              OpenAI API key (required)
  DATABASE_PATH               Path to SQLite database (default: ./data/greennewstracker.db)
  OPENAI_MODEL                 OpenAI model to use (default: gpt-4o-mini)
  RSS_FETCH_SCHEDULE           Cron schedule for RSS fetch (default: */15 * * * *)
  MAX_ITEMS_PER_FEED          Maximum items per feed (default: 50)
  MAX_ITEMS_PER_RUN           Maximum items per run (default: 200)
  FETCH_TIMEOUT               Fetch timeout in ms (default: 30000)
  FETCH_CONCURRENCY           Number of concurrent fetches (default: 3)
  CLASSIFICATION_CONCURRENCY  Number of concurrent classifications (default: 3)
  MIN_CONFIDENCE_ENV          Minimum environment confidence (default: 0.70)
  MIN_CONFIDENCE_SENTIMENT    Minimum sentiment confidence (default: 0.65)
  MIN_CONTENT_LENGTH          Minimum content length (default: 100)
  DAILY_ITEM_CAP              Daily item processing cap (default: 1000)
  MAX_COST_PER_DAY            Maximum cost per day in USD (default: 10.00)
  LOG_LEVEL                   Log level: debug, info, warn, error (default: info)
  ALLOWED_DOMAINS              Comma-separated list of allowed domains
  MAX_REDIRECTS               Maximum redirects (default: 3)
  MAX_RESPONSE_SIZE           Maximum response size in bytes (default: 10485760)

Examples:
  # Start worker with default settings
  node dist/index.js

  # Run job once for testing
  node dist/index.js --run-once

  # Start with custom schedule
  RSS_FETCH_SCHEDULE="0 * * * *" node dist/index.js
      `);
      process.exit(0);
    } else {
      // Start worker with scheduled jobs
      logger.info({}, 'Worker service running with scheduled jobs');
      logger.info({}, 'Press Ctrl+C to stop');
    }
    
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error) 
    }, 'Worker service failed to start');
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  logger.info({}, 'Received SIGINT, shutting down gracefully');
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info({}, 'Received SIGTERM, shutting down gracefully');
  await shutdown();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error({ 
    error: error.message,
    stack: error.stack,
  }, 'Uncaught exception');
  shutdown().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ 
    reason: String(reason),
    promise: String(promise),
  }, 'Unhandled rejection');
});

// Start the worker
main().catch((error) => {
  logger.error({ 
    error: error instanceof Error ? error.message : String(error) 
  }, 'Fatal error');
  process.exit(1);
});

// Export for testing
export { initialize, shutdown, isRunning };
