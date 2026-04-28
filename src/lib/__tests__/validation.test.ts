import { parseDeployParams, parseGitHubWebhook, parseVercelWebhook } from '../validation';

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
});
