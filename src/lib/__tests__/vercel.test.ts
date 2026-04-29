import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createVercelClient } from '../vercel';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('vercel client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('createVercelClient', () => {
    it('should create client with token', () => {
      const client = createVercelClient('test-token');
      expect(client).toBeDefined();
      expect(client.getCurrentUser).toBeDefined();
      expect(client.createDeployment).toBeDefined();
    });

    it('should create client with team ID', () => {
      const client = createVercelClient('test-token', 'team_123');
      expect(client).toBeDefined();
    });
  });

  describe('createDeployment', () => {
    it('should create production deployment', async () => {
      const client = createVercelClient('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          deployment: {
            uid: 'dep_123',
            name: 'my-project',
            url: 'https://my-project.vercel.app',
            publicUrl: 'https://my-project.vercel.app',
            state: 'BUILDING',
            created: Date.now(),
          },
        }),
      });

      const result = await client.createDeployment({
        repoUrl: 'https://github.com/org/repo',
        projectName: 'my-project',
        branch: 'main',
        target: 'production',
      });

      expect(result.uid).toBe('dep_123');
      expect(result.url).toBe('https://my-project.vercel.app');

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.name).toBe('my-project');
      expect(body.target).toBe('production');
      expect(body.repo.repo).toBe('org/repo');
    });

    it('should create preview deployment with correct naming', async () => {
      const client = createVercelClient('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          deployment: {
            uid: 'dep_preview_456',
            name: 'my-project-pr-42',
            url: 'https://my-project-pr-42.vercel.app',
            publicUrl: 'https://my-project-pr-42.vercel.app',
            state: 'BUILDING',
            created: Date.now(),
          },
        }),
      });

      const result = await client.createDeployment({
        repoUrl: 'https://github.com/org/repo',
        projectName: 'my-project',
        branch: 'feature-branch',
        isPreview: true,
        prNumber: 42,
      });

      expect(result.uid).toBe('dep_preview_456');

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.name).toBe('my-project-pr-42');
      expect(body.target).toBe('preview');
      expect(body.gitSource.prNumber).toBe(42);
    });

    it('should use development target when specified', async () => {
      const client = createVercelClient('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          deployment: {
            uid: 'dep_dev_789',
            name: 'my-project',
            url: 'https://my-project-dev.vercel.app',
            publicUrl: 'https://my-project-dev.vercel.app',
            state: 'BUILDING',
            created: Date.now(),
          },
        }),
      });

      await client.createDeployment({
        repoUrl: 'https://github.com/org/repo',
        projectName: 'my-project',
        target: 'development',
      });

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.target).toBe('development');
    });

    it('should reject invalid GitHub repo URL', async () => {
      const client = createVercelClient('test-token');

      await expect(
        client.createDeployment({
          repoUrl: 'https://gitlab.com/org/repo',
          projectName: 'my-project',
        })
      ).rejects.toThrow('Invalid GitHub repository URL');
    });

    it('should include environment variables in deployment', async () => {
      const client = createVercelClient('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          deployment: {
            uid: 'dep_env_123',
            name: 'my-project',
            url: 'https://my-project.vercel.app',
            publicUrl: 'https://my-project.vercel.app',
            state: 'BUILDING',
            created: Date.now(),
          },
        }),
      });

      await client.createDeployment({
        repoUrl: 'https://github.com/org/repo',
        projectName: 'my-project',
        env: { API_KEY: 'secret', DEBUG: 'true' },
      });

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.env).toHaveLength(2);
      expect(body.env[0]).toEqual({ key: 'API_KEY', value: 'secret' });
      expect(body.env[1]).toEqual({ key: 'DEBUG', value: 'true' });
    });
  });

  describe('project operations', () => {
    it('should get current user', async () => {
      const client = createVercelClient('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: { uid: 'user_123', email: 'test@example.com', name: 'Test' },
        }),
      });

      const result = await client.getCurrentUser();
      expect(result.user.uid).toBe('user_123');
    });

    it('should get projects', async () => {
      const client = createVercelClient('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          projects: [{ id: 'proj_1', name: 'my-app', accountId: 'team_1' }],
        }),
      });

      const result = await client.getProjects();
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].name).toBe('my-app');
    });

    it('should include teamId in query when provided', async () => {
      const client = createVercelClient('test-token', 'team_123');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ projects: [] }),
      });

      await client.getProjects();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('teamId=team_123'),
        expect.any(Object)
      );
    });

    it('should create or update project', async () => {
      const client = createVercelClient('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'proj_1',
          name: 'new-project',
          accountId: 'user_1',
        }),
      });

      const result = await client.createOrUpdateProject('new-project', {
        framework: 'nextjs',
        rootDirectory: 'apps/web',
      });

      expect(result.name).toBe('new-project');

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.name).toBe('new-project');
      expect(body.framework).toBe('nextjs');
      expect(body.rootDirectory).toBe('apps/web');
    });
  });

  describe('error handling', () => {
    it('should throw on API error', async () => {
      const client = createVercelClient('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(client.getCurrentUser()).rejects.toThrow(
        'Vercel API error 401: Unauthorized'
      );
    });
  });
});
