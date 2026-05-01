import { NextResponse } from 'next/server';
import { db } from '@/db';
import { deployments, projects } from '@/db/schema';
import { sql, eq, desc, count, avg, gte, lte, and } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const format = searchParams.get('format') || 'json';

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

    const analyticsData = {
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
    };

    if (format === 'csv') {
      // Generate CSV
      const csvRows = [];
      
      // Summary section
      csvRows.push('Section,Metric,Value');
      csvRows.push(`Summary,Total Deployments,${analyticsData.summary.totalDeployments}`);
      csvRows.push(`Summary,Successful,${analyticsData.summary.successfulDeployments}`);
      csvRows.push(`Summary,Failed,${analyticsData.summary.failedDeployments}`);
      csvRows.push(`Summary,Success Rate (%),${analyticsData.summary.successRate}`);
      csvRows.push(`Summary,Error Rate (%),${analyticsData.summary.errorRate}`);
      csvRows.push(`Summary,Avg Build Time (s),${analyticsData.summary.avgBuildTimeSeconds}`);
      csvRows.push('');
      
      // By Platform
      csvRows.push('Platform,Count,Percentage');
      analyticsData.byPlatform.forEach((p) => {
        csvRows.push(`${p.platform},${p.count},${p.percentage}%`);
      });
      csvRows.push('');
      
      // By Status
      csvRows.push('Status,Count,Percentage');
      analyticsData.byStatus.forEach((s) => {
        csvRows.push(`${s.status},${s.count},${s.percentage}%`);
      });
      csvRows.push('');
      
      // Daily Trend
      csvRows.push('Date,Total,Successful,Failed');
      analyticsData.dailyTrend.forEach((d) => {
        csvRows.push(`${d.date},${d.total},${d.successful},${d.failed}`);
      });
      csvRows.push('');
      
      // Top Projects
      csvRows.push('Project ID,Name,Platform,Deployments,Last Deployed');
      analyticsData.topProjects.forEach((p) => {
        csvRows.push(`${p.id},"${p.name}",${p.platform},${p.deployments},${p.lastDeployed}`);
      });
      csvRows.push('');
      
      // By Type
      csvRows.push('Type,Count');
      csvRows.push(`Production,${analyticsData.byType.production}`);
      csvRows.push(`Preview,${analyticsData.byType.preview}`);
      
      const csvContent = csvRows.join('\n');
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    } else {
      // JSON format
      return NextResponse.json(analyticsData);
    }
  } catch (error) {
    console.error('Analytics export error:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics' },
      { status: 500 }
    );
  }
}
