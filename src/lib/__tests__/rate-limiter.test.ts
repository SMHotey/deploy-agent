import { describe, it, expect, beforeEach } from 'vitest';
import { initRateLimiter, getRateLimiter } from '../rate-limiter';

describe('rate-limiter', () => {
  beforeEach(() => {
    initRateLimiter(undefined);
  });

  it('should allow requests within limit', async () => {
    const limiter = getRateLimiter();
    expect(limiter).toBeDefined();

    for (let i = 0; i < 10; i++) {
      const result = await limiter!.check(`test-key-${i}`);
      expect(result.success).toBe(true);
    }
  });

  it('should block requests exceeding limit', async () => {
    const limiter = getRateLimiter();
    const key = 'test-limit-key';

    for (let i = 0; i < 10; i++) {
      await limiter!.check(key);
    }

    const result = await limiter!.check(key);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

    it('should reset rate limit', async () => {
      const limiter = getRateLimiter();
      const key = 'test-reset-key';

      for (let i = 0; i < 11; i++) {
        await limiter!.check(key);
      }

      let result = await limiter!.check(key);
      expect(result.success).toBe(false);

      // Use limiter.reset which handles the key prefix internally
      await limiter!.reset(key);
      result = await limiter!.check(key);
      expect(result.success).toBe(true);
    });

  it('should return correct rate limit info', async () => {
    const limiter = getRateLimiter();
    const key = 'test-info-key';

    const result = await limiter!.check(key);

    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(10); // First call: 10 - 0 = 10 remaining
    expect(result.reset).toBeGreaterThan(Date.now());
  });
});
