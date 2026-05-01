import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deployments, projects, users, subscriptions } from '@/db/schema';
import { count, sql, min, avg } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) return authResult;

    // 1. Time to first successful deploy (startup speed metric)
    const firstDeployTimes = await db.execute(sql`
      SELECT 
        u.id as user_id,
        u.created_at as signup_time,
        MIN(d.created_at) as first_deploy_time,
        EXTRACT(EPOCH FROM (MIN(d.created_at) - u.created_at)) / 60 as minutes_to_first_deploy
      FROM ${users} u
      LEFT JOIN ${projects} p ON p.user_id = u.id
      LEFT JOIN ${deployments} d ON d.project_id = p.id AND d.status = 'ready'
      WHERE d.id IS NOT NULL
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT 100
    `);

    // 2. Deployment success rate by user tenure
    const successRateByTenure = await db.execute(sql`
      SELECT 
        CASE 
          WHEN u.created_at > NOW() - INTERVAL '7 days' THEN '0-7 days'
          WHEN u.created_at > NOW() - INTERVAL '30 days' THEN '8-30 days'
          WHEN u.created_at > NOW() - INTERVAL '90 days' THEN '31-90 days'
          ELSE '90+ days'
        END as tenure,
        COUNT(*) as total_deployments,
        COUNT(*) FILTER (WHERE d.status = 'ready') as successful,
        ROUND(COUNT(*) FILTER (WHERE d.status = 'ready') * 100.0 / COUNT(*), 2) as success_rate
      FROM ${users} u
      JOIN ${projects} p ON p.user_id = u.id
      JOIN ${deployments} d ON d.project_id = p.id
      GROUP BY tenure
      ORDER BY 
        CASE tenure
          WHEN '0-7 days' THEN 1
          WHEN '8-30 days' THEN 2
          WHEN '31-90 days' THEN 3
          ELSE 4
        END
    `);

    // 3. Most common failure reasons
    const failureReasons = await db.execute(sql`
      SELECT 
        error_message,
        COUNT(*) as failure_count
      FROM ${deployments}
      WHERE status = 'error' AND error_message IS NOT NULL
      GROUP BY error_message
      ORDER BY failure_count DESC
      LIMIT 10
    `);

    // 4. Popular platforms among startups
    const platformDistribution = await db.execute(sql`
      SELECT 
        p.platform,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(d.id) as deployment_count,
        ROUND(COUNT(d.id) * 100.0 / SUM(COUNT(d.id)) OVER (), 2) as percentage
      FROM ${users} u
      JOIN ${projects} p ON p.user_id = u.id
      LEFT JOIN ${deployments} d ON d.project_id = p.id
      GROUP BY p.platform
      ORDER BY user_count DESC
    `);

    // 5. Average build time trends
    const buildTimeTrend = await db.execute(sql`
      SELECT 
        DATE_TRUNC('week', d.created_at) as week,
        AVG(d.build_time) as avg_build_time_ms,
        COUNT(*) as deployment_count
      FROM ${deployments} d
      WHERE d.build_time IS NOT NULL
        AND d.created_at > NOW() - INTERVAL '8 weeks'
      GROUP BY week
      ORDER BY week
    `);

    // 6. Template adoption (if templates table exists)
    // Skipped for now - will be added in Phase 3

    // 7. Health score distribution (if health_scores table exists)
    // Skipped for now - will be added in Phase 4

    // Calculate aggregate metrics
    const avgFirstDeployTime = firstDeployTimes.rows.length > 0
      ? (firstDeployTimes.rows.reduce((sum: number, row: any) => 
          sum + Number(row.minutes_to_first_deploy || 0), 0) / firstDeployTimes.rows.length)
      : 0;

    const fastDeployUsers = firstDeployTimes.rows.filter((row: any) => 
      Number(row.minutes_to_first_deploy) <= 10
    ).length;
    const fastDeployPercentage = firstDeployTimes.rows.length > 0
      ? (fastDeployUsers / firstDeployTimes.rows.length) * 100
      : 0;

    return NextResponse.json({
      startupMetrics: {
        timeToFirstDeploy: {
          averageMinutes: Math.round(avgFirstDeployTime * 10) / 10,
          fastDeployPercentage: Math.round(fastDeployPercentage * 10) / 10,
          target: 10, // Target: 80% under 10 min
          totalUsersAnalyzed: firstDeployTimes.rows.length,
        },
        successRateByTenure: successRateByTenure.rows,
        topFailureReasons: failureReasons.rows,
        platformDistribution: platformDistribution.rows,
        buildTimeTrend: buildTimeTrend.rows,
      },
      insights: {
        averageTimeToDeploy: avgFirstDeployTime < 10 
          ? 'Good: Average time under 10 minutes' 
          : 'Needs improvement: Average time exceeds 10 minutes',
        fastDeployRate: fastDeployPercentage > 80
          ? 'Good: Over 80% of users deploy within 10 minutes'
          : 'Focus area: Only ' + fastDeployPercentage.toFixed(1) + '% deploy within 10 minutes',
      },
    });

  } catch (error) {
    logger.error('Startup analytics error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch startup analytics' },
      { status: 500 }
    );
  }
}
