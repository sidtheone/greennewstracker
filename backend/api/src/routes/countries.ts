/**
 * Countries endpoint
 */

import { Router, Request, Response } from 'express';
import { getDatabaseManager } from '../../../shared/db/init.js';

const router = Router();

interface CountryResponse {
  code: string;
  name: string;
  language: string;
}

/**
 * GET /api/v1/countries
 * Returns array of supported countries
 */
router.get('/', (_req: Request, res: Response<CountryResponse[]>) => {
  const dbManager = getDatabaseManager();
  const db = dbManager.getDatabase();

  const countries = db
    .prepare(`
      SELECT code, name, language
      FROM countries
      ORDER BY name ASC
    `)
    .all() as unknown as CountryResponse[];

  res.json(countries);
});

export default router;
