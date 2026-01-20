/**
 * Zod schemas for API validation
 */

import { z } from 'zod';

// Country code validation (ISO 3166-1 alpha-2)
const countryCodeSchema = z.enum(['de', 'at', 'ch', 'us', 'gb', 'fr', 'es', 'it', 'nl', 'pl']);

// Sentiment type validation
const sentimentSchema = z.enum(['positive', 'negative', 'neutral']);

// ISO 8601 date validation
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, {
  message: 'Invalid ISO 8601 date format',
});

// Pagination schemas
const limitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(100)
  .default(20);

const cursorSchema = z.string().optional();

// Query parameter schemas
export const newsQuerySchema = z.object({
  country: countryCodeSchema.optional(),
  sentiment: sentimentSchema.optional(),
  since: isoDateSchema.optional(),
  until: isoDateSchema.optional(),
  source: z.coerce.number().int().positive().optional(),
  limit: limitSchema,
  cursor: cursorSchema,
});

export const newsIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Response schemas
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  version: z.string(),
  db_ok: z.boolean(),
  last_fetch_at: z.string().nullable(),
  timestamp: z.string(),
});

export const countrySchema = z.object({
  code: z.string(),
  name: z.string(),
  language: z.string(),
});

export const countriesResponseSchema = z.array(countrySchema);

export const sourceSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string(),
});

export const classificationSchema = z.object({
  category: z.string(),
  subcategory: z.string().nullable(),
  confidence: z.number(),
  keywords: z.array(z.string()).nullable(),
  summary: z.string().nullable(),
});

export const newsItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  link: z.string(),
  description: z.string().nullable(),
  published_at: z.string(),
  source: sourceSchema,
  country: countrySchema,
  sentiment: z.enum(['positive', 'negative', 'neutral']).nullable(),
  sentiment_score: z.number().nullable(),
  classification: classificationSchema.nullable(),
  content: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const newsListResponseSchema = z.object({
  items: z.array(newsItemSchema),
  pagination: z.object({
    limit: z.number(),
    next_cursor: z.string().nullable(),
    has_more: z.boolean(),
  }),
});

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  status: z.number(),
  timestamp: z.string(),
  path: z.string().optional(),
});

// Validation helper functions
export function validateNewsQuery(params: unknown): z.infer<typeof newsQuerySchema> {
  return newsQuerySchema.parse(params);
}

export function validateNewsIdParam(params: unknown): z.infer<typeof newsIdParamSchema> {
  return newsIdParamSchema.parse(params);
}

export function validateHealthResponse(data: unknown): z.infer<typeof healthResponseSchema> {
  return healthResponseSchema.parse(data);
}

export function validateCountriesResponse(data: unknown): z.infer<typeof countriesResponseSchema> {
  return countriesResponseSchema.parse(data);
}

export function validateNewsListResponse(data: unknown): z.infer<typeof newsListResponseSchema> {
  return newsListResponseSchema.parse(data);
}

export function validateNewsItemResponse(data: unknown): z.infer<typeof newsItemSchema> {
  return newsItemSchema.parse(data);
}

export function validateErrorResponse(data: unknown): z.infer<typeof errorResponseSchema> {
  return errorResponseSchema.parse(data);
}

// Type exports
export type NewsQueryParams = z.infer<typeof newsQuerySchema>;
export type NewsIdParam = z.infer<typeof newsIdParamSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type Country = z.infer<typeof countrySchema>;
export type NewsItem = z.infer<typeof newsItemSchema>;
export type NewsListResponse = z.infer<typeof newsListResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
