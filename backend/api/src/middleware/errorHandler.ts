/**
 * Error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError, InternalServerError } from '../../../shared/types/index.js';

interface ErrorResponse {
  error: string;
  message: string;
  status: number;
  timestamp: string;
  path?: string;
}

/**
 * Global error handler middleware
 * Catches all errors and returns appropriate JSON responses
 */
export default function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction
): void {
  // Determine if this is an ApiError or a generic Error
  const apiError = err instanceof ApiError ? err : new InternalServerError(err.message);

  // Log error for debugging (in production, use proper logging service)
  if (!apiError.isOperational) {
    console.error('Unexpected error:', err);
  }

  // Build error response
  const response: ErrorResponse = {
    error: apiError.name,
    message: apiError.message,
    status: apiError.status,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Send error response
  res.status(apiError.status).json(response);
}
