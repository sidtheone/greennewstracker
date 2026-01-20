/**
 * RSS/Atom Parser with Normalization
 * 
 * This module parses RSS and Atom feeds and normalizes them to a common format
 */

import Parser from 'rss-parser';
import { createLogger } from '../config/logger.js';

const logger = createLogger('rss-parser');

// Initialize RSS parser with custom options
const parser = new Parser({
  timeout: 30000,
  customFields: {
    item: [
      ['media:content', 'media'],
      ['content:encoded', 'encodedContent'],
      ['dc:creator', 'creator'],
      ['dc:date', 'dcDate'],
      ['guid', 'guid'],
    ],
    feed: [
      ['dc:language', 'language'],
      ['dc:rights', 'rights'],
    ],
  },
} as any);

export interface ParsedFeed {
  title: string;
  description: string;
  link: string;
  language?: string;
  items: ParsedFeedItem[];
}

export interface ParsedFeedItem {
  title: string;
  link: string;
  description?: string;
  content?: string;
  pubDate?: string;
  guid?: string;
  creator?: string;
  categories?: string[];
  enclosure?: {
    url: string;
    type: string;
    length?: number;
  };
  sourceName?: string;
  sourceCategory?: string;
  sourceLanguage?: string;
}

export class ParseError extends Error {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Parse RSS/Atom feed content
 */
export async function parseFeed(content: string, feedUrl: string): Promise<ParsedFeed> {
  logger.info({ feedUrl }, 'Parsing RSS feed');
  
  try {
    const feed = await parser.parseString(content);
    
    // Normalize feed structure
    const normalizedFeed: ParsedFeed = {
      title: normalizeText(feed.title || 'Untitled Feed'),
      description: normalizeText(feed.description || ''),
      link: feed.link || feedUrl,
      language: (feed as any).language || (feed as any).isoDate ? (feed as any).language : undefined,
      items: feed.items.map(item => normalizeItem(item)),
    };
    
    logger.info({ 
      feedUrl, 
      itemCount: normalizedFeed.items.length,
      title: normalizedFeed.title 
    }, 'Feed parsed successfully');
    
    return normalizedFeed;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ feedUrl, error: err.message }, 'Failed to parse RSS feed');
    throw new ParseError(`Failed to parse feed: ${err.message}`, err);
  }
}

/**
 * Normalize a feed item to common format
 */
function normalizeItem(item: any): ParsedFeedItem {
  // Extract content from various fields
  let content = item['content:encoded'] || item.content || item.encodedContent;
  let description = item.description || item.summary || item.contentSnippet;
  
  // If no content but description exists, use description as content
  if (!content && description) {
    content = description;
  }
  
  // Clean up HTML tags from description
  if (description) {
    description = stripHtml(description);
  }
  
  // Clean up HTML tags from content
  if (content) {
    content = stripHtml(content);
  }
  
  // Normalize publication date
  let pubDate = item.pubDate || item.published || item.isoDate || item.dcDate;
  if (pubDate) {
    pubDate = new Date(pubDate).toISOString();
  }
  
  // Extract GUID
  const guid = item.guid || item.id || item.link;
  
  // Extract categories
  const categories = item.categories || [];
  const normalizedCategories = Array.isArray(categories) 
    ? categories.map((cat: any) => typeof cat === 'string' ? cat : cat.$ || cat._)
    : [];
  
  // Extract enclosure
  const enclosure = item.enclosure ? {
    url: item.enclosure.url,
    type: item.enclosure.type,
    length: item.enclosure.length,
  } : undefined;
  
  return {
    title: normalizeText(item.title || 'Untitled'),
    link: normalizeUrl(item.link),
    description: normalizeText(description),
    content: normalizeText(content),
    pubDate,
    guid,
    creator: item.creator || item.author,
    categories: normalizedCategories.filter(Boolean),
    enclosure,
  } as ParsedFeedItem;
}

/**
 * Normalize text content
 */
function normalizeText(text?: string): string {
  if (!text) return '';
  
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .substring(0, 10000); // Limit to 10k characters
}

/**
 * Normalize URL
 */
function normalizeUrl(url?: string): string {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    // Remove fragments and some tracking parameters
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate parsed feed item
 */
export function validateFeedItem(item: ParsedFeedItem): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!item.title || item.title.trim().length === 0) {
    errors.push('Title is required');
  }
  
  if (!item.link || item.link.trim().length === 0) {
    errors.push('Link is required');
  } else {
    try {
      new URL(item.link);
    } catch {
      errors.push('Invalid link URL');
    }
  }
  
  // Check if content is too short (likely not a real article)
  const contentLength = (item.content || item.description || '').length;
  if (contentLength < 50) {
    errors.push('Content too short (minimum 50 characters)');
  }
  
  // Check if publication date is valid
  if (item.pubDate) {
    const pubDate = new Date(item.pubDate);
    if (isNaN(pubDate.getTime())) {
      errors.push('Invalid publication date');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Filter valid feed items
 */
export function filterValidItems(items: ParsedFeedItem[]): ParsedFeedItem[] {
  const validItems: ParsedFeedItem[] = [];
  
  for (const item of items) {
    const validation = validateFeedItem(item);
    if (validation.valid) {
      validItems.push(item);
    } else {
      logger.debug({ 
        title: item.title, 
        link: item.link, 
        errors: validation.errors 
      }, 'Filtered out invalid feed item');
    }
  }
  
  logger.info({ 
    total: items.length, 
    valid: validItems.length,
    filtered: items.length - validItems.length 
  }, 'Filtered feed items');
  
  return validItems;
}

/**
 * Sort items by publication date (newest first)
 */
export function sortItemsByDate(items: ParsedFeedItem[]): ParsedFeedItem[] {
  return [...items].sort((a, b) => {
    const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return dateB - dateA; // Newest first
  });
}

/**
 * Limit items to maximum count
 */
export function limitItems(items: ParsedFeedItem[], maxItems: number): ParsedFeedItem[] {
  return items.slice(0, maxItems);
}
