/**
 * Health check endpoint
 */

import { Router, Request, Response } from 'express';
import { getDatabaseManager } from '../../../shared/db/init.js';
import type { HealthResponse } from '../../../shared/types/index.js';

const router = Router();

/**
 * GET /api/v1/health
 * Returns API health status, version, database status, and last fetch timestamp
 */
router.get('/', (_req: Request, res: Response<HealthResponse>) => {
  const dbManager = getDatabaseManager();
  const dbOk = dbManager.healthCheck();
  const lastFetchAt = dbManager.getLastFetchAt();

  const response: HealthResponse = {
    status: dbOk ? 'ok' : 'error',
    version: process.env.API_VERSION || '1.0.0',
    db_ok: dbOk,
    last_fetch_at: lastFetchAt,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

export default router;
