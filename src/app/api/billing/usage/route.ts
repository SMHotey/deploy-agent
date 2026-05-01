import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deployments, projects, users, subscriptions, environmentVariables } from '@/db/schema';
import { count, sql, gte, sum, eq, and } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

// Plan limits
const PLAN_LIMITS: Record<string, { deployments: number; projects: number; storage: number }> = {
  free: { deployments: 3, projects: 3, storage: 100 * 1024 * 1024 }, // 100MB
  pro: { deployments: 100, projects: 20, storage: 1 * 1024 * 1024 * 1024 }, // 1GB
  team: { deployments: 1000, projects: 50, storage: 10 * 1024 * 1024 * 1024 }, // 10GB
  enterprise: { deployments: -1, projects: -1, storage: -1 }, // Unlimited
};

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Get user's plan
    const subscription = await db.query.subscriptions.findFirst({
      where: (fields, ops) => ops.and(
        ops.eq(fields.userId, user.id),
        ops.eq(fields.status, 'active')
      ),
    });

    const plan = subscription?.plan || 'free';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    // Calculate usage
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Deployments this period
    const deploymentCount = await db
      .select({ count: count() })
      .from(deployments)
      .innerJoin(projects, eq(deployments.projectId, projects.id))
      .where(
        and(
          eq(projects.userId, user.id),
          gte(deployments.createdAt, startDate)
        )
      );

    const deploymentsUsed = deploymentCount[0]?.count || 0;
    const deploymentsLimit = limits.deployments === -1 ? 'Unlimited' : limits.deployments;
    const deploymentsPercentage = limits.deployments === -1 ? 0 : Math.min((deploymentsUsed / limits.deployments) * 100, 100);

    // Total projects
    const projectCount = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.userId, user.id));

    const projectsUsed = projectCount[0]?.count || 0;
    const projectsLimit = limits.projects === -1 ? 'Unlimited' : limits.projects;
    const projectsPercentage = limits.projects === -1 ? 0 : Math.min((projectsUsed / limits.projects) * 100, 100);

    // Storage (simplified - would need actual storage tracking)
    // For now, estimate based on environment variables
    const envVarCount = await db
        .select({ count: count() })
        .from(environmentVariables)
        .innerJoin(projects, eq(environmentVariables.projectId, projects.id))
        .where(eq(projects.userId, user.id));

    const estimatedStorage = (envVarCount[0]?.count || 0) * 1024; // 1KB per env var (rough estimate)
    const storageUsed = Math.round(estimatedStorage / (1024 * 1024) * 10) / 10; // MB
    const storageLimit = limits.storage === -1 ? 'Unlimited' : Math.round(limits.storage / (1024 * 1024)); // MB
    const storagePercentage = limits.storage === -1 ? 0 : Math.min((estimatedStorage / limits.storage) * 100, 100);

    // Recent deployment trend
    const recentDeployments = await db
      .select({
        date: sql<string>`date(${deployments.createdAt})`,
        count: count(),
      })
      .from(deployments)
      .innerJoin(projects, eq(deployments.projectId, projects.id))
      .where(
        and(
          eq(projects.userId, user.id),
          gte(deployments.createdAt, startDate)
        )
      )
      .groupBy(sql`date(${deployments.createdAt})`)
      .orderBy(sql`date(${deployments.createdAt})`);

    // Alerts
    const alerts: string[] = [];
    if (deploymentsPercentage >= 90) {
      alerts.push(`Deployments usage at ${deploymentsPercentage.toFixed(1)}% - consider upgrading`);
    }
    if (projectsPercentage >= 90) {
      alerts.push(`Projects usage at ${projectsPercentage.toFixed(1)}% - consider upgrading`);
    }
    if (storagePercentage >= 90) {
      alerts.push(`Storage usage at ${storagePercentage.toFixed(1)}% - consider upgrading`);
    }

    logger.info('Usage stats fetched', { userId: user.id, plan, deploymentsUsed });

    return NextResponse.json({
      plan: {
        name: plan,
        limits: {
          deployments: deploymentsLimit,
          projects: projectsLimit,
          storage: storageLimit,
        },
      },
      usage: {
        deployments: {
          used: deploymentsUsed,
          limit: deploymentsLimit,
          percentage: Math.round(deploymentsPercentage * 10) / 10,
          remaining: deploymentsLimit === 'Unlimited' ? 'Unlimited' : Math.max(limits.deployments - deploymentsUsed, 0),
        },
        projects: {
          used: projectsUsed,
          limit: projectsLimit,
          percentage: Math.round(projectsPercentage * 10) / 10,
          remaining: projectsLimit === 'Unlimited' ? 'Unlimited' : Math.max(limits.projects - projectsUsed, 0),
        },
        storage: {
          used: storageUsed,
          limit: storageLimit,
          percentage: Math.round(storagePercentage * 10) / 10,
          remaining: storageLimit === 'Unlimited' ? 'Unlimited' : Math.max((limits.storage / (1024 * 1024)) - storageUsed, 0),
        },
      },
      trend: recentDeployments,
      alerts,
      days,
    });

  } catch (error) {
    logger.error('Usage stats error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch usage stats' },
      { status: 500 }
    );
  }
}
