import { db } from '@/db';
import { subscriptions, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export type SubscriptionPlan = 'free' | 'pro' | 'team' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

export interface SubscriptionInfo {
  userId: number;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

const DEFAULT_PERIOD_DAYS = 30;

export async function getSubscription(userId: number): Promise<SubscriptionInfo> {
  const result = await db
    .select({
      userId: subscriptions.userId,
      plan: subscriptions.plan,
      status: subscriptions.status,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      stripeCustomerId: subscriptions.stripeCustomerId,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (result.length > 0) {
    const row = result[0];
    return {
      userId: row.userId,
      plan: row.plan as SubscriptionPlan,
      status: row.status as SubscriptionStatus,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      stripeCustomerId: row.stripeCustomerId,
      stripeSubscriptionId: row.stripeSubscriptionId,
    };
  }

  // Auto-create free subscription on first access
  const now = new Date();
  const periodEnd = new Date(now.getTime() + DEFAULT_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(subscriptions).values({
    userId,
    plan: 'free',
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
  });

  return {
    userId,
    plan: 'free',
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
  };
}

export async function updateSubscription(
  userId: number,
  plan: SubscriptionPlan
): Promise<SubscriptionInfo> {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + DEFAULT_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  // Upsert: insert if not exists, update if exists
  const existing = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(subscriptions)
      .set({
        plan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        updatedAt: now,
      })
      .where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      userId,
      plan,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    });
  }

  return {
    userId,
    plan,
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
  };
}

export async function cancelSubscription(userId: number): Promise<boolean> {
  const existing = await db
    .select({ id: subscriptions.id, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    return false;
  }

  const now = new Date();

  await db
    .update(subscriptions)
    .set({
      status: 'cancelled',
      cancelAtPeriodEnd: true,
      canceledAt: now,
      updatedAt: now,
    })
    .where(eq(subscriptions.userId, userId));

  return true;
}

export function getPlanFeatures(plan: SubscriptionPlan): string[] {
  const features: Record<SubscriptionPlan, string[]> = {
    free: [
      '3 projects',
      '10 deployments per day',
      '1 team member',
      '100MB storage',
      'Community support',
    ],
    pro: [
      '20 projects',
      '100 deployments per day',
      '5 team members',
      '1GB storage',
      'Priority support',
      'Custom domains',
    ],
    team: [
      'Unlimited projects',
      '1,000 deployments per day',
      '50 team members',
      '10GB storage',
      'SSO integration',
      'Sentry integration',
      '99.9% uptime SLA',
    ],
    enterprise: [
      'Unlimited everything',
      'Dedicated instance',
      'On-premise deployment',
      'Custom SLA',
      'Phone support',
    ],
  };

  return features[plan] || features.free;
}

export interface UsageLimit {
  plan: SubscriptionPlan;
  maxDeploymentsPerDay: number;
  maxProjects: number;
  maxTeamMembers: number;
  maxStorageBytes: number;
}

const PLAN_LIMITS: Record<SubscriptionPlan, UsageLimit> = {
  free: {
    plan: 'free',
    maxDeploymentsPerDay: 10,
    maxProjects: 3,
    maxTeamMembers: 1,
    maxStorageBytes: 100 * 1024 * 1024,
  },
  pro: {
    plan: 'pro',
    maxDeploymentsPerDay: 100,
    maxProjects: 20,
    maxTeamMembers: 5,
    maxStorageBytes: 1024 * 1024 * 1024,
  },
  team: {
    plan: 'team',
    maxDeploymentsPerDay: 1000,
    maxProjects: 100,
    maxTeamMembers: 50,
    maxStorageBytes: 10 * 1024 * 1024 * 1024,
  },
  enterprise: {
    plan: 'enterprise',
    maxDeploymentsPerDay: Infinity,
    maxProjects: Infinity,
    maxTeamMembers: Infinity,
    maxStorageBytes: Infinity,
  },
};

export function getPlanLimits(plan: SubscriptionPlan): UsageLimit {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export async function checkAllLimits(userId: number) {
  const sub = await getSubscription(userId);
  const limits = getPlanLimits(sub.plan);

  const { checkDeploymentLimit } = await import('./usage-tracking');
  const deploymentCheck = await checkDeploymentLimit(userId, sub.plan);

  const { checkProjectLimit } = await import('./usage-tracking');
  const projectCheck = await checkProjectLimit(userId, sub.plan);

  return {
    plan: sub.plan,
    status: sub.status,
    limits,
    checks: {
      deployments: deploymentCheck,
      projects: projectCheck,
    },
  };
}
