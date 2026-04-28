import { createVercelClient, type VercelClient, type CreateDeploymentOptions } from '@/lib/vercel';
import { createGitHubClient, type GitHubClient } from '@/lib/github';
import { encrypt, type EncryptedValue } from '@/lib/encryption';
import { withRetry } from '@/lib/retry';
import type { DeployParams } from '@/lib/validation';

export interface DeployResult {
  success: boolean;
  deploymentId?: string;
  url?: string;
  logsUrl?: string;
  status: 'pending' | 'building' | 'ready' | 'error';
  error?: string;
}

export interface DeployContext {
  vercelToken: string;
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
        });
      }, { maxRetries: 3, initialDelayMs: 2000 });

      if (!deploymentResult.success || !deploymentResult.data) {
        throw deploymentResult.error || new Error('Deployment failed');
      }

      const deployment = deploymentResult.data;
      const deploymentId = deployment.uid;
      const url = deployment.url;

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
        logsUrl: `https://vercel.com/${ctx.teamId || ''}/deployments/${deploymentId}`,
        status: deployment.state === 'READY' ? 'ready' : 'building',
      };

    } catch (error) {
      return {
        success: false,
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
          status: 'error',
          error: result.error instanceof Error ? result.error.message : 'Deployment check failed',
        };
      }

      const deployment = result.data;

      if (deployment.state === 'READY') {
        return { success: true, deploymentId, url: deployment.url, status: 'ready' };
      }

      if (deployment.state === 'ERROR') {
        return {
          success: false,
          deploymentId,
          status: 'error',
          error: deployment.builds?.[0]?.error || 'Deployment failed',
        };
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    return { success: false, deploymentId, status: 'error', error: 'Deployment timed out' };
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
 * Platform factory - extensible registry
 */
const platforms: Record<string, () => PlatformDeployer> = {
  vercel: () => new VercelPlatform(),
  // Future platforms - uncomment and implement when ready:
  // netlify: () => new NetlifyPlatform(),
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
    return { success: false, deploymentId, status: 'error', error: 'Polling not supported for this platform' };
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
