import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deployments, projects, users, startupHealthScores } from '@/db/schema';
import { count, sql, avg, eq, gte, lte } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

interface HealthMetrics {
  deploymentSuccessRate: number;
  avgBuildTime: number;
  errorFrequency: number;
  deploymentFrequency: number;
  platformDiversity: number;
  // Weighted score components
  weights: {
    successRate: number; // 40%
    buildTime: number; // 20%
    errorHandling: number; // 20%
    frequency: number; // 10%
    diversity: number; // 10%
  };
}

function calculateHealthScore(metrics: HealthMetrics): { score: number; recommendations: string[] } {
  const recommendations: string[] = [];
  
  // Success rate score (0-40 points)
  let successScore = 0;
  if (metrics.deploymentSuccessRate >= 95) successScore = 40;
  else if (metrics.deploymentSuccessRate >= 90) successScore = 35;
  else if (metrics.deploymentSuccessRate >= 80) successScore = 25;
  else if (metrics.deploymentSuccessRate >= 70) successScore = 15;
  else successScore = 5;
  
  if (metrics.deploymentSuccessRate < 90) {
    recommendations.push('Improve deployment success rate (currently ' + metrics.deploymentSuccessRate.toFixed(1) + '%)');
  }
  
  // Build time score (0-20 points) - lower is better
  let buildTimeScore = 0;
  const avgBuildSec = metrics.avgBuildTime / 1000;
  if (avgBuildSec <= 60) buildTimeScore = 20;
  else if (avgBuildSec <= 120) buildTimeScore = 15;
  else if (avgBuildSec <= 300) buildTimeScore = 10;
  else buildTimeScore = 5;
  
  if (avgBuildSec > 120) {
    recommendations.push('Optimize build time (currently ' + Math.round(avgBuildSec) + 's)');
  }
  
  // Error handling score (0-20 points) - based on error frequency
  let errorScore = 0;
  if (metrics.errorFrequency <= 5) errorScore = 20;
  else if (metrics.errorFrequency <= 10) errorScore = 15;
  else if (metrics.errorFrequency <= 20) errorScore = 10;
  else errorScore = 5;
  
  if (metrics.errorFrequency > 10) {
    recommendations.push('Reduce error frequency (currently ' + metrics.errorFrequency.toFixed(1) + '%)');
  }
  
  // Deployment frequency score (0-10 points)
  let freqScore = 0;
  if (metrics.deploymentFrequency >= 10) freqScore = 10;
  else if (metrics.deploymentFrequency >= 5) freqScore = 7;
  else if (metrics.deploymentFrequency >= 2) freqScore = 5;
  else freqScore = 2;
  
  if (metrics.deploymentFrequency < 5) {
    recommendations.push('Increase deployment frequency for faster iteration');
  }
  
  // Platform diversity bonus (0-10 points)
  let diversityScore = Math.min(metrics.platformDiversity * 5, 10);
  
  const totalScore = successScore + buildTimeScore + errorScore + freqScore + diversityScore;
  
  if (totalScore < 50) {
    recommendations.push('Overall health needs significant improvement');
  } else if (totalScore < 80) {
    recommendations.push('Good progress! Focus on the items above to reach 80+ score');
  } else {
    recommendations.push('Excellent! Your startup deployment health is in great shape');
  }
  
  return { score: totalScore, recommendations };
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const days = parseInt(searchParams.get('days') || '30');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get user's projects
    const userProjects = await db.select({
      id: projects.id,
      name: projects.name,
      platform: projects.platform,
    })
      .from(projects)
      .where(eq(projects.userId, user.id));
    
    const projectIds = projectId 
      ? [parseInt(projectId)]
      : userProjects.map(p => p.id);
    
    // Get deployment metrics
    const deploymentMetrics = await db.select({
      total: count(),
      successful: sql<number>`count(*) filter (where ${deployments.status} = 'ready')`,
      failed: sql<number>`count(*) filter (where ${deployments.status} = 'error')`,
      avgBuildTime: avg(deployments.buildTime),
    })
      .from(deployments)
      .where(sql`${deployments.projectId} IN ${projectIds} AND ${deployments.createdAt} >= ${startDate}`);
    
    const total = Number(deploymentMetrics[0]?.total) || 0;
    const successful = Number(deploymentMetrics[0]?.successful) || 0;
    const failed = Number(deploymentMetrics[0]?.failed) || 0;
    const avgBuildTime = Number(deploymentMetrics[0]?.avgBuildTime) || 0;
    
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    const errorFrequency = total > 0 ? (failed / total) * 100 : 0;
    
    // Deployment frequency (deployments per day)
    const frequency = total / days;
    
    // Platform diversity
    const uniquePlatforms = new Set(userProjects.map(p => p.platform)).size;
    
    const metrics: HealthMetrics = {
      deploymentSuccessRate: successRate,
      avgBuildTime,
      errorFrequency,
      deploymentFrequency: frequency,
      platformDiversity: uniquePlatforms,
      weights: {
        successRate: successRate,
        buildTime: avgBuildTime,
        errorHandling: errorFrequency,
        frequency,
        diversity: uniquePlatforms,
      },
    };
    
    const { score, recommendations } = calculateHealthScore(metrics);
    
    // Save to database
    await db.insert(startupHealthScores)
      .values({
        userId: user.id,
        projectId: projectId ? parseInt(projectId) : null,
        score,
        metrics: metrics as any,
        recommendations: recommendations as any,
      })
      .onConflictDoNothing(); // Avoid duplicates, just insert new
    
    logger.info('Health score calculated', { userId: user.id, score, projectId });
    
    return NextResponse.json({
      score,
      metrics: {
        successRate: Math.round(successRate * 10) / 10,
        avgBuildTimeSeconds: Math.round(avgBuildTime / 1000 * 10) / 10,
        errorFrequency: Math.round(errorFrequency * 10) / 10,
        deploymentFrequency: Math.round(frequency * 10) / 10,
        totalDeployments: total,
        uniquePlatforms,
      },
      recommendations,
      rating: score >= 80 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Improvement',
    });
    
  } catch (error) {
    logger.error('Health score error', { error });
    return NextResponse.json(
      { error: 'Failed to calculate health score' },
      { status: 500 }
    );
  }
}
