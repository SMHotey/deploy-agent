import { getPlanLimits, UsageLimit } from './usage-tracking';

export type SubscriptionPlan = 'free' | 'pro' | 'team' | 'enterprise';

export interface Subscription {
  userId: number;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

// In-memory storage for demo (in production, store in DB)
const userSubscriptions = new Map<number, Subscription>();

export function getSubscription(userId: number): Subscription {
  // Default to 'free' plan if no subscription found
  return userSubscriptions.get(userId) || {
    userId,
    plan: 'free',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    cancelAtPeriodEnd: false,
  };
}

export function updateSubscription(
  userId: number,
  plan: SubscriptionPlan
): Subscription {
  const subscription: Subscription = {
    userId,
    plan,
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
  };
  
  userSubscriptions.set(userId, subscription);
  return subscription;
}

export function cancelSubscription(userId: number): boolean {
  const sub = userSubscriptions.get(userId);
  if (sub) {
    sub.status = 'cancelled';
    sub.cancelAtPeriodEnd = true;
    userSubscriptions.set(userId, sub);
    return true;
  }
  return false;
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

export async function checkAllLimits(userId: number) {
  const sub = getSubscription(userId);
  const limits = getPlanLimits(sub.plan);
  
  // Check deployment limit
  const { checkDeploymentLimit } = await import('./usage-tracking');
  const deploymentCheck = await checkDeploymentLimit(userId, sub.plan);
  
  // Check project limit
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
