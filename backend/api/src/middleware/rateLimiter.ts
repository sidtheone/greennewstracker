/**
 * Rate limiting middleware
 */

import { Request } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Rate limiter configuration
 * Limits requests to prevent abuse
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.',
    status: 429,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/api/v1/health';
  },
});

export default limiter;
