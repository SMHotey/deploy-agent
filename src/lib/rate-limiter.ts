import Redis from 'ioredis';

// Rate limiter configuration
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory store fallback
const memoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple in-memory rate limiter
 */
function memoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowMs;
  const maxRequests = config.maxRequests;
  
  let record = memoryStore.get(key);
  
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs,
    };
    memoryStore.set(key, record);
  }
  
  const remaining = Math.max(0, maxRequests - record.count);
  const success = record.count < maxRequests;
  
  if (success) {
    record.count++;
  }
  
  return {
    success,
    limit: maxRequests,
    remaining,
    reset: record.resetTime,
  };
}

/**
 * Invalidate memory store entry (for testing)
 */
export function invalidateMemoryRateLimit(key: string): void {
  memoryStore.delete(key);
}

/**
 * Creates a rate limiter using Redis (Upstash compatible)
 * Falls back to in-memory if Redis is not available
 */
export function createRateLimiter(redisUrl?: string, config?: Partial<RateLimitConfig>) {
  const defaultConfig: RateLimitConfig = {
    windowMs: 60000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    keyPrefix: 'rate_limit',
    ...config,
  };

  let redis: Redis | null = null;
  let useMemory = true;

  // Try to connect to Redis if URL is provided
  if (redisUrl) {
    try {
      redis = new Redis(redisUrl);
      redis.on('error', () => {
        console.warn('Redis unavailable, falling back to in-memory rate limiter');
        useMemory = true;
      });
      redis.on('connect', () => {
        useMemory = false;
        console.log('Using Redis for rate limiting');
      });
    } catch {
      useMemory = true;
    }
  }

  return {
    /**
     * Check rate limit for a key
     */
    async check(key: string): Promise<RateLimitResult> {
      if (useMemory || !redis) {
        return memoryRateLimit(`${defaultConfig.keyPrefix}:${key}`, defaultConfig);
      }

      const now = Date.now();
      const windowSec = Math.ceil(defaultConfig.windowMs / 1000);
      const redisKey = `${defaultConfig.keyPrefix}:${key}`;

      try {
        const result = await redis.multi()
          .incr(redisKey)
          .expire(redisKey, windowSec)
          .exec();

        const count = result?.[0]?.[1] as number || 0;
        const remaining = Math.max(0, defaultConfig.maxRequests - count);
        const success = count <= defaultConfig.maxRequests;

        return {
          success,
          limit: defaultConfig.maxRequests,
          remaining,
          reset: now + defaultConfig.windowMs,
        };
      } catch {
        return memoryRateLimit(redisKey, defaultConfig);
      }
    },

    /**
     * Middleware factory for API routes
     */
    middleware() {
      return async (request: Request): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> => {
        // Extract user ID or IP for rate limiting
        const userId = request.headers.get('x-user-id') || request.headers.get('x-forwarded-for') || 'anonymous';
        return this.check(userId);
      };
    },

    /**
     * Reset rate limit for a key
     */
    async reset(key: string): Promise<void> {
      if (!useMemory && redis) {
        const redisKey = `${defaultConfig.keyPrefix}:${key}`;
        await redis.del(redisKey);
      } else {
        invalidateMemoryRateLimit(`${defaultConfig.keyPrefix}:${key}`);
      }
    },

    /**
     * Cleanup (close Redis connection)
     */
    async cleanup(): Promise<void> {
      if (redis) {
        await redis.quit();
        redis = null;
      }
    },
  };
}

// Default rate limiter instance
let defaultRateLimiter: ReturnType<typeof createRateLimiter> | null = null;

export function initRateLimiter(redisUrl?: string): ReturnType<typeof createRateLimiter> {
  defaultRateLimiter = createRateLimiter(redisUrl);
  return defaultRateLimiter;
}

export function getRateLimiter(): ReturnType<typeof createRateLimiter> | null {
  return defaultRateLimiter;
}
