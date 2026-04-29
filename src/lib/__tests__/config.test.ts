import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env to original state
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(originalEnv)) {
      process.env[key] = value;
    }
  });

  describe('validateConfig', () => {
    it('should pass with all required vars', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

      const { validateConfig, resetConfig } = await import('../config');
      resetConfig();
      expect(() => validateConfig()).not.toThrow();
    });

    it('should throw without DATABASE_URL', async () => {
      delete process.env.DATABASE_URL;
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

      const { validateConfig, resetConfig } = await import('../config');
      resetConfig();
      expect(() => validateConfig()).toThrow('DATABASE_URL is required');
    });

    it('should NOT throw without REDIS_URL (optional with fallback)', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      delete process.env.REDIS_URL;
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

      const { validateConfig, resetConfig } = await import('../config');
      resetConfig();
      expect(() => validateConfig()).not.toThrow();
    });

    it('should throw without ENCRYPTION_KEY', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.REDIS_URL = 'redis://localhost:6379';
      delete process.env.ENCRYPTION_KEY;

      const { validateConfig, resetConfig } = await import('../config');
      resetConfig();
      expect(() => validateConfig()).toThrow('ENCRYPTION_KEY is required');
    });

    it('should use JWT_SECRET for jwtSecret when both are set', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.ENCRYPTION_KEY = 'encryption-key-12345678901234567890';
      process.env.JWT_SECRET = 'jwt-secret-override-12345678901234567';

      const { validateConfig, resetConfig } = await import('../config');
      resetConfig();
      const config = validateConfig();
      expect(config.jwtSecret).toBe(process.env.JWT_SECRET);
    });
  });
});
