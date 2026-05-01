import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { hostingProviders, affiliateClicks, affiliateConversions, referralEvents, users } from '@/db/schema';
import { eq, count, sum, sql, and, gte } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await authenticate(request);
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Overall stats
    const overallStats = await db
      .select({
        totalClicks: count(affiliateClicks.id),
        totalConversions: count(affiliateConversions.id),
        totalCommission: sum(affiliateConversions.commissionEarned),
        pendingCommission: sql<number>`SUM(CASE WHEN ${affiliateConversions.status} = 'pending' THEN ${affiliateConversions.commissionEarned} ELSE 0 END)`,
        paidCommission: sql<number>`SUM(CASE WHEN ${affiliateConversions.status} = 'paid' THEN ${affiliateConversions.commissionEarned} ELSE 0 END)`,
        totalReferralEvents: count(referralEvents.id),
      })
      .from(affiliateClicks)
      .leftJoin(affiliateConversions, eq(affiliateClicks.providerId, affiliateConversions.providerId))
      .leftJoin(referralEvents, eq(affiliateClicks.providerId, referralEvents.providerId));

    // Per-provider stats
    const providerStats = await db
      .select({
        providerId: hostingProviders.id,
        providerName: hostingProviders.name,
        slug: hostingProviders.slug,
        commissionType: hostingProviders.commissionType,
        commissionRate: hostingProviders.commissionRate,
        clicks: count(affiliateClicks.id),
        conversions: sql<number>`COUNT(DISTINCT ${affiliateConversions.id})`,
        totalCommission: sum(affiliateConversions.commissionEarned),
        conversionValue: sum(affiliateConversions.conversionValue),
      })
      .from(hostingProviders)
      .leftJoin(affiliateClicks, eq(hostingProviders.id, affiliateClicks.providerId))
      .leftJoin(affiliateConversions, eq(hostingProviders.id, affiliateConversions.providerId))
      .groupBy(hostingProviders.id, hostingProviders.name, hostingProviders.slug, hostingProviders.commissionType, hostingProviders.commissionRate)
      .orderBy(hostingProviders.sortOrder);

    // Recent conversions
    const recentConversions = await db
      .select({
        id: affiliateConversions.id,
        providerName: hostingProviders.name,
        conversionType: affiliateConversions.conversionType,
        conversionValue: affiliateConversions.conversionValue,
        commissionEarned: affiliateConversions.commissionEarned,
        status: affiliateConversions.status,
        convertedAt: affiliateConversions.convertedAt,
      })
      .from(affiliateConversions)
      .leftJoin(hostingProviders, eq(affiliateConversions.providerId, hostingProviders.id))
      .where(gte(affiliateConversions.convertedAt, startDate))
      .orderBy(sql`${affiliateConversions.convertedAt} DESC`)
      .limit(50);

    // Click trends (daily)
    const clickTrends = await db
      .select({
        date: sql<string>`DATE(${affiliateClicks.clickedAt})`,
        clicks: count(affiliateClicks.id),
      })
      .from(affiliateClicks)
      .where(gte(affiliateClicks.clickedAt, startDate))
      .groupBy(sql`DATE(${affiliateClicks.clickedAt})`)
      .orderBy(sql`DATE(${affiliateClicks.clickedAt})`);

    // Recent referral events
    const recentReferralEvents = await db
      .select({
        id: referralEvents.id,
        providerName: hostingProviders.name,
        eventType: referralEvents.eventType,
        createdAt: referralEvents.createdAt,
        userName: sql<string>`${users.name}`,
      })
      .from(referralEvents)
      .leftJoin(hostingProviders, eq(referralEvents.providerId, hostingProviders.id))
      .leftJoin(users, eq(referralEvents.userId, users.id))
      .where(gte(referralEvents.createdAt, startDate))
      .orderBy(sql`${referralEvents.createdAt} DESC`)
      .limit(50);

    const stats = overallStats[0] || {
      totalClicks: 0,
      totalConversions: 0,
      totalCommission: 0,
      pendingCommission: 0,
      paidCommission: 0,
      totalReferralEvents: 0,
    };

    return NextResponse.json({
      summary: {
        totalClicks: stats.totalClicks,
        totalConversions: stats.totalConversions,
        conversionRate: stats.totalClicks > 0 ? ((stats.totalConversions / stats.totalClicks) * 100).toFixed(2) : '0.00',
        totalCommission: Number(stats.totalCommission || 0) / 100,
        pendingCommission: Number(stats.pendingCommission || 0) / 100,
        paidCommission: Number(stats.paidCommission || 0) / 100,
        totalReferralEvents: stats.totalReferralEvents,
      },
      providerStats: providerStats.map((p: any) => ({
        ...p,
        totalCommission: Number(p.totalCommission || 0) / 100,
        conversionValue: Number(p.conversionValue || 0) / 100,
        conversionRate: p.clicks > 0 ? ((Number(p.conversions) || 0) / p.clicks * 100).toFixed(2) : '0.00',
      })),
      recentConversions,
      recentReferralEvents,
      clickTrends,
    });
  } catch (error) {
    console.error('Failed to get hosting analytics:', error);
    return NextResponse.json({ error: 'Failed to get analytics' }, { status: 500 });
  }
}
