/**
 * News endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getDatabaseManager } from '../../../shared/db/init.js';
import { validateNewsQuery, validateNewsIdParam } from '../../../shared/utils/validation.js';
import { decodeCursor, encodeCursor } from '../../../shared/utils/crypto.js';
import { NotFoundError, ValidationError } from '../../../shared/types/index.js';

const router = Router();

interface NewsItemResponse {
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

interface NewsListResponse {
  items: NewsItemResponse[];
  pagination: {
    limit: number;
    next_cursor: string | null;
    has_more: boolean;
  };
}

/**
 * GET /api/v1/news
 * Returns paginated list of news items with optional filters
 * Query params: country, sentiment, since, until, source, limit, cursor
 */
router.get('/', (req: Request, res: Response<NewsListResponse>, next: NextFunction) => {
  try {
    const params = validateNewsQuery(req.query);
    const dbManager = getDatabaseManager();
    const db = dbManager.getDatabase();

    const { country, sentiment, since, until, source, limit, cursor } = params;

    // Build WHERE clause and parameters
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (country) {
      conditions.push('i.country_code = ?');
      queryParams.push(country);
    }

    if (sentiment) {
      conditions.push('i.sentiment = ?');
      queryParams.push(sentiment);
    }

    if (since) {
      conditions.push('i.published_at >= ?');
      queryParams.push(since);
    }

    if (until) {
      conditions.push('i.published_at <= ?');
      queryParams.push(until);
    }

    if (source) {
      conditions.push('i.source_id = ?');
      queryParams.push(source);
    }

    // Handle cursor-based pagination
    if (cursor) {
      try {
        const { id, publishedAt } = decodeCursor(cursor);
        conditions.push('(i.published_at < ? OR (i.published_at = ? AND i.id < ?))');
        queryParams.push(publishedAt, publishedAt, id);
      } catch (error) {
        throw new ValidationError('Invalid cursor format');
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query for news items
    const query = `
      SELECT
        i.id,
        i.title,
        i.link,
        i.description,
        i.published_at,
        i.sentiment,
        i.sentiment_score,
        i.content,
        i.created_at,
        i.updated_at,
        s.id as source_id,
        s.name as source_name,
        s.url as source_url,
        c.code as country_code,
        c.name as country_name,
        cl.category,
        cl.subcategory,
        cl.confidence,
        cl.keywords,
        cl.summary
      FROM items i
      JOIN sources s ON i.source_id = s.id
      JOIN countries c ON i.country_code = c.code
      LEFT JOIN classifications cl ON i.id = cl.item_id
      ${whereClause}
      ORDER BY i.published_at DESC, i.id DESC
      LIMIT ?
    `;

    queryParams.push(limit + 1); // Fetch one extra to determine if there's more

    const rows = db.prepare(query).all(...queryParams) as unknown as any[];

    // Determine pagination info
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeCursor(lastItem.id, lastItem.published_at);
    }

    // Format response
    const formattedItems: NewsItemResponse[] = items.map((row) => ({
      id: row.id,
      title: row.title,
      link: row.link,
      description: row.description,
      published_at: row.published_at,
      source: {
        id: row.source_id,
        name: row.source_name,
        url: row.source_url,
      },
      country: {
        code: row.country_code,
        name: row.country_name,
      },
      sentiment: row.sentiment,
      sentiment_score: row.sentiment_score,
      classification: row.category
        ? {
            category: row.category,
            subcategory: row.subcategory,
            confidence: row.confidence,
            keywords: row.keywords ? JSON.parse(row.keywords) : null,
            summary: row.summary,
          }
        : null,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    const response: NewsListResponse = {
      items: formattedItems,
      pagination: {
        limit,
        next_cursor: nextCursor,
        has_more: hasMore,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/news/:id
 * Returns single news item with classification details
 */
router.get('/:id', (req: Request, res: Response<NewsItemResponse>, next: NextFunction) => {
  try {
    const { id } = validateNewsIdParam(req.params);
    const dbManager = getDatabaseManager();
    const db = dbManager.getDatabase();

    const query = `
      SELECT
        i.id,
        i.title,
        i.link,
        i.description,
        i.published_at,
        i.sentiment,
        i.sentiment_score,
        i.content,
        i.created_at,
        i.updated_at,
        s.id as source_id,
        s.name as source_name,
        s.url as source_url,
        c.code as country_code,
        c.name as country_name,
        cl.category,
        cl.subcategory,
        cl.confidence,
        cl.keywords,
        cl.summary
      FROM items i
      JOIN sources s ON i.source_id = s.id
      JOIN countries c ON i.country_code = c.code
      LEFT JOIN classifications cl ON i.id = cl.item_id
      WHERE i.id = ?
    `;

    const row = db.prepare(query).get(id) as any;

    if (!row) {
      throw new NotFoundError('News item not found');
    }

    const response: NewsItemResponse = {
      id: row.id,
      title: row.title,
      link: row.link,
      description: row.description,
      published_at: row.published_at,
      source: {
        id: row.source_id,
        name: row.source_name,
        url: row.source_url,
      },
      country: {
        code: row.country_code,
        name: row.country_name,
      },
      sentiment: row.sentiment,
      sentiment_score: row.sentiment_score,
      classification: row.category
        ? {
            category: row.category,
            subcategory: row.subcategory,
            confidence: row.confidence,
            keywords: row.keywords ? JSON.parse(row.keywords) : null,
            summary: row.summary,
          }
        : null,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
