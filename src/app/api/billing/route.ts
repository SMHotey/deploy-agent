import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';
import { db } from '@/db';
import { users, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

// Initialize Stripe
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Plan configuration
const PLANS = {
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_demo_pro',
    amount: 2900, // $29.00
  },
  team: {
    name: 'Team',
    priceId: process.env.STRIPE_TEAM_PRICE_ID || 'price_demo_team',
    amount: 9900, // $99.00
  },
  enterprise: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_demo_enterprise',
    amount: 49900, // $499.00
  },
};

// Point pack configuration
const POINT_PACKS = {
  small: { points: 500, amount: 500, name: 'Small Pack' },   // $5
  medium: { points: 1200, amount: 1000, name: 'Medium Pack' }, // $10
  large: { points: 3000, amount: 2500, name: 'Large Pack' },  // $25
};

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    logger.info('Billing GET request', { userId: user.id });

    // Get user's subscription
    const userSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);
    
    const subscription = userSubscriptions[0] || null;

    // Get user's points from Redis
    let points = 0;
    try {
      const Redis = require('ioredis');
      if (process.env.REDIS_URL) {
        const redis = new Redis(process.env.REDIS_URL);
        const pointsStr = await redis.get(`user:${user.id}:points`);
        points = pointsStr ? parseInt(pointsStr) : 0;
      }
    } catch (e) {
      console.warn('Redis not available for points');
    }

    return NextResponse.json({
      subscription: {
        plan: subscription?.plan || 'free',
        status: subscription?.status || 'active',
        currentPeriodEnd: subscription?.currentPeriodEnd || null,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      },
      points,
      plans: PLANS,
      pointPacks: POINT_PACKS,
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

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { action, plan, packageId } = body;

    logger.info('Billing POST request', { action, plan, packageId, userId: user.id });

    if (action === 'create-subscription') {
      return await createSubscription(user.id, plan);
    }

    if (action === 'create-points-purchase') {
      return await createPointsPurchase(user.id, packageId);
    }

    if (action === 'cancel-subscription') {
      return await cancelSubscription(user.id);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    logger.error('Billing POST error', { error: error.message });
    return NextResponse.json({ error: 'Failed to process billing request' }, { status: 500 });
  }
}

async function createSubscription(userId: number, plan: string): Promise<NextResponse> {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const planConfig = PLANS[plan as keyof typeof PLANS];
  if (!planConfig) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  // Get user
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  const user = userRows[0];
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: { userId: userId.toString() },
    });
    customerId = customer.id;

    await db.update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId));
  }

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: planConfig.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?canceled=true`,
    metadata: {
      userId: userId.toString(),
      plan,
    },
  });

  return NextResponse.json({ url: session.url });
}

async function createPointsPurchase(userId: number, packageId: string): Promise<NextResponse> {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const pack = POINT_PACKS[packageId as keyof typeof POINT_PACKS];
  if (!pack) {
    return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
  }

  // Get user
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  const user = userRows[0];
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: { userId: userId.toString() },
    });
    customerId = customer.id;

    await db.update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId));
  }

  // Create Checkout Session for one-time payment
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: pack.name,
            description: `${pack.points} points for Deploy Agent`,
          },
          unit_amount: pack.amount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?points_success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?canceled=true`,
    metadata: {
      userId: userId.toString(),
      packageId,
      points: pack.points.toString(),
    },
  });

  return NextResponse.json({ url: session.url });
}

async function cancelSubscription(userId: number): Promise<NextResponse> {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const userSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  
  const subscription = userSubscriptions[0];

  if (!subscription || !subscription.stripeSubscriptionId) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
  }

  // Cancel at period end
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await db.update(subscriptions)
    .set({ cancelAtPeriodEnd: true })
    .where(eq(subscriptions.id, subscription.id));

  return NextResponse.json({ success: true, message: 'Subscription will be canceled at period end' });
}
