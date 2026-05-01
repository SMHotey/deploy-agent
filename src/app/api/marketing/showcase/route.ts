import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, deployments, users } from '@/db/schema';
import { count, sql, gte, eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get projects with deployment stats (public discovery)
    const allProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        platform: projects.platform,
        repoUrl: projects.repoUrl,
        deploymentCount: count(deployments.id),
        lastDeployed: sql<string>`MAX(${deployments.createdAt})`,
      })
      .from(projects)
      .leftJoin(deployments, sql`${deployments.projectId} = ${projects.id}`)
      .groupBy(projects.id, projects.name, projects.description, projects.platform, projects.repoUrl)
      .orderBy(sql`COUNT(${deployments.id}) DESC`)
      .limit(limit)
      .offset(offset);

    // Filter by platform in JS (simpler than Drizzle type issues)
    const projects2 = platform 
      ? allProjects.filter((p: any) => p.platform === platform)
      : allProjects;

    // Get total count for pagination
    const totalCount = await db
      .select({ count: count() })
      .from(projects);

    // Get platform distribution
    const platformStats = await db
      .select({
        platform: projects.platform,
        count: count(),
      })
      .from(projects)
      .groupBy(projects.platform);

    logger.info('Project showcase fetched', { 
      count: projects2.length, 
      platform,
    });

    return NextResponse.json({
      projects: projects2.map((p: any) => ({
        id: p.projectId,
        name: p.projectName,
        description: p.description,
        platform: p.platform,
        repoUrl: p.repoUrl,
        stats: {
          deployments: Number(p.deploymentCount),
          lastDeployed: p.lastDeployed,
        },
        shareUrl: `${process.env.DEPLOY_AGENT_URL || 'http://localhost:3000'}/projects/${p.projectId}`,
        // In production: add screenshots, live URL, tags, etc.
      })),
      pagination: {
        limit,
        offset,
        total: Number(totalCount[0]?.count) || 0,
      },
      platformDistribution: platformStats,
    });

  } catch (error) {
    logger.error('Project showcase error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// Track share events (for marketing analytics)
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, platform, shareType } = body;

    if (!projectId || !platform || !shareType) {
      return NextResponse.json(
        { error: 'projectId, platform, and shareType are required' },
        { status: 400 }
      );
    }

    const validShareTypes = ['social', 'email', 'embed', 'direct'];
    if (!validShareTypes.includes(shareType)) {
      return NextResponse.json(
        { error: 'Invalid shareType' },
        { status: 400 }
      );
    }

    // In production, would insert into marketing_shares table
    // await db.insert(marketingShares).values({
    //   projectId,
    //   userId: user.id,
    //   platform,
    //   shareType,
    //   createdAt: new Date(),
    // });

    logger.info('Project shared', { projectId, platform, shareType, userId: user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Share tracking error', { error });
    return NextResponse.json(
      { error: 'Failed to track share' },
      { status: 500 }
    );
  }
}
