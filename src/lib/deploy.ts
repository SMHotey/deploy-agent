import { createVercelClient } from '@/lib/vercel';
import { createNetlifyClient, type NetlifyClient } from '@/lib/netlify';
import { createGitHubClient } from '@/lib/github';
import { encrypt, type EncryptedValue } from '@/lib/encryption';
import { withRetry } from '@/lib/retry';
import type { DeployParams } from '@/lib/validation';

export interface DeployResult {
  success: boolean;
  deploymentId?: string;
  url?: string;
  logsUrl?: string;
  previewUrl?: string;
  isPreview: boolean;
  status: 'pending' | 'building' | 'ready' | 'error';
  error?: string;
}

export interface DeployContext {
  vercelToken: string;
  netlifyToken?: string;
  githubToken?: string;
  supabaseToken?: string;
  encryptionKey: string;
  teamId?: string;
}

/**
 * Platform interface - all platforms must implement this
 */
export interface PlatformDeployer {
  name: string;
  deploy(params: DeployParams, ctx: DeployContext): Promise<DeployResult>;
  pollStatus?(deploymentId: string, ctx: DeployContext): Promise<DeployResult>;
  getLogs?(deploymentId: string, ctx: DeployContext): Promise<string>;
}

/**
 * Vercel platform implementation
 */
class VercelPlatform implements PlatformDeployer {
  name = 'vercel';

  async deploy(params: DeployParams, ctx: DeployContext): Promise<DeployResult> {
    const {
      repo_url,
      project_name,
      branch = 'main',
      root_directory,
      framework_preset,
      build_command,
      install_command,
      dev_command,
      output_directory,
      environment_variables,
      custom_domain,
      vercel_json_config,
      setup_github_actions,
      github_token,
      exclude_authors,
      trigger_branches,
      preview_for_pr,
    } = params;

    const projectName = project_name || this.extractRepoName(repo_url);
    const vercel = createVercelClient(ctx.vercelToken, ctx.teamId);
    const github = ctx.githubToken ? createGitHubClient(ctx.githubToken) : undefined;

    try {
      // Step 1: Create or update project
      await withRetry(async () => {
        await vercel.createOrUpdateProject(projectName, {
          framework: framework_preset,
          rootDirectory: root_directory !== '/' ? root_directory : undefined,
          buildCommand: build_command,
          installCommand: install_command,
          devCommand: dev_command,
          outputDirectory: output_directory,
        });
      }, { maxRetries: 3 });

      // Step 2: Add environment variables if provided
      if (environment_variables) {
        for (const [key, value] of Object.entries(environment_variables)) {
          try {
            await vercel.addEnvVar(projectName, key, String(value));
          } catch (e) {
            console.warn(`Failed to add env var ${key}:`, e);
          }
        }
      }

      // Step 3: Create deployment
      const environment = params.environment_slug || 'production';
      const isPreview = environment === 'preview' || environment === 'development';

      const deploymentResult = await withRetry(async () => {
        return vercel.createDeployment({
          repoUrl: repo_url,
          projectName,
          branch,
          rootDirectory: root_directory !== '/' ? root_directory : undefined,
          framework: framework_preset,
          buildCommand: build_command,
          installCommand: install_command,
          devCommand: dev_command,
          outputDirectory: output_directory,
          env: environment_variables as Record<string, string> | undefined,
          teamId: ctx.teamId,
          target: environment,
          isPreview,
        });
      }, { maxRetries: 3, initialDelayMs: 2000 });

      if (!deploymentResult.success || !deploymentResult.data) {
        throw deploymentResult.error || new Error('Deployment failed');
      }

      const deployment = deploymentResult.data;
      const deploymentId = deployment.uid;
      const url = deployment.url;
      // For preview deployments, Vercel provides a unique URL per deployment
      const previewUrl = isPreview ? deployment.url : undefined;

      // Step 4: Setup GitHub Actions if requested
      if (setup_github_actions && github && github_token) {
        try {
          const repoMatch = repo_url.match(/github\.com[/:]([^/]+)[/]([^/]+?)(?:\.git)?$/);
          if (repoMatch) {
            const [_, owner, repo] = repoMatch;
            await github.createDeployWorkflow(owner, repo, {
              name: 'Deploy',
              onPushBranches: trigger_branches,
              excludeAuthors: exclude_authors,
              setupPreview: preview_for_pr,
            });
          }
        } catch (e) {
          console.warn('Failed to setup GitHub Actions:', e);
        }
      }

      // Step 5: Add custom domain if provided
      if (custom_domain) {
        try {
          await vercel.addDomain(projectName, custom_domain);
        } catch (e) {
          console.warn('Failed to add custom domain:', e);
        }
      }

      return {
        success: true,
        deploymentId,
        url,
        previewUrl,
        isPreview,
        logsUrl: `https://vercel.com/${ctx.teamId || ''}/deployments/${deploymentId}`,
        status: deployment.state === 'READY' ? 'ready' : 'building',
      };

    } catch (error) {
      return {
        success: false,
        isPreview: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Deployment failed',
      };
    }
  }

  async pollStatus(deploymentId: string, ctx: DeployContext): Promise<DeployResult> {
    const vercel = createVercelClient(ctx.vercelToken, ctx.teamId);
    const startTime = Date.now();
    const timeoutMs =300000;

    while (Date.now() - startTime < timeoutMs) {
      const result: any = await vercel.getDeployment(deploymentId);

      if (!result.success || !result.data) {
        return {
          success: false,
          deploymentId,
          isPreview: false,
          status: 'error',
          error: result.error instanceof Error ? result.error.message : 'Deployment check failed',
        };
      }

      const deployment = result.data;

      if (deployment.state === 'READY') {
        return { success: true, deploymentId, url: deployment.url, isPreview: false, status: 'ready' };
      }

      if (deployment.state === 'ERROR') {
        return {
          success: false,
          deploymentId,
          isPreview: false,
          status: 'error',
          error: deployment.builds?.[0]?.error || 'Deployment failed',
        };
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    return { success: false, deploymentId, isPreview: false, status: 'error', error: 'Deployment timed out' };
  }

  async getLogs(deploymentId: string, ctx: DeployContext): Promise<string> {
    const vercel = createVercelClient(ctx.vercelToken, ctx.teamId);
    const deployment = await vercel.getDeployment(deploymentId);
    return deployment.builds?.map((b) => `${b.state}: ${b.use} - ${b.error || 'OK'}`).join('\n') || '';
  }

  private extractRepoName(repoUrl: string): string {
    const match = repoUrl.match(/github\.com[/:]([^/]+)[/]([^/]+?)(?:\.git)?$/);
    return match ? match[2] : 'unnamed-project';
  }
}

/**
 * Netlify platform implementation
 */
class NetlifyPlatform implements PlatformDeployer {
  name = 'netlify';

  async deploy(params: DeployParams, ctx: DeployContext): Promise<DeployResult> {
    const {
      repo_url,
      project_name,
      branch = 'main',
      root_directory,
      framework_preset,
      build_command,
      output_directory,
      environment_variables,
      custom_domain,
      setup_github_actions,
      github_token,
      trigger_branches,
      preview_for_pr,
    } = params;

    const projectName = project_name || this.extractRepoName(repo_url);

    if (!ctx.vercelToken) {
      // Netlify uses the same vercelToken field as a generic "platform token" in our current schema
      // In production, this should be a separate netlifyToken field
      const netlifyToken = process.env.NETLIFY_TOKEN;
      if (!netlifyToken) {
        return {
          success: false,
          isPreview: false,
          status: 'error',
          error: 'Netlify token required. Set NETLIFY_TOKEN env var or configure in settings.',
        };
      }

      // Use env token as fallback
      const netlify = createNetlifyClient(netlifyToken);
      return this.deployWithClient(netlify, projectName, params, ctx);
    }

    // If vercelToken is provided, try to use it as netlify token (backward compat)
    const netlify = createNetlifyClient(ctx.vercelToken);
    return this.deployWithClient(netlify, projectName, params, ctx);
  }

  private async deployWithClient(
    netlify: NetlifyClient,
    projectName: string,
    params: DeployParams,
    ctx: DeployContext
  ): Promise<DeployResult> {
    const {
      repo_url,
      branch = 'main',
      root_directory,
      build_command,
      output_directory,
      environment_variables,
      custom_domain,
      setup_github_actions,
      github_token,
      trigger_branches,
      preview_for_pr,
    } = params;

    try {
      // Step 1: Find or create site
      const sitesResult = await netlify.listSites({ name: projectName });

      let siteId: string;

      if (sitesResult.success && sitesResult.data && sitesResult.data.length > 0) {
        // Site exists, use it
        siteId = sitesResult.data[0].id;
      } else {
        // Create new site
        const provider = repo_url.includes('github.com') ? 'github' : repo_url.includes('gitlab.com') ? 'gitlab' : 'bitbucket';

        const createResult = await netlify.createSite({
          name: projectName,
          repo: {
            url: repo_url,
            branch: branch || 'main',
            provider,
          },
          buildCmd: build_command || undefined,
          buildDir: output_directory || undefined,
        });

        if (!createResult.success || !createResult.data) {
          throw createResult.error || new Error('Failed to create Netlify site');
        }

        siteId = createResult.data.id;
      }

      // Step 2: Add environment variables
      if (environment_variables) {
        for (const [key, value] of Object.entries(environment_variables)) {
          try {
            await netlify.setEnvVar(siteId, key, value, 'all', true);
          } catch (e) {
            console.warn(`Failed to add env var ${key}:`, e);
          }
        }
      }

      // Step 3: Trigger deploy
      const environment = params.environment_slug || 'production';
      const isPreview = environment === 'preview' || environment === 'development';

      const deployResult = await netlify.createDeploy({ 
        siteId, 
        branch: branch || 'main',
        isPreview,
      });

      if (!deployResult.success || !deployResult.data) {
        throw deployResult.error || new Error('Deployment failed');
      }

      const deploy = deployResult.data;

      // Step 4: Setup GitHub Actions if requested (same as Vercel)
      if (setup_github_actions && ctx.githubToken && github_token) {
        try {
          const repoMatch = repo_url.match(/github\.com[/:]([^/]+)[/]([^/]+?)(?:\.git)?$/);
          if (repoMatch) {
            const github = createGitHubClient(ctx.githubToken!);
            const [_, owner, repo] = repoMatch;
            await github.createDeployWorkflow(owner, repo, {
              name: 'Deploy',
              onPushBranches: trigger_branches,
              excludeAuthors: params.exclude_authors,
              setupPreview: preview_for_pr,
            });
          }
        } catch (e) {
          console.warn('Failed to setup GitHub Actions:', e);
        }
      }

      return {
        success: true,
        deploymentId: deploy.id,
        url: deploy.deploy_ssl_url || deploy.deploy_url,
        previewUrl: isPreview ? deploy.deploy_ssl_url || deploy.deploy_url : undefined,
        isPreview,
        logsUrl: deploy.admin_url,
        status: deploy.state === 'ready' ? 'ready' : deploy.state === 'building' ? 'building' : 'pending',
      };
    } catch (error) {
      return {
        success: false,
        isPreview: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Deployment failed',
      };
    }
  }

  async pollStatus(deploymentId: string, ctx: DeployContext): Promise<DeployResult> {
    const token = process.env.NETLIFY_TOKEN || ctx.vercelToken;
    if (!token) {
      return { success: false, deploymentId, isPreview: false, status: 'error', error: 'Netlify token required' };
    }

    const netlify = createNetlifyClient(token);
    const startTime = Date.now();
    const timeoutMs = 300000;

    while (Date.now() - startTime < timeoutMs) {
      const result = await netlify.getDeploy(deploymentId);

      if (!result.success || !result.data) {
        return {
          success: false,
          deploymentId,
          isPreview: false,
          status: 'error',
          error: result.error?.message || 'Deployment check failed',
        };
      }

      const deploy = result.data;

      if (deploy.state === 'ready') {
        return { success: true, deploymentId, url: deploy.deploy_ssl_url, isPreview: false, status: 'ready' };
      }

      if (deploy.state === 'error') {
        return {
          success: false,
          deploymentId,
          isPreview: false,
          status: 'error',
          error: deploy.error_message || 'Deployment failed',
        };
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    return { success: false, deploymentId, isPreview: false, status: 'error', error: 'Deployment timed out' };
  }

  async getLogs(deploymentId: string, ctx: DeployContext): Promise<string> {
    const token = process.env.NETLIFY_TOKEN || ctx.vercelToken;
    if (!token) return 'Netlify token required to fetch logs';

    const netlify = createNetlifyClient(token);
    const result = await netlify.getDeploy(deploymentId);

    if (!result.success || !result.data) {
      return `Failed to fetch deploy info: ${result.error?.message}`;
    }

    const deploy = result.data;
    return `Deploy ${deploy.id}\nState: ${deploy.state}\nBranch: ${deploy.branch || 'unknown'}\nURL: ${deploy.deploy_ssl_url}\nCreated: ${deploy.created_at}`;
  }

  private extractRepoName(repoUrl: string): string {
    const match = repoUrl.match(/github\.com[/:]([^/]+)[/]([^/]+?)(?:\.git)?$/);
    return match ? match[2] : 'unnamed-project';
  }
}

/**
 * Platform factory - extensible registry
 */
const platforms: Record<string, () => PlatformDeployer> = {
  vercel: () => new VercelPlatform(),
  netlify: () => new NetlifyPlatform(),
  // Future platforms - uncomment and implement when ready:
  // 'cloudflare-pages': () => new CloudflarePlatform(),
  // railway: () => new RailwayPlatform(),
};

/**
 * Register a new platform (for extensibility)
 */
export function registerPlatform(name: string, factory: () => PlatformDeployer): void {
  platforms[name] = factory;
}

/**
 * Get a platform by name
 */
export function getPlatform(name: string): PlatformDeployer | undefined {
  const factory = platforms[name];
  return factory ? factory() : undefined;
}

/**
 * List available platform names
 */
export function listPlatforms(): string[] {
  return Object.keys(platforms);
}

/**
 * Deploy service - main entrypoint
 */
export class DeployService {
  private ctx: DeployContext;

  constructor(ctx: DeployContext) {
    this.ctx = ctx;
  }

  async deploy(params: DeployParams): Promise<DeployResult> {
    const platformName = params.target_platform || 'vercel';
    const factory = platforms[platformName];

    if (!factory) {
      return {
        success: false,
        isPreview: false,
        status: 'error',
        error: `Platform '${platformName}' not supported. Available: ${Object.keys(platforms).join(', ')}`,
      };
    }

    const platform = factory();
    return platform.deploy(params, this.ctx);
  }

  async pollDeploymentStatus(deploymentId: string): Promise<DeployResult> {
    const factory = platforms['vercel']; // Simplified - could store platform per deployment
    const platform = factory();
    if (platform.pollStatus) {
      return platform.pollStatus(deploymentId, this.ctx);
    }
    return { success: false, deploymentId, isPreview: false, status: 'error', error: 'Polling not supported for this platform' };
  }

  async getDeploymentLogs(deploymentId: string): Promise<string> {
    const factory = platforms['vercel'];
    const platform = factory();
    if (platform.getLogs) {
      return platform.getLogs(deploymentId, this.ctx);
    }
    return '';
  }

  encryptValue(value: string): EncryptedValue {
    return encrypt(value, this.ctx.encryptionKey);
  }
}

/**
 * Factory function
 */
export function createDeployService(ctx: DeployContext): DeployService {
  return new DeployService(ctx);
}
