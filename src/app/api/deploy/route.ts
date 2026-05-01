import { NextRequest, NextResponse } from 'next/server';
import { createDeployService } from '@/lib/deploy';
import { parseDeployParams } from '@/lib/validation';
import { getRateLimiter, initRateLimiter } from '@/lib/rate-limiter';
import { authenticate, getUserTokens } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';
import { sendDeploymentNotification } from '@/lib/email';

// Initialize rate limiter
initRateLimiter(process.env.REDIS_URL);

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    logger.info('Deploy request started');

    // Authenticate user
    const user = await authenticate(request);
    if (!user) {
      logger.warn('Authentication failed');
      return NextResponse.json(
        { error: 'Authentication required. Provide Bearer token in Authorization header.' },
        { status: 401 }
      );
    }

    logger.info('User authenticated', { userId: user.id });

    // Rate limiting check
    const rateLimiter = getRateLimiter();
    if (rateLimiter) {
      const clientIp = request.headers.get('x-forwarded-for') || 'anonymous';
      const rateCheck = await rateLimiter.check(clientIp);
      
      if (!rateCheck.success) {
        logger.warn('Rate limit exceeded', { clientIp, limit: rateCheck.limit });
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = parseDeployParams(body);

    if (!parsed.success) {
      logger.warn('Validation failed', { issues: parsed.error?.issues });
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const params = parsed.data!;

    // Get user's tokens (user can override via headers)
    const userTokens = await getUserTokens(user.id, process.env.ENCRYPTION_KEY!);
    const vercelToken = request.headers.get('x-vercel-token') || userTokens.vercelToken;
    const netlifyToken = request.headers.get('x-netlify-token') || userTokens.netlifyToken || process.env.NETLIFY_TOKEN;
    const githubToken = request.headers.get('x-github-token') || userTokens.githubToken;

    // Validate token based on target platform
    if (params.target_platform === 'vercel' && !vercelToken) {
      logger.warn('Vercel token missing for vercel deployment');
      return NextResponse.json(
        { error: 'Vercel token required for Vercel deployments' },
        { status: 401 }
      );
    }

    if (params.target_platform === 'netlify' && !netlifyToken) {
      logger.warn('Netlify token missing for netlify deployment');
      return NextResponse.json(
        { error: 'Netlify token required for Netlify deployments. Set NETLIFY_TOKEN or configure in settings.' },
        { status: 401 }
      );
    }

    logger.info('Starting deployment', { repoUrl: params.repo_url, platform: params.target_platform });

    // NEW: Call repository analysis before deployment (if not already analyzed)
    let repoAnalysis = null;
    try {
      const analysisUrl = new URL('/api/repo-analyze', request.url);
      analysisUrl.searchParams.set('repo_url', params.repo_url);
      
      const analysisResponse = await fetch(analysisUrl.toString());
      if (analysisResponse.ok) {
        repoAnalysis = await analysisResponse.json();
        logger.info('Repository analysis completed', { 
          repoUrl: params.repo_url,
          recommendedPlatform: repoAnalysis.recommendation?.recommendedPlatform,
        });

        // If target_platform not specified, use recommendation
        if (!params.target_platform && repoAnalysis.recommendation?.recommendedPlatform) {
          params.target_platform = repoAnalysis.recommendation.recommendedPlatform;
          logger.info('Using recommended platform', { platform: params.target_platform });
        }
      }
    } catch (analysisError) {
      logger.warn('Repository analysis failed, continuing with deployment', { error: analysisError });
      // Continue without analysis - non-blocking
    }

    // Create deploy service — use platform-appropriate token
    const platformToken = params.target_platform === 'netlify' ? (netlifyToken || vercelToken) : vercelToken;

    const deployService = createDeployService({
      vercelToken: platformToken || vercelToken || '',
      netlifyToken: netlifyToken || undefined,
      githubToken: githubToken || undefined,
      encryptionKey: process.env.ENCRYPTION_KEY!,
      teamId: request.headers.get('x-vercel-team-id') || undefined,
    });

    // Execute deployment
    const result = await deployService.deploy(params);

    // Send email notification if user email is available
    if (user.email) {
      sendDeploymentNotification(
        user.email,
        result.deploymentId || 'unknown',
        params.project_name || 'Unknown Project',
        result.status === 'ready' ? 'READY' : 'ERROR',
        result.url
      ).catch(err => logger.error('Failed to send email notification', { error: err }));
    }

    // NEW: Track demand after successful deployment
    if (result.success && result.deploymentId) {
      try {
        const demandUrl = new URL('/api/demand/track', request.url);
        await fetch(demandUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: result.deploymentId, // In production: use actual project ID
            eventType: 'deploy',
            metadata: {
              repoUrl: params.repo_url,
              platform: params.target_platform,
              projectName: params.project_name,
            },
          }),
        });
        logger.info('Demand tracked for deployment', { deploymentId: result.deploymentId });
      } catch (demandError) {
        logger.warn('Demand tracking failed', { error: demandError });
        // Non-blocking
      }
    }

    // If wait_for_completion is true, poll for status
    if (params.wait_for_completion && result.deploymentId) {
      const pollResult = await deployService.pollDeploymentStatus(result.deploymentId);
      
      return NextResponse.json({
        deployment_id: result.deploymentId,
        status: pollResult.status,
        url: pollResult.url,
        preview_url: result.previewUrl,
        is_preview: result.isPreview,
        logs_url: result.logsUrl,
        message: pollResult.status === 'ready' ? 'Deployment successful' : pollResult.error,
      });
    }

    return NextResponse.json({
      deployment_id: result.deploymentId,
      status: result.status,
      url: result.url,
      preview_url: result.previewUrl,
      is_preview: result.isPreview,
      logs_url: result.logsUrl,
      message: result.success ? 'Deployment started' : result.error,
      // NEW: Include repo analysis in response
      repo_analysis: repoAnalysis,
    });

  } catch (error) {
    logger.error('Deploy error', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return NextResponse.json(
      { error: 'Deployment failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    logger.info('Get deployment status request');

    // Authenticate user
    const user = await authenticate(request);
    if (!user) {
      logger.warn('Authentication failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.info('User authenticated', { userId: user.id });

    // Return deployment status / logs
    const deploymentId = request.nextUrl.searchParams.get('deployment_id');

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'deployment_id required' },
        { status: 400 }
      );
    }

    const userTokens = await getUserTokens(user.id, process.env.ENCRYPTION_KEY!);
    const vercelToken = request.headers.get('x-vercel-token') || userTokens.vercelToken;

    if (!vercelToken) {
      logger.warn('Vercel token missing');
      return NextResponse.json(
        { error: 'Vercel token required' },
        { status: 401 }
      );
    }

    const deployService = createDeployService({
      vercelToken,
      encryptionKey: process.env.ENCRYPTION_KEY!,
      teamId: request.headers.get('x-vercel-team-id') || undefined,
    });

    try {
      const logs = await deployService.getDeploymentLogs(deploymentId);

      return NextResponse.json({
        deployment_id: deploymentId,
        logs,
      });
    } catch (error) {
      logger.error('Failed to get deployment logs', { error });
      return NextResponse.json(
        { error: 'Failed to get deployment logs' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Request error', { error });
    return NextResponse.json(
      { error: 'Request failed' },
      { status: 500 }
    );
  }
}