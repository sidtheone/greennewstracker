/**
 * Job Runner
 * 
 * Orchestrates the fetch -> dedupe -> classify -> store workflow
 */

import { createLogger } from './config/logger.js';
import { fetchRSS, fetchMultipleRSS } from './rss/fetcher.js';
import { parseFeed, filterValidItems, sortItemsByDate, limitItems } from './rss/parser.js';
import { deduplicateItems } from './rss/deduper.js';
import { classifyBatch, meetsThresholds } from './classifier/openai.js';
import { ClassificationResult, ClassificationInput } from './classifier/types.js';
import { getDatabaseManager, ItemInput } from '@greennewstracker/shared';
import { readFileSync } from 'fs';
import { join } from 'path';

const logger = createLogger('job-runner');

// Job configuration
const JOB_CONFIG = {
  maxItemsPerFeed: 50,
  maxItemsPerRun: 200,
  classificationConcurrency: 3,
  fetchConcurrency: 3,
} as const;

// RSS sources configuration
interface RSSSource {
  name: string;
  url: string;
  category: string;
  language: string;
  active: boolean;
}

interface RSSConfig {
  countries: Record<string, {
    name: string;
    sources: RSSSource[];
  }>;
  settings: {
    fetchIntervalMinutes: number;
    maxArticlesPerFeed: number;
    retryAttempts: number;
    retryDelaySeconds: number;
    timeoutSeconds: number;
  };
}

/**
 * Load RSS sources configuration
 */
function loadRSSSources(): RSSSource[] {
  try {
    const configPath = join(process.cwd(), 'config', 'rss-sources.json');
    const configContent = readFileSync(configPath, 'utf-8');
    const config: RSSConfig = JSON.parse(configContent);
    
    const sources: RSSSource[] = [];
    for (const countryCode in config.countries) {
      const country = config.countries[countryCode];
      for (const source of country.sources) {
        if (source.active) {
          sources.push(source);
        }
      }
    }
    
    logger.info({ count: sources.length }, 'Loaded RSS sources configuration');
    return sources;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to load RSS sources');
    return [];
  }
}

/**
 * Get existing content hashes from database
 */
async function getExistingHashes(db: any): Promise<Set<string>> {
  try {
    const hashes = new Set<string>();
    const rows = db.prepare('SELECT content_hash FROM items').all();
    
    for (const row of rows) {
      hashes.add(row.content_hash);
    }
    
    logger.info({ count: hashes.size }, 'Loaded existing content hashes');
    return hashes;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to load existing hashes');
    return new Set();
  }
}

/**
 * Get or create source ID
 */
async function getOrCreateSource(db: any, source: RSSSource, countryCode: string): Promise<number> {
  try {
    // Try to find existing source
    const existing = db.prepare(
      'SELECT id FROM sources WHERE url = ?'
    ).get(source.url);
    
    if (existing) {
      return existing.id;
    }
    
    // Create new source
    const result = db.prepare(
      'INSERT INTO sources (name, url, country_code, category, active) VALUES (?, ?, ?, ?, 1)'
    ).run(source.name, source.url, countryCode, source.category);
    
    logger.info({ 
      name: source.name, 
      url: source.url, 
      id: result.lastInsertRowid 
    }, 'Created new source');
    
    return result.lastInsertRowid as number;
  } catch (error) {
    logger.error({ 
      source: source.name, 
      error: error instanceof Error ? error.message : String(error) 
    }, 'Failed to get or create source');
    throw error;
  }
}

/**
 * Store item in database
 */
async function storeItem(db: any, item: ItemInput): Promise<number> {
  try {
    const result = db.prepare(
      `INSERT INTO items (title, link, description, content, published_at, source_id, country_code, content_hash, sentiment, sentiment_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      item.title,
      item.link,
      item.description || null,
      item.content || null,
      item.published_at,
      item.source_id,
      item.country_code,
      item.content_hash,
      item.sentiment || null,
      item.sentiment_score || null
    );
    
    return result.lastInsertRowid as number;
  } catch (error) {
    // Check if it's a unique constraint violation (duplicate)
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      logger.debug({ link: item.link }, 'Item already exists, skipping');
      return 0;
    }
    
    throw error;
  }
}

/**
 * Store classification in database
 */
async function storeClassification(db: any, itemId: number, classification: ClassificationResult): Promise<void> {
  try {
    db.prepare(
      `INSERT INTO classifications (item_id, category, subcategory, confidence, keywords, summary)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      itemId,
      classification.category,
      classification.subcategory || null,
      classification.confidence_env,
      JSON.stringify(classification.keywords),
      classification.summary
    );
  } catch (error) {
    logger.error({ 
      itemId, 
      error: error instanceof Error ? error.message : String(error) 
    }, 'Failed to store classification');
    throw error;
  }
}

/**
 * Run the RSS fetch job
 */
export async function runJob(jobName: string): Promise<void> {
  logger.info({ jobName }, 'Starting job');
  
  const dbManager = getDatabaseManager();
  const db = dbManager.getDatabase();
  const startTime = new Date().toISOString();
  
  // Create job run record
  const jobRunId = await new Promise<number>((resolve, reject) => {
    db.run(
      'INSERT INTO job_runs (job_type, status, started_at) VALUES (?, ?, ?)',
      [jobName, 'running', startTime],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
  
  let itemsProcessed = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;
  let errorMessage: string | null = null;
  
  try {
    // Load RSS sources
    const sources = loadRSSSources();
    if (sources.length === 0) {
      throw new Error('No active RSS sources found');
    }
    
    logger.info({ sourceCount: sources.length }, 'Fetching RSS feeds');
    
    // Fetch all RSS feeds
    const urls = sources.map(s => s.url);
    const fetchResults = await fetchMultipleRSS(urls, JOB_CONFIG.fetchConcurrency);
    
    logger.info({ 
      fetched: fetchResults.size, 
      total: urls.length 
    }, 'RSS feeds fetched');
    
    // Parse feeds
    const allItems: any[] = [];
    for (const [url, result] of fetchResults) {
      try {
        const feed = await parseFeed(result.content, url);
        const validItems = filterValidItems(feed.items);
        const sortedItems = sortItemsByDate(validItems);
        const limitedItems = limitItems(sortedItems, JOB_CONFIG.maxItemsPerFeed);
        
        // Add source info to items
        const source = sources.find(s => s.url === url);
        if (source) {
          for (const item of limitedItems) {
            allItems.push({
              ...item,
              sourceName: source.name,
              sourceCategory: source.category,
              sourceLanguage: source.language,
            } as any);
          }
        }
      } catch (error) {
        logger.error({ 
          url, 
          error: error instanceof Error ? error.message : String(error) 
        }, 'Failed to parse feed');
      }
    }
    
    logger.info({ totalItems: allItems.length }, 'All feeds parsed');
    
    // Get existing hashes for deduplication
    const existingHashes = await getExistingHashes(db);
    
    // Deduplicate items
    const dedupResult = deduplicateItems(allItems, existingHashes);
    const uniqueItems = dedupResult.uniqueItems;
    
    logger.info({ 
      total: allItems.length,
      unique: uniqueItems.length,
      duplicates: dedupResult.duplicateCount 
    }, 'Deduplication completed');
    
    // Limit total items per run
    const itemsToProcess = limitItems(uniqueItems, JOB_CONFIG.maxItemsPerRun);
    
    logger.info({ itemsToProcess: itemsToProcess.length }, 'Items to process');
    
    // Get OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }
    
    // Prepare items for classification
    const classificationInputs: ClassificationInput[] = itemsToProcess.map(item => ({
      title: item.title,
      description: item.description,
      content: item.content,
      url: item.link,
    }));
    
    // Classify items
    logger.info({ count: classificationInputs.length }, 'Classifying items');
    const batchResult = await classifyBatch(
      classificationInputs,
      apiKey,
      JOB_CONFIG.classificationConcurrency
    );
    
    logger.info({ 
      classified: batchResult.results.length,
      errors: batchResult.errors.length 
    }, 'Classification completed');
    
    // Store items and classifications
    for (let i = 0; i < itemsToProcess.length; i++) {
      const item = itemsToProcess[i];
      const classification = batchResult.results[i];
      
      itemsProcessed++;
      
      // Skip if classification failed or below thresholds
      if (!classification || !meetsThresholds(classification)) {
        logger.debug({ 
          title: item.title,
          hasClassification: !!classification,
          meetsThresholds: classification ? meetsThresholds(classification) : false,
        }, 'Skipping item (classification failed or below thresholds)');
        continue;
      }
      
      // Get or create source
      const countryCode = (item.sourceLanguage || 'en') === 'en' ? 'us' : 'de'; // Simplified mapping
      const sourceId = await getOrCreateSource(db, {
        name: item.sourceName || 'Unknown',
        url: item.link,
        category: item.sourceCategory || 'general',
        language: item.sourceLanguage || 'en',
        active: true,
      }, countryCode);
      
      // Generate content hash
      const contentHash = item.link; // Simplified - should use proper hash
      
      // Store item
      const itemId = await storeItem(db, {
        title: item.title,
        link: item.link,
        description: item.description,
        content: item.content,
        published_at: item.pubDate || new Date().toISOString(),
        source_id: sourceId,
        country_code: countryCode,
        content_hash: contentHash,
        sentiment: classification.sentiment,
        sentiment_score: classification.confidence_sentiment,
      });
      
      if (itemId > 0) {
        itemsCreated++;
        
        // Store classification
        await storeClassification(db, itemId, classification);
      }
    }
    
    // Update job run status
    const completedAt = new Date().toISOString();
    db.prepare(
      `UPDATE job_runs 
       SET status = ?, completed_at = ?, items_processed = ?, items_created = ?, items_updated = ?
       WHERE id = ?`
    ).run('completed', completedAt, itemsProcessed, itemsCreated, itemsUpdated, jobRunId);
    
    logger.info({ 
      jobName,
      itemsProcessed,
      itemsCreated,
      itemsUpdated,
      duration: completedAt,
    }, 'Job completed successfully');
    
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    
    // Update job run status to failed
    const completedAt = new Date().toISOString();
    db.prepare(
      `UPDATE job_runs 
       SET status = ?, completed_at = ?, items_processed = ?, error_message = ?
       WHERE id = ?`
    ).run('failed', completedAt, itemsProcessed, errorMessage, jobRunId);
    
    logger.error({ 
      jobName, 
      error: errorMessage,
      itemsProcessed,
    }, 'Job failed');
    
    throw error;
  }
}

/**
 * Run a single RSS fetch (for testing)
 */
export async function runSingleFetch(url: string): Promise<any> {
  logger.info({ url }, 'Running single RSS fetch');
  
  const result = await fetchRSS(url);
  const feed = await parseFeed(result.content, url);
  const validItems = filterValidItems(feed.items);
  
  return {
    feed: {
      title: feed.title,
      description: feed.description,
      link: feed.link,
    },
    items: validItems,
  };
}
