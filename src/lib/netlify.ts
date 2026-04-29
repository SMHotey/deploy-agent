const NETLIFY_API_BASE = 'https://api.netlify.com/api/v1';
const REQUEST_TIMEOUT = 30000;

export interface NetlifyConfig {
  token: string;
}

export interface NetlifySite {
  id: string;
  name: string;
  url: string;
  ssl_url: string;
  admin_url: string;
  state: string;
  created_at: string;
  updated_at: string;
  build_settings?: {
    provider: string;
    repo_url: string;
    repo_branch: string;
    cmd: string;
    dir: string;
  };
}

export interface NetlifyDeploy {
  id: string;
  site_id: string;
  state: 'created' | 'building' | 'ready' | 'error' | 'cancelled';
  deploy_url: string;
  deploy_ssl_url: string;
  admin_url: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  error_message?: string;
  branch?: string;
  commit_ref?: string;
  commit_url?: string;
  review_id?: number;
  framework?: string;
}

export interface NetlifyEnvVar {
  id: string;
  key: string;
  value: string;
  context: string;
  sensitive: boolean;
}

export interface CreateSiteOptions {
  name: string;
  repo?: {
    url: string;
    branch: string;
    provider: 'github' | 'gitlab' | 'bitbucket';
  };
  buildCmd?: string;
  buildDir?: string;
}

export interface CreateDeployOptions {
  siteId: string;
  branch?: string;
  isPreview?: boolean;
}

export interface NetlifyClient {
  getAccount(): Promise<{ success: boolean; data?: Record<string, unknown>; error?: Error }>;
  listSites(options?: { name?: string }): Promise<{ success: boolean; data?: NetlifySite[]; error?: Error }>;
  getSite(siteId: string): Promise<{ success: boolean; data?: NetlifySite; error?: Error }>;
  createSite(options: CreateSiteOptions): Promise<{ success: boolean; data?: NetlifySite; error?: Error }>;
  updateSite(siteId: string, options: Partial<CreateSiteOptions>): Promise<{ success: boolean; data?: NetlifySite; error?: Error }>;
  deleteSite(siteId: string): Promise<{ success: boolean; error?: Error }>;
  createDeploy(options: CreateDeployOptions): Promise<{ success: boolean; data?: NetlifyDeploy; error?: Error }>;
  getDeploy(deployId: string): Promise<{ success: boolean; data?: NetlifyDeploy; error?: Error }>;
  listDeploys(siteId: string, options?: { state?: string }): Promise<{ success: boolean; data?: NetlifyDeploy[]; error?: Error }>;
  cancelDeploy(deployId: string): Promise<{ success: boolean; error?: Error }>;
  listEnvVars(siteId: string, context?: string): Promise<{ success: boolean; data?: NetlifyEnvVar[]; error?: Error }>;
  setEnvVar(siteId: string, key: string, value: string, context?: string, sensitive?: boolean): Promise<{ success: boolean; data?: NetlifyEnvVar; error?: Error }>;
  deleteEnvVar(siteId: string, envVarId: string): Promise<{ success: boolean; error?: Error }>;
  getSiteHook(siteId: string): Promise<{ success: boolean; data?: { id: string; url: string }; error?: Error }>;
  addDomain(siteId: string, domain: string): Promise<{ success: boolean; error?: Error }>;
}

export function createNetlifyClient(token: string): NetlifyClient {
  async function request<T>(
    endpoint: string,
    options: { method?: string; body?: unknown } = {}
  ): Promise<{ success: boolean; data?: T; error?: Error }> {
    const { method = 'GET', body } = options;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const fetchOptions: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      };

      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(`${NETLIFY_API_BASE}${endpoint}`, fetchOptions);
      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Netlify API error ${response.status}: ${errorText || response.statusText}`);
      }

      if (response.status === 204) {
        return { success: true };
      }

      const data = (await response.json()) as T;
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  return {
    async getAccount() {
      return request<Record<string, unknown>>('/account');
    },

    async listSites(options) {
      const params = new URLSearchParams();
      if (options?.name) params.set('name', options.name);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<NetlifySite[]>(`/sites${query}`);
    },

    async getSite(siteId) {
      return request<NetlifySite>(`/sites/${siteId}`);
    },

    async createSite(options) {
      const body: Record<string, unknown> = {
        name: options.name,
      };

      if (options.repo) {
        body.build_settings = {
          provider: options.repo.provider,
          repo_url: options.repo.url,
          repo_branch: options.repo.branch,
          ...(options.buildCmd ? { cmd: options.buildCmd } : {}),
          ...(options.buildDir ? { dir: options.buildDir } : {}),
        };
      }

      return request<NetlifySite>('/sites', { method: 'POST', body });
    },

    async updateSite(siteId, options) {
      const body: Record<string, unknown> = {};

      if (options.name) body.name = options.name;
      if (options.repo) {
        body.build_settings = {
          provider: options.repo.provider,
          repo_url: options.repo.url,
          repo_branch: options.repo.branch,
          ...(options.buildCmd ? { cmd: options.buildCmd } : {}),
          ...(options.buildDir ? { dir: options.buildDir } : {}),
        };
      }

      return request<NetlifySite>(`/sites/${siteId}`, { method: 'PUT', body });
    },

    async deleteSite(siteId) {
      return request<never>(`/sites/${siteId}`, { method: 'DELETE' });
    },

    async createDeploy(options) {
      const body: Record<string, unknown> = {
        branch: options.branch || 'main',
        clear_cache: true,
        ...(options.isPreview && { draft: true }),
      };

      return request<NetlifyDeploy>(`/sites/${options.siteId}/deploys`, { method: 'POST', body });
    },

    async getDeploy(deployId) {
      return request<NetlifyDeploy>(`/deploys/${deployId}`);
    },

    async listDeploys(siteId, options) {
      const params = new URLSearchParams();
      if (options?.state) params.set('state', options.state);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<NetlifyDeploy[]>(`/sites/${siteId}/deploys${query}`);
    },

    async cancelDeploy(deployId) {
      return request<never>(`/deploys/${deployId}/cancel`, { method: 'POST' });
    },

    async listEnvVars(siteId, context) {
      const query = context ? `?context=${context}` : '';
      return request<NetlifyEnvVar[]>(`/sites/${siteId}/env${query}`);
    },

    async setEnvVar(siteId, key, value, context = 'all', sensitive = true) {
      const body = { key, value, context, sensitive };
      return request<NetlifyEnvVar>(`/sites/${siteId}/env`, { method: 'POST', body });
    },

    async deleteEnvVar(siteId, envVarId) {
      return request<never>(`/sites/${siteId}/env/${envVarId}`, { method: 'DELETE' });
    },

    async getSiteHook(siteId) {
      const siteResult = await this.getSite(siteId);
      if (!siteResult.success || !siteResult.data) {
        return { success: false, error: siteResult.error };
      }
      return {
        success: true,
        data: {
          id: siteResult.data.id,
          url: `https://api.netlify.com/api/v1/sites/${siteResult.data.id}/hooks`,
        },
      };
    },

    async addDomain(siteId, domain) {
      return { success: false, error: new Error('Custom domains must be configured via Netlify UI') };
    },
  };
}


