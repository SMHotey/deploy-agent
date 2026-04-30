import { db } from '@/db';
import { subscriptions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

let stripe: any;
try {
  if (STRIPE_SECRET_KEY) {
    const Stripe = require('stripe');
    stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' as any });
  }
} catch {
  // Stripe not available without key
}

export interface PlanConfig {
  name: string;
  priceId: string; // Stripe Price ID
  maxDeploymentsPerDay: number;
  maxProjects: number;
  maxTeamMembers: number;
  maxStorageBytes: number;
  features: string[];
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    name: 'Free',
    priceId: '',
    maxDeploymentsPerDay: 3,
    maxProjects: 3,
    maxTeamMembers: 1,
    maxStorageBytes: 100 * 1024 * 1024, // 100MB
    features: [
      '3 projects',
      '10 deployments/day',
      '1 team member',
      '100MB storage',
      'Community support',
    ],
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRICE_PRO_ID || 'price_pro_mock',
    maxDeploymentsPerDay: 100,
    maxProjects: 20,
    maxTeamMembers: 5,
    maxStorageBytes: 1024 * 1024 * 1024, // 1GB
    features: [
      '20 projects',
      '100 deployments/day',
      '5 team members',
      '1GB storage',
      'Priority support',
      'Custom domains',
    ],
  },
  team: {
    name: 'Team',
    priceId: process.env.STRIPE_PRICE_TEAM_ID || 'price_team_mock',
    maxDeploymentsPerDay: 1000,
    maxProjects: Infinity,
    maxTeamMembers: 50,
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10GB
    features: [
      'Unlimited projects',
      '1,000 deployments/day',
      '50 team members',
      '10GB storage',
      'SSO',
      'Sentry integration',
      '99.9% SLA',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_PRICE_ENTERPRISE_ID || 'price_enterprise_mock',
    maxDeploymentsPerDay: Infinity,
    maxProjects: Infinity,
    maxTeamMembers: Infinity,
    maxStorageBytes: Infinity,
    features: [
      'Unlimited everything',
      'Dedicated instance',
      'On-premise option',
      'Custom SLA',
      'Phone support',
    ],
  },
};

export function getPlanFeatures(plan: string): string[] {
  return PLANS[plan]?.features || PLANS.free.features;
}

export async function getSubscription(userId: number) {
  const [sub] = await db.select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!sub) {
    const [newSub] = await db.insert(subscriptions).values({
      userId,
      plan: 'free',
      status: 'active',
    }).returning();
    return newSub || { plan: 'free', status: 'active', cancelAtPeriodEnd: false };
  }

  return sub;
}

export async function updateSubscription(userId: number, plan: string): Promise<any> {
  const planConfig = PLANS[plan];
  if (!planConfig) throw new Error(`Invalid plan: ${plan}`);

  const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);

  if (existing) {
    const [updated] = await db.update(subscriptions)
      .set({ plan: plan as any, updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId))
      .returning();
    return updated;
  } else {
    const [created] = await db.insert(subscriptions).values({
      userId,
      plan: plan as any,
      status: 'active',
    }).returning();
    return created;
  }
}

export async function cancelSubscription(userId: number): Promise<boolean> {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (!sub) return false;

  await db.update(subscriptions).set({
    cancelAtPeriodEnd: true,
    updatedAt: new Date(),
  }).where(eq(subscriptions.userId, userId));

  return true;
}

export async function checkAllLimits(userId: number) {
  const sub = await getSubscription(userId);
  const planConfig = PLANS[sub.plan] || PLANS.free;

  const { deployments, projects: projectsTable } = await import('@/db/schema');
  const { count, eq } = await import('drizzle-orm');

  const [deploymentCount, projectCount] = await Promise.all([
    db.select({ count: count() }).from(deployments)
      .then(r => Number(r[0]?.count || 0)),
    db.select({ count: count() }).from(projectsTable)
      .then(r => Number(r[0]?.count || 0)),
  ]);

  return {
    plan: sub.plan,
    checks: {
      deployments: { allowed: deploymentCount < planConfig.maxDeploymentsPerDay, current: deploymentCount, limit: planConfig.maxDeploymentsPerDay },
      projects: { allowed: projectCount < planConfig.maxProjects, current: projectCount, limit: planConfig.maxProjects },
    },
    maxDeploymentsPerDay: planConfig.maxDeploymentsPerDay,
    maxProjects: planConfig.maxProjects,
    maxTeamMembers: planConfig.maxTeamMembers,
    maxStorageBytes: planConfig.maxStorageBytes,
  };
}

export function getStripe() {
  if (!stripe) throw new Error('Stripe not initialized. Set STRIPE_SECRET_KEY.');
  return stripe;
}

export async function createCheckoutSession(userId: number, plan: string, userEmail: string) {
  const planConfig = PLANS[plan];
  if (!planConfig || !planConfig.priceId || planConfig.priceId.includes('mock')) {
    throw new Error(`No Stripe price ID configured for plan: ${plan}`);
  }

  const stripe = getStripe();

  // Get or create Stripe customer
  let customerId: string;
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);

  if (sub?.stripeCustomerId) {
    customerId = sub.stripeCustomerId;
  } else {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { userId: String(userId) },
    });
    customerId = customer.id;

    if (sub) {
      await db.update(subscriptions).set({ stripeCustomerId: customerId }).where(eq(subscriptions.id, sub.id));
    }
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?canceled=true`,
    metadata: { userId: String(userId), plan },
  });

  return { sessionId: session.id, url: session.url };
}

export async function handleWebhook(body: string, signature: string) {
  const stripe = getStripe();

  const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any;
      const userId = parseInt(session.metadata.userId);
      const plan = session.metadata.plan;

      if (userId && plan) {
        await updateSubscription(userId, plan);
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any;
      // Find user by stripeCustomerId
      const [sub] = await db.select().from(subscriptions)
        .where(eq(subscriptions.stripeCustomerId, subscription.customer))
        .limit(1);

      if (sub) {
        await db.update(subscriptions).set({
          status: subscription.status === 'active' ? 'active' as any : 'cancelled' as any,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        }).where(eq(subscriptions.id, sub.id));
      }
      break;
    }
  }

  return { received: true };
}
