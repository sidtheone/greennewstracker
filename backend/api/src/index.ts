/**
 * Main Express application for GreenNewsTracker API
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { getDatabaseManager } from '../../shared/db/init.js';
import { config } from './config/index.js';
import rateLimiter from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';
import cacheHeaders from './middleware/cache.js';
import healthRouter from './routes/health.js';
import countriesRouter from './routes/countries.js';
import newsRouter from './routes/news.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  methods: ['GET'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
app.use(rateLimiter);

// Body parsing (not needed for GET-only API, but kept for future extensibility)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache headers for GET requests
app.use(cacheHeaders);

// API routes
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/countries', countriesRouter);
app.use('/api/v1/news', newsRouter);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'GreenNewsTracker API',
    version: config.api.version,
    endpoints: {
      health: '/api/v1/health',
      countries: '/api/v1/countries',
      news: '/api/v1/news',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    status: 404,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

/**
 * Initialize database and start server
 */
export async function startServer(): Promise<void> {
  // Initialize database
  const dbManager = getDatabaseManager({
    path: config.database.path,
    readonly: true,
  });
  dbManager.connect();
  dbManager.initializeSchema();

  // Start listening
  app.listen(config.api.port, config.api.host, () => {
    console.log(`GreenNewsTracker API listening on http://${config.api.host}:${config.api.port}`);
  });
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default app;
