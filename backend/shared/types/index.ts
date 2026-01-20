/**
 * TypeScript types for GreenNewsTracker entities
 */

// Database entity types
export interface Country {
  id: number;
  code: string;
  name: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface CountryInput {
  code: string;
  name: string;
  language: string;
}

export interface Source {
  id: number;
  name: string;
  url: string;
  country_code: string;
  category: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface SourceInput {
  name: string;
  url: string;
  country_code: string;
  category?: string;
  active?: number;
}

export interface Item {
  id: number;
  title: string;
  link: string;
  description: string | null;
  content: string | null;
  published_at: string;
  source_id: number;
  country_code: string;
  content_hash: string;
  sentiment: string | null;
  sentiment_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface ItemInput {
  title: string;
  link: string;
  description?: string;
  content?: string;
  published_at: string;
  source_id: number;
  country_code: string;
  content_hash: string;
  sentiment?: string;
  sentiment_score?: number;
}

export interface Classification {
  id: number;
  item_id: number;
  category: string;
  subcategory: string | null;
  confidence: number;
  keywords: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassificationInput {
  item_id: number;
  category: string;
  subcategory?: string;
  confidence: number;
  keywords?: string;
  summary?: string;
}

export interface JobRun {
  id: number;
  job_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  items_processed: number;
  items_created: number;
  items_updated: number;
  error_message: string | null;
  metadata: string | null;
  created_at: string;
}

export interface JobRunInput {
  job_type: string;
  status: JobStatus;
  started_at: string;
  completed_at?: string;
  items_processed?: number;
  items_created?: number;
  items_updated?: number;
  error_message?: string;
  metadata?: string;
}

// Enums
export type SentimentType = 'positive' | 'negative' | 'neutral';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

// API Response types
export interface HealthResponse {
  status: 'ok' | 'error';
  version: string;
  db_ok: boolean;
  last_fetch_at: string | null;
  timestamp: string;
}

export interface NewsQueryParams {
  country?: string;
  sentiment?: SentimentType;
  since?: string;
  until?: string;
  source?: number;
  limit?: number;
  cursor?: string;
}

export interface NewsListResponse {
  items: NewsItemResponse[];
  pagination: {
    limit: number;
    next_cursor: string | null;
    has_more: boolean;
  };
}

export interface NewsItemResponse {
  id: number;
  title: string;
  link: string;
  description: string | null;
  published_at: string;
  source: {
    id: number;
    name: string;
    url: string;
  };
  country: {
    code: string;
    name: string;
  };
  sentiment: string | null;
  sentiment_score: number | null;
  classification: {
    category: string;
    subcategory: string | null;
    confidence: number;
    keywords: string[] | null;
    summary: string | null;
  } | null;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  status: number;
  timestamp: string;
  path?: string;
}

// Error types
export class ApiError extends Error {
  status: number;
  isOperational: boolean;

  constructor(message: string, status: number = 500, isOperational: boolean = true) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request') {
    super(message, 400);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed') {
    super(message, 400);
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, false);
  }
}
