import { NextResponse } from 'next/server';
import { db } from '@/db';
import { deployments, projects } from '@/db/schema';
import { sql, eq, desc, count, avg, gte, lte, and } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total deployments and success rate
    const totalResult = await db.select({
      total: count(),
      successful: sql<number>`count(*) filter (where ${deployments.status} = 'ready')`,
      failed: sql<number>`count(*) filter (where ${deployments.status} = 'error')`,
      building: sql<number>`count(*) filter (where ${deployments.status} = 'building')`,
      avgBuildTime: avg(deployments.buildTime),
    }).from(deployments);

    // Deployments by platform
    const platformResult = await db.select({
      platform: projects.platform,
      count: count(),
    })
    .from(deployments)
    .innerJoin(projects, eq(deployments.projectId, projects.id))
    .groupBy(projects.platform);

    // Deployments by status
    const statusResult = await db.select({
      status: deployments.status,
      count: count(),
    })
    .from(deployments)
    .groupBy(deployments.status);

    // Daily deployment counts for chart
    const dailyResult = await db.select({
      date: sql<string>`date(${deployments.createdAt})`,
      count: count(),
      successful: sql<number>`count(*) filter (where ${deployments.status} = 'ready')`,
      failed: sql<number>`count(*) filter (where ${deployments.status} = 'error')`,
    })
    .from(deployments)
    .where(gte(deployments.createdAt, startDate))
    .groupBy(sql`date(${deployments.createdAt})`)
    .orderBy(sql`date(${deployments.createdAt})`);

    // Top projects by deployment count
    const topProjects = await db.select({
      projectId: projects.id,
      projectName: projects.name,
      platform: projects.platform,
      count: count(),
      lastDeployed: sql<string>`max(${deployments.createdAt})`,
    })
    .from(deployments)
    .innerJoin(projects, eq(deployments.projectId, projects.id))
    .groupBy(projects.id, projects.name, projects.platform)
    .orderBy(desc(count()))
    .limit(10);

    // Preview vs Production
    const previewResult = await db.select({
      isPreview: deployments.isPreview,
      count: count(),
    })
    .from(deployments)
    .groupBy(deployments.isPreview);

    const total = totalResult[0]?.total || 0;
    const successful = totalResult[0]?.successful || 0;
    const failed = totalResult[0]?.failed || 0;
    const avgBuildTimeMs = totalResult[0]?.avgBuildTime ? Math.round(parseFloat(totalResult[0].avgBuildTime)) : 0;

    return NextResponse.json({
      summary: {
        totalDeployments: total,
        successfulDeployments: successful,
        failedDeployments: failed,
        successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
        errorRate: total > 0 ? Math.round((failed / total) * 100) : 0,
        avgBuildTimeSeconds: avgBuildTimeMs ? Math.round(avgBuildTimeMs / 1000) : 0,
      },
      byPlatform: platformResult.map((r) => ({
        platform: r.platform || 'unknown',
        count: r.count,
        percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
      })),
      byStatus: statusResult.map((r) => ({
        status: r.status,
        count: r.count,
        percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
      })),
      dailyTrend: dailyResult.map((r) => ({
        date: r.date,
        total: r.count,
        successful: r.successful,
        failed: r.failed,
      })),
      topProjects: topProjects.map((p) => ({
        id: p.projectId,
        name: p.projectName,
        platform: p.platform,
        deployments: p.count,
        lastDeployed: p.lastDeployed,
      })),
      byType: {
        preview: previewResult.find((r) => r.isPreview === true)?.count || 0,
        production: previewResult.find((r) => r.isPreview === false)?.count || 0,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
