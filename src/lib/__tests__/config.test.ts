import { describe, it, expect, beforeEach } from 'vitest';
import { resetConfig } from '../config';

describe('config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
  });

  describe('validateConfig', () => {
    it('should pass with all required vars', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

      const { validateConfig } = require('../config');
      expect(() => validateConfig()).not.toThrow();
    });

    it('should throw without DATABASE_URL', () => {
      delete process.env.DATABASE_URL;
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

      const { validateConfig } = require('../config');
      expect(() => validateConfig()).toThrow('DATABASE_URL is required');
    });

    it('should NOT throw without REDIS_URL (optional with fallback)', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      delete process.env.REDIS_URL;
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

      const { validateConfig } = require('../config');
      expect(() => validateConfig()).not.toThrow();
    });

    it('should throw without ENCRYPTION_KEY', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.REDIS_URL = 'redis://localhost:6379';
      delete process.env.ENCRYPTION_KEY;

      const { validateConfig } = require('../config');
      expect(() => validateConfig()).toThrow('ENCRYPTION_KEY is required');
    });

    it('should use JWT_SECRET fallback for ENCRYPTION_KEY', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.JWT_SECRET = '12345678901234567890123456789012';
      delete process.env.ENCRYPTION_KEY;

      const { validateConfig } = require('../config');
      const config = validateConfig();
      expect(config.encryptionKey).toBe(process.env.JWT_SECRET);
    });
  });
});
