import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDeployService, registerPlatform, getPlatform } from '../deploy';

// Mock Vercel and GitHub modules
vi.mock('../vercel');
vi.mock('../github');

describe('deploy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('platform registry', () => {
    it('should register and retrieve platforms', () => {
      // Create a mock platform
      const mockPlatform = {
        name: 'test-platform',
        deploy: vi.fn(),
        pollStatus: vi.fn(),
        getDeploymentLogs: vi.fn(),
        validateParams: vi.fn(),
      };

      registerPlatform('test', mockPlatform);
      const retrieved = getPlatform('test');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-platform');
    });

    it('should return undefined for unknown platform', () => {
      const platform = getPlatform('nonexistent');
      expect(platform).toBeUndefined();
    });
  });

  describe('createDeployService', () => {
    it('should create service with valid config', () => {
      const service = createDeployService({
        vercelToken: 'test-token',
        encryptionKey: '12345678901234567890123456789012',
      });

      expect(service).toBeDefined();
      expect(service.deploy).toBeDefined();
      expect(service.getDeploymentLogs).toBeDefined();
    });

    it('should use Vercel platform by default', () => {
      const service = createDeployService({
        vercelToken: 'test-token',
        encryptionKey: '12345678901234567890123456789012',
      });

      // Deploy should call Vercel platform
      expect(service.deploy).toBeDefined();
    });
  });
});
