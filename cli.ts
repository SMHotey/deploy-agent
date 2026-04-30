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
  .option('-t, --template <template>', 'Use a deployment template (nextjs-vercel, react-vite, etc.)')
  .action(async (repoUrl, options) => {
    const params: Record<string, unknown> = {
      repo_url: repoUrl,
      project_name: options.name,
      target_platform: options.platform,
      branch: options.branch,
      root_directory: options.dir,
      wait_for_completion: options.wait,
    };

    // Apply template defaults if specified
    if (options.template) {
      try {
        const { getTemplate } = require('./dist/lib/templates.js');
        const template = getTemplate(options.template);
        if (template) {
          console.log(`Applying template: ${template.name}`);
          Object.assign(params, template.defaults);
          params.target_platform = template.platform;
        } else {
          console.warn(`Template not found: ${options.template}`);
        }
      } catch {
        // In dev mode, templates might not be compiled yet
      }
    }

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

      // Wait for completion if requested
      if (options.wait && data.deployment_id) {
        console.log('Waiting for deployment to complete...');
        let attempts = 0;
        while (attempts < 60) { // Wait up to 5 minutes
          await new Promise(resolve => setTimeout(resolve, 5000));
          try {
            const statusRes = await fetch(`${API_URL}/api/deploy?deployment_id=${data.deployment_id}`);
            const statusData = await statusRes.json();
            if (statusData.status === 'ready') {
              console.log('✓ Deployment completed successfully!');
              if (statusData.url) console.log('URL:', statusData.url);
              break;
            } else if (statusData.status === 'error') {
              console.error('✗ Deployment failed:', statusData.error || 'Unknown error');
              process.exit(1);
            }
            process.stdout.write('.');
          } catch {
            // Retry on network error
          }
          attempts++;
        }
        if (attempts >= 60) {
          console.error('Timeout waiting for deployment');
          process.exit(1);
        }
      }
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
  .command('rollback')
  .description('Rollback to a previous deployment')
  .argument('<deployment-id>', 'Deployment ID to rollback to')
  .option('-p, --project <project-id>', 'Project ID (optional, auto-detected if not provided)')
  .action(async (deploymentId, options) => {
    try {
      console.log(`Rolling back to deployment ${deploymentId}...`);

      // Get deployment info
      const response = await fetch(
        `${API_URL}/api/deploy?deployment_id=${deploymentId}`
      );
      const data = await response.json();

      if (!response.ok) {
        console.error('Error:', data.error);
        process.exit(1);
      }

      if (!data.url) {
        console.error('No URL found for this deployment');
        process.exit(1);
      }

      console.log(`✓ Rollback target: ${data.url}`);
      console.log('Note: Rollback sets the target URL as primary. The previous deployment remains available.');

      if (data.project_id) {
        const projectRes = await fetch(`${API_URL}/api/projects/${data.project_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ primary_deployment: deploymentId }),
        });

        if (projectRes.ok) {
          console.log('✓ Project updated to use this deployment as primary.');
        }
      }

    } catch (error) {
      console.error('Rollback failed:', error);
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