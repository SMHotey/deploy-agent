import { withRetry, RetryResult } from '../retry';
import { vi } from 'vitest';

describe('retry', () => {
  it('should return success on first try', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    
    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    // Use a shouldRetry that always returns true for testing
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('success');
    
    const result = await withRetry(fn, { 
      maxRetries: 3, 
      initialDelayMs: 10,
      shouldRetry: () => true 
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    const result = await withRetry(fn, { 
      maxRetries: 2, 
      initialDelayMs: 10,
      shouldRetry: () => true 
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.attempts).toBe(3); // initial + 2 retries
  });

  it('should respect retry condition', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('bad error'));
    const shouldRetry = vi.fn().mockReturnValue(false); // never retry
    
    const result = await withRetry(fn, { 
      maxRetries: 3, 
      initialDelayMs: 10,
      shouldRetry
    });
    
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1); // no retries
    expect(shouldRetry).toHaveBeenCalled();
  });

  it('should use exponential backoff', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValue('success');
    
    const start = Date.now();
    await withRetry(fn, { 
      maxRetries: 1, 
      initialDelayMs: 100,
      shouldRetry: () => true 
    });
    const duration = Date.now() - start;
    
    // Should have waited at least initialDelayMs
    expect(duration).toBeGreaterThanOrEqual(90); // slight tolerance
  });
});
