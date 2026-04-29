import Redis from 'ioredis';

// In-memory store with TTL tracking
const memoryStore = new Map<string, number>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Clean up expired entries from in-memory store
 */
function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, expiresAt] of memoryStore.entries()) {
    if (now > expiresAt) {
      memoryStore.delete(key);
    }
  }
}

// Run cleanup every hour
let cleanupInterval: ReturnType<typeof setInterval> | null = null;
function ensureCleanup(): void {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(cleanupExpired, 60 * 60 * 1000);
    cleanupInterval.unref();
  }
}

let redis: Redis | null = null;
let useRedis = false;

function tryConnectRedis(url: string): void {
  try {
    const client = new Redis(url);
    client.on('error', () => {
      useRedis = false;
    });
    client.on('connect', () => {
      useRedis = true;
      redis = client;
    });
  } catch {
    useRedis = false;
  }
}

/**
 * Check if an idempotency key has already been processed.
 * Uses Redis with in-memory fallback. Keys expire after 24h.
 */
export async function isAlreadyProcessed(key: string): Promise<boolean> {
  ensureCleanup();

  if (useRedis && redis) {
    try {
      const exists = await redis.exists(`idempotency:${key}`);
      return exists === 1;
    } catch {
      // Fall through to memory check
    }
  }

  const expiresAt = memoryStore.get(key);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    memoryStore.delete(key);
    return false;
  }
  return true;
}

/**
 * Mark an idempotency key as processed.
 */
export async function markProcessed(key: string): Promise<void> {
  ensureCleanup();

  if (useRedis && redis) {
    try {
      await redis.set(`idempotency:${key}`, '1', 'EX', 86400); // 24h TTL
      return;
    } catch {
      // Fall through to memory store
    }
  }

  memoryStore.set(key, Date.now() + TTL_MS);
}

/**
 * Initialize the idempotency store with Redis URL.
 * Call once at startup.
 */
export function initIdempotency(redisUrl?: string): void {
  if (redisUrl) {
    tryConnectRedis(redisUrl);
  }
}

/**
 * Cleanup resources (for shutdown)
 */
export async function cleanupIdempotency(): Promise<void> {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  if (redis) {
    await redis.quit();
    redis = null;
    useRedis = false;
  }
}
