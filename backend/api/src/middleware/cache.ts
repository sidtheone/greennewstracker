/**
 * Cache headers middleware
 * Adds ETag and Cache-Control headers to GET responses
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

/**
 * Generate ETag from response body
 * @param body - Response body string
 * @returns ETag hash
 */
function generateETag(body: string): string {
  return createHash('md5').update(body).digest('hex');
}

/**
 * Middleware to add cache headers to GET requests
 * Uses ETag for conditional requests and Cache-Control for caching
 */
export default function cacheHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only apply to GET requests
  if (req.method !== 'GET') {
    return next();
  }

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to add ETag
  res.json = function (body: any): Response {
    // Convert body to string for ETag generation
    const bodyString = JSON.stringify(body);
    const etag = generateETag(bodyString);

    // Set ETag header
    res.setHeader('ETag', `"${etag}"`);

    // Check if client has matching ETag (If-None-Match header)
    const clientETag = req.get('If-None-Match');
    if (clientETag && clientETag === `"${etag}"`) {
      // Return 304 Not Modified
      return res.status(304).end();
    }

    // Set Cache-Control header based on endpoint
    if (req.path === '/api/v1/health') {
      // Health check: cache for 30 seconds
      res.setHeader('Cache-Control', 'public, max-age=30');
    } else if (req.path === '/api/v1/countries') {
      // Countries list: cache for 1 hour
      res.setHeader('Cache-Control', 'public, max-age=3600');
    } else if (req.path.startsWith('/api/v1/news')) {
      // News items: cache for 5 minutes
      res.setHeader('Cache-Control', 'public, max-age=300');
    } else {
      // Default: cache for 1 minute
      res.setHeader('Cache-Control', 'public, max-age=60');
    }

    // Call original json method
    return originalJson(body);
  };

  next();
}
