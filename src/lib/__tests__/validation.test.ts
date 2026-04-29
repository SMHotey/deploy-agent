import { parseDeployParams, parseGitHubWebhook, parseVercelWebhook, deployResponseSchema } from '../validation';

describe('validation', () => {
  describe('parseDeployParams', () => {
    it('should parse valid deploy params', () => {
      const input = {
        repo_url: 'https://github.com/user/repo',
        project_name: 'my-project',
        target_platform: 'vercel',
        environment_variables: { API_KEY: '123' },
      };

      const result = parseDeployParams(input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.repo_url).toBe('https://github.com/user/repo');
      expect(result.data?.project_name).toBe('my-project');
      expect(result.data?.target_platform).toBe('vercel');
    });

    it('should fail on invalid repo_url', () => {
      const input = {
        repo_url: 'not-a-url',
      };

      const result = parseDeployParams(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should use defaults for optional fields', () => {
      const input = {
        repo_url: 'https://github.com/user/repo',
      };

      const result = parseDeployParams(input);

      expect(result.success).toBe(true);
      expect(result.data?.target_platform).toBe('vercel');
      expect(result.data?.branch).toBe('main');
    });

    it('should validate target_platform enum', () => {
      const input = {
        repo_url: 'https://github.com/user/repo',
        target_platform: 'invalid-platform',
      };

      const result = parseDeployParams(input);

      expect(result.success).toBe(false);
    });

    it('should accept environment_slug: production', () => {
      const input = {
        repo_url: 'https://github.com/user/repo',
        environment_slug: 'production',
      };

      const result = parseDeployParams(input);

      expect(result.success).toBe(true);
      expect(result.data?.environment_slug).toBe('production');
    });

    it('should accept environment_slug: preview', () => {
      const input = {
        repo_url: 'https://github.com/user/repo',
        environment_slug: 'preview',
      };

      const result = parseDeployParams(input);

      expect(result.success).toBe(true);
      expect(result.data?.environment_slug).toBe('preview');
    });

    it('should accept environment_slug: development', () => {
      const input = {
        repo_url: 'https://github.com/user/repo',
        environment_slug: 'development',
      };

      const result = parseDeployParams(input);

      expect(result.success).toBe(true);
      expect(result.data?.environment_slug).toBe('development');
    });

    it('should reject invalid environment_slug', () => {
      const input = {
        repo_url: 'https://github.com/user/repo',
        environment_slug: 'staging',
      };

      const result = parseDeployParams(input);

      expect(result.success).toBe(false);
    });

    it('should default environment_slug to production', () => {
      const input = {
        repo_url: 'https://github.com/user/repo',
      };

      const result = parseDeployParams(input);

      expect(result.success).toBe(true);
      expect(result.data?.environment_slug).toBe('production');
    });

    it('should accept all platform types', () => {
      const platforms = ['vercel', 'netlify', 'cloudflare-pages', 'railway', 'self-hosted-docker'];

      for (const platform of platforms) {
        const input = {
          repo_url: 'https://github.com/user/repo',
          target_platform: platform,
        };

        const result = parseDeployParams(input);
        expect(result.success).toBe(true);
        expect(result.data?.target_platform).toBe(platform);
      }
    });
  });

  describe('parseGitHubWebhook', () => {
    it('should parse valid GitHub webhook', () => {
      const input = {
        ref: 'refs/heads/main',
        repository: { full_name: 'user/repo' },
        after: 'abc123',
      };

      const result = parseGitHubWebhook(input);

      expect(result.success).toBe(true);
      expect(result.data?.ref).toBe('refs/heads/main');
      expect(result.data?.repository?.full_name).toBe('user/repo');
    });
  });

  describe('parseVercelWebhook', () => {
    it('should parse valid Vercel webhook', () => {
      const input = {
        type: 'deployment',
        payload: {
          deployment: { id: 'dep_123', url: 'https://app.vercel.app' },
        },
      };

      const result = parseVercelWebhook(input);

      expect(result.success).toBe(true);
      expect(result.data?.type).toBe('deployment');
    });
  });

  describe('deployResponseSchema', () => {
    it('should accept response with preview fields', () => {
      const input = {
        deployment_id: 'dep_123',
        status: 'ready',
        url: 'https://app.vercel.app',
        preview_url: 'https://pr-42-app.vercel.app',
        is_preview: true,
        logs_url: 'https://vercel.com/deployments/dep_123',
      };

      const result = deployResponseSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept minimal response without preview fields', () => {
      const input = {
        deployment_id: 'dep_123',
        status: 'building',
      };

      const result = deployResponseSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
