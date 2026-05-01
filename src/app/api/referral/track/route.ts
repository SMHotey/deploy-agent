import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { referralEvents, hostingProviders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger, generateRequestId } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const body = await request.json();
    const { provider, userId, projectId, eventType = 'click', metadata } = body;

    if (!provider) {
      return NextResponse.json(
        { error: 'Missing provider' },
        { status: 400 }
      );
    }

    logger.info('Referral event tracking', { provider, userId, projectId, eventType });

    // Get provider by slug
    const providers = await db
      .select()
      .from(hostingProviders)
      .where(eq(hostingProviders.slug, provider))
      .limit(1);

    if (providers.length === 0) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    const providerId = providers[0].id;

    // Record referral event
    await db.insert(referralEvents).values({
      userId: userId || null,
      providerId,
      projectId: projectId || null,
      eventType,
      metadata: metadata || null,
      createdAt: new Date(),
    });

    logger.info('Referral event recorded', { providerId, eventType });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Referral tracking error', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to track referral' },
      { status: 500 }
    );
  }
}
