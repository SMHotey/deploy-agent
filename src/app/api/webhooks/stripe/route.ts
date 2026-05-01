import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, subscriptions, pointsTransactions, userPoints } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Point packs configuration
const POINT_PACKS = {
  small: { points: 100, price: 5 },
  medium: { points: 250, price: 10 },
  large: { points: 750, price: 25 },
};

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userIdStr = session.metadata?.userId;
  const userId = Number(userIdStr);

  if (!userId || Number.isNaN(userId)) {
    console.error('No valid userId in session metadata');
    return;
  }

  const type = session.metadata?.type; // 'subscription' or 'points'

  if (type === 'points') {
    await handlePointsPurchase(session, userId);
  } else if (type === 'subscription') {
    await handleSubscriptionCheckout(session, userId);
  }
}

async function handlePointsPurchase(session: Stripe.Checkout.Session, userId: number) {
  const packId = session.metadata?.packId as keyof typeof POINT_PACKS;
  const pack = POINT_PACKS[packId];

  if (!pack) {
    console.error('Invalid pack ID:', packId);
    return;
  }

  const points = pack.points;

  // Get or create userPoints record
  const existingPoints = await db
    .select()
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);

  if (existingPoints.length > 0) {
    const currentPoints = existingPoints[0].totalPoints || 0;
    const currentAvailable = existingPoints[0].availablePoints || 0;
    const newTotal = currentPoints + points;
    const newAvailable = currentAvailable + points;

    await db
      .update(userPoints)
      .set({
        totalPoints: newTotal,
        availablePoints: newAvailable,
        updatedAt: new Date(),
      })
      .where(eq(userPoints.userId, userId));
  } else {
    // Create new userPoints record (no id - serial auto-generated)
    await db.insert(userPoints).values({
      userId,
      totalPoints: points,
      availablePoints: points,
      spentPoints: 0,
      level: 1,
      updatedAt: new Date(),
    });
  }

  // Record transaction (no id, no stripePaymentId - those don't exist in schema)
  await db.insert(pointsTransactions).values({
    userId,
    amount: points,
    type: 'spent', // Using existing type from schema
    description: `Purchased ${packId} point pack (${points} points)`,
    referenceId: null,
    referenceType: 'purchase',
    createdAt: new Date(),
  });

  console.log(`Added ${points} points to user ${userId}`);

  // Send email notification
  try {
    const userResult = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userResult.length > 0 && userResult[0].email) {
      const user = userResult[0];
      await sendEmail({
        to: user.email,
        subject: `Points Purchase Successful - ${points} Points Added!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>🎉 Purchase Successful!</h2>
            <p>Hi ${user.name || 'there'},</p>
            <p>Your purchase of <strong>${packId} point pack</strong> was successful.</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #10b981;">
                +${points} Points
              </p>
              <p style="margin: 5px 0 0 0; color: #666;">Added to your account</p>
            </div>
            <p>You can now use these points for premium features like detailed demand reports.</p>
            <p style="margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing"
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Billing
              </a>
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <p style="color: #999; font-size: 12px;">
              Deploy Agent - One-click deployment automation
            </p>
          </div>
        `,
      });
      console.log(`Sent points purchase email to ${user.email}`);
    }
  } catch (emailError) {
    console.error('Failed to send points purchase email:', emailError);
  }
}

async function handleSubscriptionCheckout(session: Stripe.Checkout.Session, userId: number) {
  const planId = session.metadata?.planId || '';

  if (!planId) {
    console.error('No planId in session metadata');
    return;
  }

  // Map plan ID to schema enum value
  const planMap: Record<string, 'pro' | 'team' | 'enterprise' | 'free'> = {
    pro: 'pro',
    team: 'team',
    enterprise: 'enterprise',
  };

  const plan = planMap[planId] || 'free';
  const now = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month from now

  // Check if subscription exists
  const existingSub = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existingSub.length > 0) {
    // Update existing subscription
    await db
      .update(subscriptions)
      .set({
        plan,
        status: 'active',
        stripeSubscriptionId: session.subscription as string || null,
        stripeCustomerId: session.customer as string || null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      })
      .where(eq(subscriptions.userId, userId));
  } else {
    // Create new subscription (no id - serial auto-generated)
    await db.insert(subscriptions).values({
      userId,
      plan,
      status: 'active',
      stripeSubscriptionId: session.subscription as string || null,
      stripeCustomerId: session.customer as string || null,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Update user plan
  await db
    .update(users)
    .set({ plan })
    .where(eq(users.id, userId));

  console.log(`Activated ${plan} subscription for user ${userId}`);

  // Send email notification
  try {
    const userResult = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userResult.length > 0 && userResult[0].email) {
      const user = userResult[0];
      const planNames: Record<string, string> = {
        pro: 'Pro',
        team: 'Team',
        enterprise: 'Enterprise',
      };
      const planName = planNames[plan] || plan;

      await sendEmail({
        to: user.email,
        subject: `Subscription Activated - ${planName} Plan`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>🎉 Subscription Activated!</h2>
            <p>Hi ${user.name || 'there'},</p>
            <p>Your <strong>${planName}</strong> subscription is now active.</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 18px;"><strong>Plan:</strong> ${planName}</p>
              <p style="margin: 10px 0 0 0; color: #666;">Status: <span style="color: #10b981; font-weight: bold;">Active</span></p>
            </div>
            <p>You now have access to all ${planName} features including:</p>
            <ul style="line-height: 1.8;">
              ${plan === 'pro' ? `
                <li>Up to 20 projects</li>
                <li>100 deployments per day</li>
                <li>1GB storage</li>
                <li>Priority support</li>
              ` : plan === 'team' ? `
                <li>Unlimited projects</li>
                <li>1,000 deployments per day</li>
                <li>50 team members</li>
                <li>SSO & 99.9% SLA</li>
              ` : `
                <li>Unlimited everything</li>
                <li>Dedicated instance</li>
                <li>Custom SLA</li>
                <li>Phone support</li>
              `}
            </ul>
            <p style="margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard"
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Go to Dashboard
              </a>
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <p style="color: #999; font-size: 12px;">
              Deploy Agent - One-click deployment automation
            </p>
          </div>
        `,
      });
      console.log(`Sent subscription activation email to ${user.email}`);
    }
  } catch (emailError) {
    console.error('Failed to send subscription email:', emailError);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const userResult = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (userResult.length === 0) {
    console.error('User not found for customer:', customerId);
    return;
  }

  const userId = userResult[0].id;
  const status = subscription.status;

  // Map Stripe status to our status
  const statusMap: Record<string, 'active' | 'past_due' | 'cancelled' | 'trialing'> = {
    active: 'active',
    trialing: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'past_due',
    incomplete: 'past_due',
  };

  await db
    .update(subscriptions)
    .set({
      status: statusMap[status] || 'past_due',
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

  console.log(`Updated subscription ${subscription.id} status to ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const userResult = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (userResult.length === 0) {
    console.error('User not found for customer:', customerId);
    return;
  }

  const userId = userResult[0].id;

  // Update subscription to cancelled
  await db
    .update(subscriptions)
    .set({
      status: 'cancelled',
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

  // Downgrade user to free plan
  await db
    .update(users)
    .set({ plan: 'free' })
    .where(eq(users.id, userId));

  console.log(`Cancelled subscription for user ${userId}, downgraded to free`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) return;

  // Update subscription period
  await db
    .update(subscriptions)
    .set({
      status: 'active',
      currentPeriodStart: new Date((invoice as any).period_start * 1000),
      currentPeriodEnd: new Date((invoice as any).period_end * 1000),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

  console.log(`Payment succeeded for subscription ${subscriptionId}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) return;

  // Mark subscription as past_due
  await db
    .update(subscriptions)
    .set({
      status: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

  console.log(`Payment failed for subscription ${subscriptionId}`);
}
