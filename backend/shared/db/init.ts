/**
 * Database initialization and migration logic
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { SCHEMA_SQL, INITIAL_DATA_SQL } from './schema.js';

export interface DatabaseConfig {
  path: string;
  readonly?: boolean;
}

export class DatabaseManager {
  private db: sqlite3.Database | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Initialize the database connection
   */
  connect(): sqlite3.Database {
    if (this.db) {
      return this.db;
    }

    // Ensure directory exists
    const dbDir = path.dirname(this.config.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const mode = this.config.readonly
      ? sqlite3.OPEN_READONLY
      : sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;

    this.db = new sqlite3.Database(this.config.path, mode);

    // Enable WAL mode for better concurrency
    this.db.exec('PRAGMA journal_mode = WAL;');

    // Enable foreign keys
    this.db.exec('PRAGMA foreign_keys = ON;');

    return this.db;
  }

  /**
   * Initialize database schema
   */
  initializeSchema(): void {
    const db = this.connect();

    // Execute schema creation
    db.exec(SCHEMA_SQL);

    // Insert initial data
    db.exec(INITIAL_DATA_SQL);
  }

  /**
   * Get database instance
   */
  getDatabase(): sqlite3.Database {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Check if database is healthy
   */
  healthCheck(): boolean {
    try {
      const db = this.getDatabase();
      return new Promise<boolean>((resolve) => {
        db.get('SELECT 1 as health', (err, row: { health: number }) => {
          if (err) {
            resolve(false);
            return;
          }
          resolve(row.health === 1);
        });
      }) as unknown as boolean;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get last job run timestamp
   */
  getLastFetchAt(): string | null {
    try {
      const db = this.getDatabase();
      return new Promise<string | null>((resolve) => {
        db.get(
          `
        SELECT started_at
        FROM job_runs
        WHERE status = 'completed'
        ORDER BY started_at DESC
        LIMIT 1
      `,
          (err, row: { started_at: string } | undefined) => {
            if (err) {
              resolve(null);
              return;
            }
            resolve(row?.started_at ?? null);
          }
        );
      }) as unknown as string | null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Run migrations (placeholder for future migrations)
   */
  async runMigrations(): Promise<void> {
    // Future migration logic can be added here
    // For now, schema is initialized in initializeSchema()
  }
}

/**
 * Create a singleton database manager instance
 */
let dbManager: DatabaseManager | null = null;

export function getDatabaseManager(config?: DatabaseConfig): DatabaseManager {
  if (!dbManager) {
    if (!config) {
      throw new Error('Database config required for first initialization');
    }
    dbManager = new DatabaseManager(config);
  }
  return dbManager;
}

export function closeDatabase(): void {
  if (dbManager) {
    dbManager.close();
    dbManager = null;
  }
}
