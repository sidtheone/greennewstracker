/**
 * Hashing utilities for deduplication
 */

import { createHash } from 'crypto';

/**
 * Generate a SHA-256 hash for content deduplication
 * @param content - The content to hash (title, description, etc.)
 * @returns Hexadecimal hash string
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Generate a hash for a news item based on title and link
 * This is used to detect duplicate articles
 * @param title - Article title
 * @param link - Article URL
 * @returns Hexadecimal hash string
 */
export function hashNewsItem(title: string, link: string): string {
  const combined = `${title}|${link}`;
  return hashContent(combined);
}

/**
 * Generate a hash for RSS feed content
 * @param content - RSS feed content
 * @returns Hexadecimal hash string
 */
export function hashFeedContent(content: string): string {
  return hashContent(content);
}

/**
 * Generate a hash for classification data
 * @param category - Classification category
 * @param subcategory - Classification subcategory
 * @param keywords - Classification keywords
 * @returns Hexadecimal hash string
 */
export function hashClassification(
  category: string,
  subcategory: string | null,
  keywords: string | null
): string {
  const combined = `${category}|${subcategory || ''}|${keywords || ''}`;
  return hashContent(combined);
}

/**
 * Generate a consistent hash for cursor-based pagination
 * @param id - Item ID
 * @param publishedAt - Published timestamp
 * @returns Base64 encoded cursor string
 */
export function encodeCursor(id: number, publishedAt: string): string {
  const cursor = `${id}:${publishedAt}`;
  return Buffer.from(cursor).toString('base64');
}

/**
 * Decode a cursor string
 * @param cursor - Base64 encoded cursor string
 * @returns Decoded cursor object with id and publishedAt
 */
export function decodeCursor(cursor: string): { id: number; publishedAt: string } {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length < 2) {
      throw new Error('Invalid cursor format');
    }
    const id = parseInt(parts[0], 10);
    const publishedAt = parts.slice(1).join(':');
    if (isNaN(id) || !publishedAt) {
      throw new Error('Invalid cursor format');
    }
    return { id, publishedAt };
  } catch (error) {
    throw new Error('Invalid cursor format');
  }
}

/**
 * Generate a unique identifier for a job run
 * @param jobType - Type of job
 * @param startedAt - Job start timestamp
 * @returns Hexadecimal hash string
 */
export function hashJobRun(jobType: string, startedAt: string): string {
  const combined = `${jobType}|${startedAt}`;
  return hashContent(combined);
}
