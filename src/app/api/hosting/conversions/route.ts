import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { hostingProviders, affiliateConversions } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Webhook endpoint for affiliate network conversion notifications
 * Called by hosting providers when a referral converts (signup, payment, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (implement per provider)
    const signature = request.headers.get('x-webhook-signature');
    const providerSlug = request.headers.get('x-provider-slug');

    if (!providerSlug) {
      return NextResponse.json({ error: 'Missing provider slug' }, { status: 400 });
    }

    const provider = await db.select()
      .from(hostingProviders)
      .where(eq(hostingProviders.slug, providerSlug))
      .limit(1);

    if (!provider.length) {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
    }

    const body = await request.json();
    const {
      externalId,
      userId,
      projectId,
      conversionType,
      conversionValue, // in cents
    } = body;

    // Calculate commission
    const commRate = provider[0].commissionRate;
    let commissionEarned = 0;

    if (commRate) {
      // Parse commission rate (e.g., "$20 per signup", "15%", "$0.50 per click")
      if (commRate.includes('%')) {
        const percent = parseFloat(commRate.replace('%', ''));
        commissionEarned = Math.round((conversionValue || 0) * (percent / 100));
      } else if (commRate.includes('$')) {
        const amount = parseFloat(commRate.replace(/[^\d.]/g, ''));
        commissionEarned = Math.round(amount * 100); // convert to cents
      }
    }

    const conversion = await db.insert(affiliateConversions).values({
      providerId: provider[0].id,
      userId: userId || null,
      projectId: projectId || null,
      conversionType: conversionType || 'signup',
      conversionValue: conversionValue || 0,
      commissionEarned,
      externalId: externalId || null,
      status: 'pending',
    }).returning();

    return NextResponse.json({ success: true, conversion: conversion[0] });
  } catch (error) {
    console.error('Failed to record conversion:', error);
    return NextResponse.json({ error: 'Failed to record conversion' }, { status: 500 });
  }
}
