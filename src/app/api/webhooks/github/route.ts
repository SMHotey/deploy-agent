import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { parseGitHubWebhook, parseDeployParams } from '@/lib/validation';
import { db } from '@/db';
import { projects, deployments, auditLogs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createDeployService } from '@/lib/deploy';
import { createLogger, generateRequestId } from '@/lib/logger';
import { sendDeploymentNotification } from '@/lib/email';

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/github
 * Receives GitHub push events and triggers deployments for matching projects.
 *
 * Headers:
 *   - X-Hub-Signature-256: HMAC-SHA256 signature (required if GITHUB_WEBHOOK_SECRET is set)
 *   - X-GitHub-Event: Event type (e.g., 'push', 'ping')
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const githubEvent = request.headers.get('x-github-event') || '';

    // Handle ping event
    if (githubEvent === 'ping') {
      logger.info('GitHub webhook ping received');
      return NextResponse.json({ message: 'pong' });
    }

    if (githubEvent !== 'push') {
      logger.info('Ignoring non-push GitHub event', { event: githubEvent });
      return NextResponse.json({ message: 'ignored' }, { status: 200 });
    }

    // Verify signature if secret is configured
    if (GITHUB_WEBHOOK_SECRET) {
      const signature = request.headers.get('x-hub-signature-256');
      if (!signature) {
        logger.warn('GitHub webhook signature missing');
        return NextResponse.json({ error: 'Signature required' }, { status: 401 });
      }

      const rawBody = await request.text();
      const expectedSignature = createHmac('sha256', GITHUB_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      const providedSignature = signature.replace('sha256=', '');

      if (!timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature))) {
        logger.warn('GitHub webhook signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      // Re-parse since we consumed the body
      const body = JSON.parse(rawBody);
      return handlePushEvent(body, logger, requestId);
    }

    // No secret configured — parse body normally
    const body = await request.json();
    return handlePushEvent(body, logger, requestId);
  } catch (error) {
    logger.error('GitHub webhook error', { error });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePushEvent(
  body: unknown,
  logger: ReturnType<typeof createLogger>,
  requestId: string
) {
  const parsed = parseGitHubWebhook(body);

  if (!parsed.success || !parsed.data) {
    logger.warn('Invalid GitHub webhook payload', { error: parsed.error?.issues });
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { ref, repository, after } = parsed.data;
  const branch = ref.replace('refs/heads/', '');
  const commitSha = after || 'unknown';

  logger.info('GitHub push event received', {
    repo: repository.full_name,
    branch,
    commitSha,
  });

  // Find matching projects
  const matchingProjects = await db.query.projects.findMany({
    where: (projects, { eq, and, like }) =>
      and(
        like(projects.repoUrl, `%${repository.full_name}%`),
        eq(projects.branch, branch),
      ),
  });

  if (matchingProjects.length === 0) {
    logger.info('No matching projects found for push', {
      repo: repository.full_name,
      branch,
    });
    return NextResponse.json({ message: 'No matching projects' });
  }

  logger.info('Found matching projects', { count: matchingProjects.length });

  // Trigger deployments for matching projects (max parallel_deploys)
  const maxParallel = Math.min(parseInt(process.env.PARALLEL_DEPLOYS || '5'), 5);
  const projectsToDeploy = matchingProjects.slice(0, maxParallel);

  const deploymentResults = await Promise.allSettled(
    projectsToDeploy.map(async (project) => {
      try {
        const deployService = createDeployService({
          vercelToken: process.env.VERCEL_TOKEN || '',
          githubToken: process.env.GITHUB_TOKEN || undefined,
          encryptionKey: process.env.ENCRYPTION_KEY!,
        });

        const params = parseDeployParams({
          repo_url: project.repoUrl,
          project_name: project.name,
          target_platform: project.platform,
          branch: project.branch || 'main',
          root_directory: project.rootDirectory || '/',
          build_override: project.buildOverride || undefined,
          output_directory: project.outputDirectory || undefined,
          environment_variables: {},
          wait_for_completion: false,
        });

        if (!params.success || !params.data) {
          throw new Error('Invalid deploy parameters');
        }

        const result = await deployService.deploy(params.data);

        // Create audit log entry
        if (project.id) {
          await db.insert(auditLogs).values({
            projectId: project.id,
            action: 'webhook_deploy_triggered',
            details: {
              source: 'github_webhook',
              branch,
              commitSha,
              repo: repository.full_name,
            },
            ipAddress: 'webhook',
          });
        }

        return result;
      } catch (err) {
        logger.error('Deployment failed for project', {
          projectId: project.id,
          error: err instanceof Error ? err.message : 'unknown',
        });
        throw err;
      }
    })
  );

  const successful = deploymentResults.filter(
    (r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled'
  ).length;
  const failed = deploymentResults.length - successful;

  logger.info('Webhook deployment results', {
    triggered: projectsToDeploy.length,
    successful,
    failed,
  });

  return NextResponse.json({
    message: `Triggered ${successful} deployment(s)`,
    successful,
    failed,
  });
}
