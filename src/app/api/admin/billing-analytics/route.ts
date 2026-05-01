import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { getSubscription, getPlanFeatures } from '@/lib/billing';
import { createLogger, generateRequestId } from '@/lib/logger';
import { db } from '@/db';
import { subscriptions, users } from '@/db/schema';
import { count, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  
  try {
    const user = await authenticate(request);
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Revenue analytics
    const [planDistribution, monthlyRevenue, userGrowth] = await Promise.all([
      // Plan distribution
      db.select({
        plan: subscriptions.plan,
        count: count(),
      })
        .from(subscriptions)
        .groupBy(subscriptions.plan),
      
      // Monthly revenue (simplified - would need real Stripe data)
      db.select({
        month: sql<string>`date_trunc('month', created_at)`,
        count: count(),
      })
        .from(subscriptions)
        .where(sql`created_at > now() - interval '6 months'`)
        .groupBy(sql`date_trunc('month', created_at)`)
        .orderBy(sql`date_trunc('month', created_at)`),
      
      // User growth with plan
      db.select({
        month: sql<string>`date_trunc('month', ${users.createdAt})`,
        free: sql<number>`count(*) filter (where ${subscriptions.plan} = 'free')`,
        pro: sql<number>`count(*) filter (where ${subscriptions.plan} = 'pro')`,
        team: sql<number>`count(*) filter (where ${subscriptions.plan} = 'team')`,
        enterprise: sql<number>`count(*) filter (where ${subscriptions.plan} = 'enterprise')`,
      })
        .from(users)
        .leftJoin(subscriptions, sql`${users.id} = ${subscriptions.userId}`)
        .where(sql`${users.createdAt} > now() - interval '6 months'`)
        .groupBy(sql`date_trunc('month', ${users.createdAt})`)
        .orderBy(sql`date_trunc('month', ${users.createdAt})`),
    ]);
    
    // Calculate estimated revenue (simplified)
    const planPrices: Record<string, number> = {
      free: 0,
      pro: 29,
      team: 99,
      enterprise: 499,
    };
    
    const revenueByPlan = planDistribution.map((p) => ({
      plan: p.plan,
      count: Number(p.count),
      revenue: Number(p.count) * (planPrices[p.plan] || 0),
    }));
    
    const totalRevenue = revenueByPlan.reduce((sum, p) => sum + p.revenue, 0);
    const totalSubscriptions = revenueByPlan.reduce((sum, p) => sum + p.count, 0);
    
    return NextResponse.json({
      summary: {
        totalRevenue,
        totalSubscriptions,
        averageRevenuePerUser: totalSubscriptions > 0 ? totalRevenue / totalSubscriptions : 0,
      },
      planDistribution: revenueByPlan,
      monthlyTrend: monthlyRevenue,
      userGrowthByPlan: userGrowth,
    });
    
  } catch (error) {
    logger.error('Billing analytics error', { error });
    return NextResponse.json({ error: 'Failed to fetch billing analytics' }, { status: 500 });
  }
}
