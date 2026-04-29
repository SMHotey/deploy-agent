import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { getSubscription, updateSubscription, cancelSubscription, getPlanFeatures, checkAllLimits } from '@/lib/billing';
import { createLogger, generateRequestId } from '@/lib/logger';

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

      // In production, here you would:
      // 1. Create Stripe checkout session
      // 2. Redirect user to Stripe
      // 3. Handle webhook to update subscription
      
      // For now, simulate upgrade (demo mode)
      const subscription = await updateSubscription(user.id, plan);
      
      logger.info('Subscription upgraded (demo)', { userId: user.id, plan });
      
      return NextResponse.json({
        success: true,
        message: 'Subscription upgraded (demo mode - no payment processed)',
        subscription,
      });
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
