import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deployments, projects, users } from '@/db/schema';
import { count, sql, gte, eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

// Demand tracking table - tracks interest in deployed projects
// This would be created in schema (adding here for reference)
// export const projectDemand = pgTable('project_demand', {
//   id: serial('id').primaryKey(),
//   projectId: integer('project_id').references(() => projects.id),
//   userId: integer('user_id').references(() => users.id), // user viewing the project
//   action: varchar('action', { length: 50 }).notNull(), // 'view', 'star', 'fork', 'clone', 'deploy'
//   metadata: jsonb('metadata'), // additional context
//   createdAt: timestamp('created_at').defaultNow().notNull(),
// });

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, action, metadata } = body;

    if (!projectId || !action) {
      return NextResponse.json(
        { error: 'projectId and action are required' },
        { status: 400 }
      );
    }

    // Validate action type
    const validActions = ['view', 'star', 'fork', 'clone', 'deploy', 'share', 'click'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action type' },
        { status: 400 }
      );
    }

    // In production, would insert into projectDemand table
    // await db.insert(projectDemand).values({
    //   projectId,
    //   userId: user.id,
    //   action,
    //   metadata: metadata || null,
    // });

    logger.info('Demand action tracked', { projectId, action, userId: user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Demand tracking error', { error });
    return NextResponse.json(
      { error: 'Failed to track demand' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const days = parseInt(searchParams.get('days') || '30');

    // Get deployment stats for projects (as proxy for demand)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Most deployed projects (indicating demand)
    const topProjects = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        platform: projects.platform,
        deploymentCount: count(deployments.id),
        lastDeployed: sql<string>`MAX(${deployments.createdAt})`,
      })
      .from(deployments)
      .innerJoin(projects, eq(deployments.projectId, projects.id))
      .where(gte(deployments.createdAt, startDate))
      .groupBy(projects.id, projects.name, projects.platform)
      .orderBy(sql`count(${deployments.id}) DESC`)
      .limit(20);

    // Deployment trends (demand over time)
    const demandTrend = await db
      .select({
        date: sql<string>`DATE(${deployments.createdAt})`,
        count: count(),
        uniqueProjects: sql<number>`COUNT(DISTINCT ${deployments.projectId})`,
      })
      .from(deployments)
      .where(gte(deployments.createdAt, startDate))
      .groupBy(sql`DATE(${deployments.createdAt})`)
      .orderBy(sql`DATE(${deployments.createdAt})`);

    // Platform demand distribution
    const platformDemand = await db
      .select({
        platform: projects.platform,
        deploymentCount: count(deployments.id),
        projectCount: sql<number>`COUNT(DISTINCT ${projects.id})`,
      })
      .from(deployments)
      .innerJoin(projects, eq(deployments.projectId, projects.id))
      .where(gte(deployments.createdAt, startDate))
      .groupBy(projects.platform)
      .orderBy(sql`count(${deployments.id}) DESC`);

    // Calculate demand score for each project
    const projectsWithScore = topProjects.map((p: any) => {
      const score = calculateDemandScore(
        Number(p.deploymentCount),
        new Date(p.lastDeployed),
        days
      );
      return {
        ...p,
        demandScore: score,
        rating: score >= 80 ? 'Hot' : score >= 50 ? 'Trending' : 'Normal',
      };
    });

    logger.info('Demand analytics fetched', { days, projectCount: projectsWithScore.length });

    return NextResponse.json({
      summary: {
        totalTrackedActions: demandTrend.reduce((sum: number, d: any) => sum + Number(d.count), 0),
        uniqueProjects: demandTrend.length > 0
          ? Math.max(...demandTrend.map((d: any) => Number(d.uniqueProjects)))
          : 0,
        topPlatform: platformDemand[0]?.platform || 'none',
      },
      topProjects: projectsWithScore,
      demandTrend,
      platformDemand,
      insights: {
        hottestProject: projectsWithScore[0] || null,
        trendingPlatforms: platformDemand.filter((p: any) => Number(p.deploymentCount) > 10),
      },
    });
  } catch (error) {
    logger.error('Demand analytics error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch demand analytics' },
      { status: 500 }
    );
  }
}

function calculateDemandScore(
  deploymentCount: number,
  lastDeployed: Date,
  days: number
): number {
  let score = 0;

  // Deployment frequency (0-40 points)
  const freqPerDay = deploymentCount / days;
  if (freqPerDay >= 1) score += 40;
  else if (freqPerDay >= 0.5) score += 30;
  else if (freqPerDay >= 0.1) score += 20;
  else score += 10;

  // Recency (0-30 points)
  const daysSinceLastDeploy = (Date.now() - lastDeployed.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLastDeploy <= 1) score += 30;
  else if (daysSinceLastDeploy <= 7) score += 20;
  else if (daysSinceLastDeploy <= 30) score += 10;

  // Volume bonus (0-30 points)
  if (deploymentCount >= 100) score += 30;
  else if (deploymentCount >= 50) score += 20;
  else if (deploymentCount >= 10) score += 10;

  return Math.min(score, 100);
}
