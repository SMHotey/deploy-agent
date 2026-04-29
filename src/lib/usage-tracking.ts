import { db } from '@/db';
import { usageRecords, projects } from '@/db/schema';
import { and, eq, gte, lte, count } from 'drizzle-orm';

export interface UsageSummary {
  deployments: number;
  apiCalls: number;
  storageBytes: number;
  projects: number;
}

export interface UsageLimit {
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  maxDeploymentsPerDay: number;
  maxProjects: number;
  maxTeamMembers: number;
  maxStorageBytes: number;
}

const PLAN_LIMITS: Record<string, UsageLimit> = {
  free: {
    plan: 'free',
    maxDeploymentsPerDay: 10,
    maxProjects: 3,
    maxTeamMembers: 1,
    maxStorageBytes: 100 * 1024 * 1024, // 100MB
  },
  pro: {
    plan: 'pro',
    maxDeploymentsPerDay: 100,
    maxProjects: 20,
    maxTeamMembers: 5,
    maxStorageBytes: 1024 * 1024 * 1024, // 1GB
  },
  team: {
    plan: 'team',
    maxDeploymentsPerDay: 1000,
    maxProjects: 100,
    maxTeamMembers: 50,
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10GB
  },
  enterprise: {
    plan: 'enterprise',
    maxDeploymentsPerDay: Infinity,
    maxProjects: Infinity,
    maxTeamMembers: Infinity,
    maxStorageBytes: Infinity,
  },
};

export function getPlanLimits(plan: string): UsageLimit {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export async function recordUsage(
  params: {
    userId?: number;
    teamId?: number;
    action: string;
    quantity?: number;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    await db.insert(usageRecords).values({
      userId: params.userId || null,
      teamId: params.teamId || null,
      action: params.action,
      quantity: params.quantity || 1,
      metadata: params.metadata || null,
    });
  } catch (error) {
    console.error('Failed to record usage:', error);
  }
}

export async function getUsageSummary(
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<UsageSummary> {
  try {
    const records = await db
      .select()
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.userId, userId),
          gte(usageRecords.recordedAt, startDate),
          lte(usageRecords.recordedAt, endDate)
        )
      );

    const summary: UsageSummary = {
      deployments: 0,
      apiCalls: 0,
      storageBytes: 0,
      projects: 0,
    };

    for (const record of records) {
      switch (record.action) {
        case 'deployment':
          summary.deployments += record.quantity || 1;
          break;
        case 'api_call':
          summary.apiCalls += record.quantity || 1;
          break;
        case 'storage':
          summary.storageBytes += record.quantity || 0;
          break;
        case 'project_created':
          summary.projects += record.quantity || 1;
          break;
      }
    }

    return summary;
  } catch (error) {
    console.error('Failed to get usage summary:', error);
    return { deployments: 0, apiCalls: 0, storageBytes: 0, projects: 0 };
  }
}

export async function checkDeploymentLimit(
  userId: number,
  plan: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limits = getPlanLimits(plan);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const usage = await getUsageSummary(userId, today, tomorrow);
  
  return {
    allowed: usage.deployments < limits.maxDeploymentsPerDay,
    current: usage.deployments,
    limit: limits.maxDeploymentsPerDay,
  };
}

export async function checkProjectLimit(
  userId: number,
  plan: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limits = getPlanLimits(plan);
  
  // Get total projects count
  const result = await db
    .select({ count: count() })
    .from(projects)
    .where(eq(projects.userId, userId));
  
  const projectCount = result[0]?.count || 0;
  
  return {
    allowed: projectCount < limits.maxProjects,
    current: projectCount,
    limit: limits.maxProjects,
  };
}
