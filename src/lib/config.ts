import { Pool } from 'pg';

interface Config {
  databaseUrl: string;
  redisUrl: string;
  encryptionKey: string;
  jwtSecret: string;
  vercelToken?: string;
  githubToken?: string;
  port: number;
  nodeEnv: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

// For testing - allow reset
export function resetConfig() {
  validatedConfig = null;
}

let validatedConfig: Config | null = null;

export function validateConfig(): Config {
  if (validatedConfig) return validatedConfig!;

  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const jwtSecret = process.env.JWT_SECRET || encryptionKey; // Fallback to encryption key

  const errors: string[] = [];

  if (!databaseUrl) {
    errors.push('DATABASE_URL is required (PostgreSQL connection string)');
  }

  if (!redisUrl) {
    console.warn('REDIS_URL not set — rate limiter will use in-memory fallback');
  }

  if (!encryptionKey) {
    errors.push('ENCRYPTION_KEY is required (32+ character string for AES-256-GCM)');
  } else if (encryptionKey.length < 32) {
    errors.push(`ENCRYPTION_KEY must be at least 32 characters (current: ${encryptionKey.length})`);
  }

  if (!jwtSecret) {
    errors.push('JWT_SECRET is required (can fallback to ENCRYPTION_KEY)');
  }

  if (errors.length > 0) {
    const message = `Configuration errors:\n  ${errors.join('\n  ')}`;
    console.error(message);
    throw new Error(message);
  }

  validatedConfig = {
    databaseUrl: databaseUrl!,
    redisUrl: redisUrl || '',
    encryptionKey: encryptionKey!,
    jwtSecret: jwtSecret!,
    vercelToken: process.env.VERCEL_TOKEN,
    githubToken: process.env.GITHUB_TOKEN,
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
  };

  console.log('Configuration validated successfully', {
    nodeEnv: validatedConfig!.nodeEnv,
    port: validatedConfig!.port,
    databaseUrl: validatedConfig!.databaseUrl.replace(/\/\/.*@/, '//***@'), // redact credentials
    redisConfigured: !!validatedConfig!.redisUrl,
  });

  return validatedConfig!;
}

/**
 * Validate database connectivity
 */
export async function validateDatabase(config: Config): Promise<void> {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    await pool.query('SELECT 1');
    console.log('Database connection verified');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await pool.end();
  }
}

/**
 * Validate Redis connectivity (optional)
 */
export async function validateRedis(config: Config): Promise<boolean> {
  if (!config.redisUrl) return false;

  try {
    const Redis = require('ioredis');
    const redis = new Redis(config.redisUrl, { connectTimeout: 5000 });
    await redis.ping();
    redis.disconnect();
    console.log('Redis connection verified');
    return true;
  } catch (error) {
    console.warn('Redis connection failed (will use in-memory fallback):', error);
    return false;
  }
}
