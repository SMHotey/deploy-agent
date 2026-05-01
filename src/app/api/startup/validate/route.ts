import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

interface ValidationResult {
  check: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, repoUrl, platform, config } = body;

    const results: ValidationResult[] = [];

    // Check 1: User has valid tokens
    const userData = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (platform === 'vercel' || !platform) {
      if (!userData?.vercelToken) {
        results.push({
          check: 'vercel-token',
          status: 'failed',
          message: 'Vercel token not configured',
          details: { setupUrl: '/settings/tokens' },
        });
      } else {
        results.push({
          check: 'vercel-token',
          status: 'passed',
          message: 'Vercel token is configured',
        });
      }
    }

    if (platform === 'netlify' || !platform) {
      if (!userData?.netlifyToken) {
        results.push({
          check: 'netlify-token',
          status: 'failed',
          message: 'Netlify token not configured',
          details: { setupUrl: '/settings/tokens' },
        });
      } else {
        results.push({
          check: 'netlify-token',
          status: 'passed',
          message: 'Netlify token is configured',
        });
      }
    }

    // Check 2: GitHub token for repo access
    if (!userData?.githubToken) {
      results.push({
        check: 'github-token',
        status: 'failed',
        message: 'GitHub token not configured - required for repository access',
        details: { setupUrl: '/settings/tokens' },
      });
    } else {
      results.push({
        check: 'github-token',
        status: 'passed',
        message: 'GitHub token is configured',
      });
    }

    // Check 3: Repository URL format
    if (repoUrl) {
      const githubRegex = /^https?:\/\/github\.com\/[\w-]+\/[\w-]+(\.git)?$/;
      const isGithub = githubRegex.test(repoUrl);
      
      if (!isGithub) {
        results.push({
          check: 'repo-url',
          status: 'warning',
          message: 'Repository URL should be a valid GitHub URL',
        });
      } else {
        results.push({
          check: 'repo-url',
          status: 'passed',
          message: 'Repository URL format is valid',
        });
      }
    } else {
      results.push({
        check: 'repo-url',
        status: 'failed',
        message: 'Repository URL is required',
      });
    }

    // Check 4: Environment variables for platform
    if (config?.environmentVariables) {
      const envVars = config.environmentVariables;
      const requiredVars = platform === 'vercel' ? ['VERCEL_TOKEN'] : 
                           platform === 'netlify' ? ['NETLIFY_AUTH_TOKEN'] : [];
      
      const missing = requiredVars.filter(v => !envVars[v]);
      if (missing.length > 0) {
        results.push({
          check: 'env-vars',
          status: 'warning',
          message: `Missing recommended env vars: ${missing.join(', ')}`,
          details: { missing },
        });
      } else {
        results.push({
          check: 'env-vars',
          status: 'passed',
          message: 'Environment variables are properly configured',
        });
      }
    }

    // Check 5: Build configuration
    if (config) {
      if (config.buildCommand || config.installCommand) {
        results.push({
          check: 'build-config',
          status: 'passed',
          message: 'Build configuration is specified',
        });
      } else {
        results.push({
          check: 'build-config',
          status: 'warning',
          message: 'No build configuration specified - will use defaults',
        });
      }
    }

    // Save results to database (optional)
    // await db.insert(startupReadinessChecks).values(
    //   results.map(r => ({
    //     userId: user.id,
    //     projectId,
    //     checkType: r.check,
    //     status: r.status,
    //     message: r.message,
    //     details: r.details || null,
    //   }))
    // );

    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const warnings = results.filter(r => r.status === 'warning').length;

    logger.info('Startup readiness check completed', {
      userId: user.id,
      projectId,
      passed,
      failed,
      warnings,
    });

    return NextResponse.json({
      summary: {
        total: results.length,
        passed,
        failed,
        warnings,
        ready: failed === 0,
      },
      results,
      nextSteps: failed > 0 
        ? ['Fix failed checks before deploying', 'Review warnings for optimization']
        : ['All checks passed! Ready to deploy'],
    });

  } catch (error) {
    logger.error('Startup readiness check error', { error });
    return NextResponse.json(
      { error: 'Failed to run readiness checks' },
      { status: 500 }
    );
  }
}
