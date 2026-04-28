import { withRetry, type RetryOptions } from './retry';

export interface VercelConfig {
  token: string;
  teamId?: string;
}

export interface VercelProject {
  name: string;
  framework?: string;
  rootDirectory?: string;
  buildCommand?: string;
  installCommand?: string;
  devCommand?: string;
  outputDirectory?: string;
}

export interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  publicUrl: string;
  state: string;
  created: number;
  ready?: number;
  builds?: VercelBuild[];
  commitSha?: string;
  commitMessage?: string;
  authorLogin?: string;
}

export interface VercelBuild {
  use: string;
  src: string;
  diff?: string;
  error?: string;
  state: 'READY' | 'ERROR' | 'BUILDING' | 'SKIPPED';
}

export interface VercelDeployHook {
  uid: string;
  name: string;
  url: string;
  ref: string;
  createdAt?: number;
}

export interface VercelProjectResponse {
  id: string;
  name: string;
  accountId: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface CreateDeploymentOptions {
  repoUrl: string;
  projectName: string;
  branch?: string;
  rootDirectory?: string;
  framework?: string;
  buildCommand?: string;
  installCommand?: string;
  devCommand?: string;
  outputDirectory?: string;
  env?: Record<string, string>;
  teamId?: string;
}

/**
 * Vercel API client
 */
export class VercelClient {
  private token: string;
  private teamId?: string;
  private baseUrl = 'https://api.vercel.com';

  constructor(config: VercelConfig) {
    this.token = config.token;
    this.teamId = config.teamId;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retryOptions: Partial<RetryOptions> = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };

    if (this.teamId) {
      headers['X-Vercel-Team-Id'] = this.teamId;
    }

    const fetchFn = async (signal?: AbortSignal) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: signal || controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const error = await response.text();
          const status = response.status;
          throw new Error(`Vercel API error ${status}: ${error}`);
        }
        
        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('Vercel API request timeout after 30s');
        }
        throw error;
      }
    };

    const result = await withRetry(fetchFn, {
      ...retryOptions,
      maxRetries: 3,
      initialDelayMs: 1000,
    });

    if (!result.success) {
      throw result.error;
    }

    return result.data as T;
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<{ user: { uid: string; email: string; name: string } }> {
    return this.request('GET', '/v6/user');
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<{ projects: VercelProjectResponse[] }> {
    const query = this.teamId ? `?teamId=${this.teamId}` : '';
    return this.request('GET', `/v6/projects${query}`);
  }

  /**
   * Get a specific project
   */
  async getProject(name: string): Promise<VercelProjectResponse> {
    const query = this.teamId ? `?teamId=${this.teamId}` : '';
    return this.request('GET', `/v6/projects/${encodeURIComponent(name)}${query}`);
  }

  /**
   * Create or update a project
   */
  async createOrUpdateProject(name: string, project: Partial<VercelProject>): Promise<VercelProjectResponse> {
    const query = this.teamId ? `?teamId=${this.teamId}` : '';
    return this.request('POST', `/v6/projects${query}`, {
      name,
      ...project,
      framework: project.framework || 'other',
    });
  }

  /**
   * Create a new deployment
   */
  async createDeployment(options: CreateDeploymentOptions): Promise<VercelDeployment> {
    const { 
      repoUrl, 
      projectName, 
      branch = 'main', 
      rootDirectory, 
      buildCommand,
      installCommand,
      devCommand,
      outputDirectory,
      env, 
      teamId 
    } = options;
    
    // Parse GitHub repo URL
    const match = repoUrl.match(/github\.com[/:]([^/]+)[/]([^/]+?)(?:\.git)?$/);
    if (!match) {
      throw new Error('Invalid GitHub repository URL');
    }

    const [_, org, repo] = match;
    const gitRef = branch || 'main';

    const query = teamId ? `?teamId=${teamId}` : '';
    
    const deployment = await this.request<{ deployment: VercelDeployment }>(
      'POST',
      `/v1/deployments${query}`,
      {
        name: projectName,
        ref: gitRef,
        repo: {
          type: 'github',
          repo: `${org}/${repo}`,
          rootDirectory: rootDirectory || '/',
        },
        ...(buildCommand && { buildCommand }),
        ...(installCommand && { installCommand }),
        ...(devCommand && { devCommand }),
        ...(outputDirectory && { outputDirectory }),
        ...(env && { env: Object.entries(env).map(([key, value]) => ({ key, value })) }),
      }
    );

    return deployment.deployment;
  }

  /**
   * Get deployment status
   */
  async getDeployment(deploymentUid: string): Promise<VercelDeployment> {
    return this.request('GET', `/v6/deployments/${deploymentUid}`);
  }

  /**
   * Get deployments for a project
   */
  async getDeployments(projectName: string): Promise<{ deployments: VercelDeployment[] }> {
    const query = this.teamId ? `?teamId=${this.teamId}` : '';
    return this.request('GET', `/v4/deployments${query}&project=${projectName}`);
  }

  /**
   * Cancel a deployment
   */
  async cancelDeployment(deploymentUid: string): Promise<{ status: string }> {
    return this.request('PATCH', `/v1/deployments/${deploymentUid}/cancel`);
  }

  /**
   * Create a deploy hook
   */
  async createDeployHook(name: string, ref?: string): Promise<{ hook: VercelDeployHook }> {
    const query = this.teamId ? `?teamId=${this.teamId}` : '';
    return this.request('POST', `/v1/integrations/deploy-hooks${query}`, {
      name,
      ref: ref || 'main',
    });
  }

  /**
   * Delete a deploy hook
   */
  async deleteDeployHook(hookUid: string): Promise<{ status: string }> {
    return this.request('DELETE', `/v1/integrations/deploy-hooks/${hookUid}`);
  }

  /**
   * Get deploy hooks for a project
   */
  async getDeployHooks(projectName: string): Promise<{ hooks: VercelDeployHook[] }> {
    const query = this.teamId ? `?teamId=${this.teamId}` : '';
    return this.request('GET', `/v1/integrations/deploy-hooks${query}&project=${projectName}`);
  }

  /**
   * Trigger a deploy hook
   */
  async triggerDeployHook(hookUrl: string): Promise<{ job: { state: string } }> {
    const response = await fetch(hookUrl, { method: 'POST' });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to trigger deploy hook: ${error}`);
    }
    return response.json();
  }

  /**
   * Add environment variable to project
   */
  async addEnvVar(
    projectName: string,
    key: string,
    value: string,
    target: 'production' | 'preview' | 'development' = 'production'
  ): Promise<{ uid: string; key: string }> {
    const query = this.teamId ? `?teamId=${this.teamId}` : '';
    return this.request('POST', `/v5/env${query}`, {
      key,
      value,
      target,
      projectId: projectName,
    });
  }

  /**
   * Delete environment variable
   */
  async deleteEnvVar(projectName: string, key: string, target: string = 'production'): Promise<{ status: string }> {
    const query = this.teamId ? `?teamId=${this.teamId}` : '';
    return this.request('DELETE', `/v5/env/${key}?projectId=${projectName}&target=${target}${query}`);
  }

  /**
   * Get project domain
   */
  async getDomains(projectName: string): Promise<{ domains: Array<{ name: string; verified: boolean; cdnEnabled: boolean }> }> {
    const query = this.teamId ? `?teamId=${this.teamId}` : '';
    return this.request('GET', `/v4/domains${query}&projectId=${projectName}`);
  }

  /**
   * Add custom domain
   */
  async addDomain(projectName: string, domain: string): Promise<{ name: string; verified: boolean }> {
    const query = this.teamId ? `?teamId=${this.teamId}` : '';
    return this.request('POST', `/v4/domains${query}`, {
      name: domain,
      projectId: projectName,
    });
  }
}

/**
 * Factory to create Vercel client
 */
export function createVercelClient(token: string, teamId?: string): VercelClient {
  return new VercelClient({ token, teamId });
}