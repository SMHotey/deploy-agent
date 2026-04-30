import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { getSubscription, updateSubscription, cancelSubscription, checkAllLimits, createCheckoutSession, getPlanFeatures } from '@/lib/billing';
import { createLogger, generateRequestId } from '@/lib/logger';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const subscription = await getSubscription(user.id);
    const features = getPlanFeatures(subscription.plan);
    const limitsCheck = await checkAllLimits(user.id);

    return NextResponse.json({
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      features,
      limits: limitsCheck,
    });

  } catch (error) {
    logger.error('Billing GET error', { error });
    return NextResponse.json({ error: 'Failed to get billing info' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'upgrade') {
      const { plan } = body;

      if (!['free', 'pro', 'team', 'enterprise'].includes(plan)) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
      }

      // Try Stripe checkout
      try {
        const [userRecord] = await db.select({ email: users.email })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        if (!userRecord?.email) {
          return NextResponse.json({ error: 'User email not found' }, { status: 400 });
        }

        const checkout = await createCheckoutSession(user.id, plan, userRecord.email);

        return NextResponse.json({
          success: true,
          checkoutUrl: checkout.url,
          sessionId: checkout.sessionId,
        });
      } catch (stripeError: any) {
        logger.warn('Stripe checkout failed, falling back to demo mode', { error: stripeError.message });
        // Fallback to demo mode
        const subscription = await updateSubscription(user.id, plan);

        return NextResponse.json({
          success: true,
          message: 'Subscription upgraded (demo mode - Stripe not configured)',
          subscription,
        });
      }
    }

    if (action === 'cancel') {
      const result = await cancelSubscription(user.id);

      if (!result) {
        return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription will cancel at period end',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    logger.error('Billing POST error', { error });
    return NextResponse.json({ error: 'Failed to process billing request' }, { status: 500 });
  }
}
