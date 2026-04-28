import { Command } from 'commander';

const API_URL = process.env.DEPLOY_AGENT_URL || 'http://localhost:3000';

const program = new Command();

program
  .name('deploy-agent')
  .description('CLI for deploy-agent - deploy git repositories to Vercel')
  .version('1.0.0');

program
  .command('deploy')
  .description('Deploy a repository')
  .argument('<repo-url>', 'Git repository URL')
  .option('-n, --name <name>', 'Project name')
  .option('-p, --platform <platform>', 'Target platform (vercel, netlify, etc.)', 'vercel')
  .option('-b, --branch <branch>', 'Branch to deploy', 'main')
  .option('-d, --dir <directory>', 'Root directory for monorepos')
  .option('-e, --env <key=value...>', 'Environment variables')
  .option('-w, --wait', 'Wait for deployment completion', false)
  .action(async (repoUrl, options) => {
    const params: Record<string, unknown> = {
      repo_url: repoUrl,
      project_name: options.name,
      target_platform: options.platform,
      branch: options.branch,
      root_directory: options.dir,
      wait_for_completion: options.wait,
    };

    if (options.env) {
      const envVars: Record<string, string> = {};
      for (const item of options.env) {
        const [key, value] = item.split('=');
        envVars[key] = value;
      }
      params.environment_variables = envVars;
    }

    console.log('Deploying', repoUrl, '...');

    try {
      const response = await fetch(`${API_URL}/api/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error:', data.error);
        process.exit(1);
      }

      console.log('Status:', data.status);
      if (data.url) console.log('URL:', data.url);
      if (data.deployment_id) console.log('Deployment ID:', data.deployment_id);
    } catch (error) {
      console.error('Request failed:', error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Get deployment status')
  .argument('<deployment-id>', 'Deployment ID')
  .action(async (deploymentId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/deploy?deployment_id=${deploymentId}`
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error:', data.error);
        process.exit(1);
      }

      console.log(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Request failed:', error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List projects')
  .option('-p, --platform <platform>', 'Filter by platform')
  .option('-l, --limit <limit>', 'Limit results', '10')
  .action(async (options) => {
    const params = new URLSearchParams();
    if (options.platform) params.set('platform', options.platform);
    params.set('limit', options.limit);

    try {
      const response = await fetch(`${API_URL}/api/projects?${params}`);

      const data = await response.json();

      if (!response.ok) {
        console.error('Error:', data.error);
        process.exit(1);
      }

      console.log(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Request failed:', error);
      process.exit(1);
    }
  });

program.parse();