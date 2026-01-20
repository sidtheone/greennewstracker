/**
 * Environment configuration for the API
 */

interface ApiConfig {
  host: string;
  port: number;
  version: string;
}

interface DatabaseConfig {
  path: string;
}

interface CorsConfig {
  origin: string | string[];
}

interface Config {
  api: ApiConfig;
  database: DatabaseConfig;
  cors: CorsConfig;
}

/**
 * Load configuration from environment variables
 */
export const config: Config = {
  api: {
    host: process.env.API_HOST || '0.0.0.0',
    port: parseInt(process.env.API_PORT || '3000', 10),
    version: process.env.API_VERSION || '1.0.0',
  },
  database: {
    path: process.env.DATABASE_PATH || './data/greennewstracker.db',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};

export default config;
