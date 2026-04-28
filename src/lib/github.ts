import { withRetry, type RetryOptions } from './retry';

export interface GitHubConfig {
  token: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  defaultBranch: string;
}

export interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
}

export interface GitHubContent {
  name: string;
  path: string;
  type: string;
  content?: string;
  sha?: string;
}

export interface CreateWorkflowOptions {
  name: string;
  onPushBranches?: string[];
  excludeAuthors?: string[];
  setupPreview?: boolean;
  vercelToken?: string;
  deployHookUrl?: string;
}

/**
 * GitHub API client
 */
export class GitHubClient {
  private token: string;
  private baseUrl = 'https://api.github.com';

  constructor(config: GitHubConfig) {
    this.token = config.token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: { retry?: Partial<RetryOptions>; isRaw?: boolean } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': options.isRaw ? 'application/vnd.github.v3+json' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    const fetchFn = async () => {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.text();
        const status = response.status;
        throw new Error(`GitHub API error ${status}: ${error}`);
      }

      if (options.isRaw || response.status === 204) {
        return response.text();
      }

      return response.json();
    };

    const result = await withRetry(fetchFn, {
      ...options.retry,
      maxRetries: 3,
      initialDelayMs: 1000,
    });

    if (!result.success) {
      throw result.error;
    }

    return result.data as T;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<{ login: string; id: number; email: string }> {
    return this.request('GET', '/user');
  }

  /**
   * Get repository info
   */
  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    return this.request('GET', `/repos/${owner}/${repo}`);
  }

  /**
   * Get file content
   */
  async getContent(owner: string, repo: string, path: string): Promise<GitHubContent | GitHubContent[]> {
    const content = await this.request<GitHubContent | GitHubContent[]>(
      'GET',
      `/repos/${owner}/${repo}/contents/${path}`
    );
    // Decode base64 content if present
    if ('content' in content && content.content) {
      content.content = Buffer.from(content.content, 'base64').toString('utf8');
    }
    return content;
  }

  /**
   * Check if file exists
   */
  async fileExists(owner: string, repo: string, path: string): Promise<boolean> {
    try {
      await this.request('GET', `/repos/${owner}/${repo}/contents/${path}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create or update file
   */
  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string
  ): Promise<{ content: { path: string; sha: string } } | { commit: { sha: string } }> {
    const body = {
      message,
      content: Buffer.from(content).toString('base64'),
      ...(sha && { sha }),
    };

    return this.request('PUT', `/repos/${owner}/${repo}/contents/${path}`, body);
  }

  /**
   * Delete file
   */
  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string
  ): Promise<{ commit: { sha: string } }> {
    return this.request('DELETE', `/repos/${owner}/${repo}/contents/${path}`, {
      message,
      sha,
    });
  }

  /**
   * Get workflow runs
   */
  async getWorkflowRuns(
    owner: string,
    repo: string,
    workflowId: string,
    perPage: number = 5
  ): Promise<{
    workflow_runs: Array<{
      id: number;
      status: string;
      conclusion: string;
      head_sha: string;
      head_branch: string;
    }>;
  }> {
    return this.request(
      'GET',
      `/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=${perPage}`
    );
  }

  /**
   * Get workflows
   */
  async getWorkflows(owner: string, repo: string): Promise<{ workflows: GitHubWorkflow[] }> {
    return this.request('GET', `/repos/${owner}/${repo}/actions/workflows`);
  }

  /**
   * Create deploy workflow
   */
  async createDeployWorkflow(
    owner: string,
    repo: string,
    options: CreateWorkflowOptions
  ): Promise<{ content: { path: string; sha: string } }> {
    const branches = options.onPushBranches || ['main', 'master'];
    const excludeAuthors = options.excludeAuthors || [];

    const workflow = `name: Deploy

on:
  push:
    branches: [${branches.map((b) => `'${b}'`).join(', ')}]
${options.setupPreview ? `  pull_request:
    branches: [${branches.map((b) => `'${b}'`).join(', ')}]` : ''}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
${excludeAuthors.length > 0 ? `      - name: Check author
        if: contains(['${excludeAuthors.join("', '")}'], github.actor)
        run: exit 0` : ''}
      - name: Deploy to Vercel
        if: success()
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: \${'$'}{{ secrets.VERCEL_TOKEN }}
          github-token: \${'$'}{{ secrets.GITHUB_TOKEN }}
          vercel-org-id: \${'$'}{{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${'$'}{{ secrets.VERCEL_PROJECT_ID }}
${options.deployHookUrl ? `      - name: Trigger Deploy Hook
        if: success()
        run: curl -X POST ${options.deployHookUrl}` : ''}

permissions:
  contents: read
`;

    const path = '.github/workflows/deploy.yml';
    
    // Check if file exists first
    let sha: string | undefined;
    try {
      const existing = await this.request<GitHubContent>(
        'GET',
        `/repos/${owner}/${repo}/contents/${path}`
      );
      sha = existing.sha;
    } catch {
      // File doesn't exist, that's ok
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _workflowResult = await this.createOrUpdateFile(owner, repo, path, workflow, `Add deploy workflow`, sha);
    return { content: { path, sha: sha || '' } };
  }

  /**
   * Delete deploy workflow
   */
  async deleteDeployWorkflow(owner: string, repo: string): Promise<void> {
    const path = '.github/workflows/deploy.yml';
    const content = await this.request<GitHubContent>('GET', `/repos/${owner}/${repo}/contents/${path}`);
    if (content.sha) {
      await this.deleteFile(owner, repo, path, 'Remove deploy workflow', content.sha);
    }
  }

  /**
   * Get repository secrets
   */
  async getRepoSecrets(owner: string, repo: string): Promise<{ secrets: Array<{ name: string }> }> {
    return this.request('GET', `/repos/${owner}/${repo}/actions/secrets`);
  }

  /**
   * Get public key for secrets
   */
  async getRepoPublicKey(owner: string, repo: string): Promise<{ key: string; key_id: string }> {
    return this.request('GET', `/repos/${owner}/${repo}/actions/secrets/public-key`);
  }

  /**
   * Create or update repository secret
   */
  async createOrUpdateSecret(
    owner: string,
    repo: string,
    keyName: string,
    value: string,
    keyId: string,
    publicKey: string
  ): Promise<{ status: number }> {
    // Encrypt the secret
    const encoder = new TextEncoder();
    const publicKeyData = Buffer.from(publicKey, 'base64');
    const valueData = encoder.encode(value);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      await crypto.subtle.importKey(
        'spki',
        publicKeyData,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
      ),
      valueData
    );

    return this.request('PUT', `/repos/${owner}/${repo}/actions/secrets/${keyName}`, {
      encrypted_value: Buffer.from(encrypted).toString('base64'),
      key_id: keyId,
    });
  }
}

/**
 * Factory to create GitHub client
 */
export function createGitHubClient(token: string): GitHubClient {
  return new GitHubClient({ token });
}