/**
 * Database schema for GreenNewsTracker
 * SQLite database with tables: countries, sources, items, classifications, job_runs
 */

export const SCHEMA_SQL = `
-- Countries table: Supported countries for news tracking
CREATE TABLE IF NOT EXISTS countries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sources table: RSS/news sources
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  country_code TEXT NOT NULL,
  category TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (country_code) REFERENCES countries(code) ON DELETE CASCADE
);

-- Items table: News articles
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  link TEXT NOT NULL UNIQUE,
  description TEXT,
  content TEXT,
  published_at TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  country_code TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  sentiment TEXT,
  sentiment_score REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
  FOREIGN KEY (country_code) REFERENCES countries(code) ON DELETE CASCADE
);

-- Classifications table: AI classifications for news items
CREATE TABLE IF NOT EXISTS classifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL UNIQUE,
  category TEXT NOT NULL,
  subcategory TEXT,
  confidence REAL NOT NULL,
  keywords TEXT,
  summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Job runs table: Track data fetch jobs
CREATE TABLE IF NOT EXISTS job_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  items_processed INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  error_message TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_items_published_at ON items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_country_code ON items(country_code);
CREATE INDEX IF NOT EXISTS idx_items_source_id ON items(source_id);
CREATE INDEX IF NOT EXISTS idx_items_sentiment ON items(sentiment);
CREATE INDEX IF NOT EXISTS idx_items_content_hash ON items(content_hash);
CREATE INDEX IF NOT EXISTS idx_classifications_item_id ON classifications(item_id);
CREATE INDEX IF NOT EXISTS idx_classifications_category ON classifications(category);
CREATE INDEX IF NOT EXISTS idx_job_runs_started_at ON job_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_runs_status ON job_runs(status);
`;

export const INITIAL_DATA_SQL = `
-- Insert default countries
INSERT OR IGNORE INTO countries (code, name, language) VALUES
  ('de', 'Germany', 'de'),
  ('at', 'Austria', 'de'),
  ('ch', 'Switzerland', 'de'),
  ('us', 'United States', 'en'),
  ('gb', 'United Kingdom', 'en'),
  ('fr', 'France', 'fr'),
  ('es', 'Spain', 'es'),
  ('it', 'Italy', 'it'),
  ('nl', 'Netherlands', 'nl'),
  ('pl', 'Poland', 'pl');
`;

export const TABLES = {
  COUNTRIES: 'countries',
  SOURCES: 'sources',
  ITEMS: 'items',
  CLASSIFICATIONS: 'classifications',
  JOB_RUNS: 'job_runs',
} as const;

export type TableName = typeof TABLES[keyof typeof TABLES];
