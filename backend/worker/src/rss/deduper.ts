/**
 * RSS Feed Item Deduplication
 * 
 * This module provides deduplication logic using multiple hash strategies:
 * - URL hash
 * - GUID hash
 * - Content hash
 */

import { createHash } from 'crypto';
import { createLogger } from '../config/logger.js';
import { ParsedFeedItem } from './parser.js';

const logger = createLogger('rss-deduper');

export interface DeduplicationResult {
  uniqueItems: ParsedFeedItem[];
  duplicateCount: number;
  duplicatesByType: {
    url: number;
    guid: number;
    content: number;
  };
}

export interface ItemHashes {
  urlHash: string;
  guidHash?: string;
  contentHash: string;
}

/**
 * Generate SHA-256 hash of a string
 */
function generateHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Generate normalized URL hash
 */
function generateUrlHash(url: string): string {
  // Normalize URL before hashing
  const normalized = url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/www\./, '')
    .replace(/[?#].*$/, ''); // Remove query string and fragment
  
  return generateHash(normalized);
}

/**
 * Generate GUID hash
 */
function generateGuidHash(guid?: string): string | undefined {
  if (!guid) return undefined;
  return generateHash(guid.toLowerCase().trim());
}

/**
 * Generate content hash
 */
function generateContentHash(title: string, description?: string, content?: string): string {
  // Combine title and content for hashing
  const combined = [
    title.toLowerCase().trim(),
    (description || '').toLowerCase().trim(),
    (content || '').toLowerCase().trim(),
  ].join('|');
  
  return generateHash(combined);
}

/**
 * Generate all hashes for a feed item
 */
export function generateItemHashes(item: ParsedFeedItem): ItemHashes {
  return {
    urlHash: generateUrlHash(item.link),
    guidHash: generateGuidHash(item.guid),
    contentHash: generateContentHash(
      item.title,
      item.description,
      item.content
    ),
  };
}

/**
 * Deduplicate feed items using multiple strategies
 */
export function deduplicateItems(
  items: ParsedFeedItem[],
  existingHashes?: Set<string>
): DeduplicationResult {
  logger.info({ itemCount: items.length }, 'Starting deduplication');
  
  const seenUrlHashes = new Set<string>();
  const seenGuidHashes = new Set<string>();
  const seenContentHashes = new Set<string>();
  const uniqueItems: ParsedFeedItem[] = [];
  
  // Initialize with existing hashes if provided
  if (existingHashes) {
    existingHashes.forEach(hash => {
      seenUrlHashes.add(hash);
      seenContentHashes.add(hash);
    });
  }
  
  const duplicatesByType = {
    url: 0,
    guid: 0,
    content: 0,
  };
  
  for (const item of items) {
    const hashes = generateItemHashes(item);
    
    // Check URL hash first (most reliable)
    if (seenUrlHashes.has(hashes.urlHash)) {
      duplicatesByType.url++;
      logger.debug({ 
        title: item.title, 
        link: item.link,
        hash: hashes.urlHash 
      }, 'Duplicate by URL hash');
      continue;
    }
    
    // Check GUID hash if available
    if (hashes.guidHash && seenGuidHashes.has(hashes.guidHash)) {
      duplicatesByType.guid++;
      logger.debug({ 
        title: item.title, 
        guid: item.guid,
        hash: hashes.guidHash 
      }, 'Duplicate by GUID hash');
      continue;
    }
    
    // Check content hash (catches similar articles)
    if (seenContentHashes.has(hashes.contentHash)) {
      duplicatesByType.content++;
      logger.debug({ 
        title: item.title, 
        hash: hashes.contentHash 
      }, 'Duplicate by content hash');
      continue;
    }
    
    // Item is unique
    uniqueItems.push(item);
    seenUrlHashes.add(hashes.urlHash);
    if (hashes.guidHash) {
      seenGuidHashes.add(hashes.guidHash);
    }
    seenContentHashes.add(hashes.contentHash);
  }
  
  const duplicateCount = items.length - uniqueItems.length;
  
  logger.info({ 
    total: items.length,
    unique: uniqueItems.length,
    duplicates: duplicateCount,
    byType: duplicatesByType 
  }, 'Deduplication completed');
  
  return {
    uniqueItems,
    duplicateCount,
    duplicatesByType,
  };
}

/**
 * Check if an item is a duplicate based on existing hashes
 */
export function isDuplicate(
  item: ParsedFeedItem,
  existingHashes: Set<string>
): boolean {
  const hashes = generateItemHashes(item);
  
  return (
    existingHashes.has(hashes.urlHash) ||
    existingHashes.has(hashes.contentHash)
  );
}

/**
 * Extract hashes from a list of items
 */
export function extractHashes(items: ParsedFeedItem[]): Set<string> {
  const hashes = new Set<string>();
  
  for (const item of items) {
    const itemHashes = generateItemHashes(item);
    hashes.add(itemHashes.urlHash);
    hashes.add(itemHashes.contentHash);
  }
  
  return hashes;
}

/**
 * Merge multiple feed items and deduplicate
 */
export function mergeAndDeduplicate(
  feedItems: ParsedFeedItem[][]
): DeduplicationResult {
  logger.info({ feedCount: feedItems.length }, 'Merging and deduplicating feeds');
  
  // Flatten all items
  const allItems = feedItems.flat();
  
  // Deduplicate
  return deduplicateItems(allItems);
}

/**
 * Find similar items based on content similarity
 * (Uses simple Jaccard similarity for titles)
 */
export function findSimilarItems(
  items: ParsedFeedItem[],
  threshold: number = 0.7
): Map<string, ParsedFeedItem[]> {
  const similarGroups = new Map<string, ParsedFeedItem[]>();
  
  for (let i = 0; i < items.length; i++) {
    const itemA = items[i];
    const wordsA = new Set(
      itemA.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    );
    
    for (let j = i + 1; j < items.length; j++) {
      const itemB = items[j];
      const wordsB = new Set(
        itemB.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      );
      
      // Calculate Jaccard similarity
      const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
      const union = new Set([...wordsA, ...wordsB]);
      const similarity = intersection.size / union.size;
      
      if (similarity >= threshold) {
        const key = `${itemA.link}|${itemB.link}`;
        similarGroups.set(key, [itemA, itemB]);
        
        logger.debug({ 
          titleA: itemA.title,
          titleB: itemB.title,
          similarity: similarity.toFixed(2) 
        }, 'Found similar items');
      }
    }
  }
  
  logger.info({ 
    groups: similarGroups.size,
    threshold 
  }, 'Similarity analysis completed');
  
  return similarGroups;
}
