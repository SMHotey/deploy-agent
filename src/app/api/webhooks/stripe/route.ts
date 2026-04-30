import { NextRequest, NextResponse } from 'next/server';
import { handleWebhook } from '@/lib/billing';
import { createLogger, generateRequestId } from '@/lib/logger';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    if (!STRIPE_WEBHOOK_SECRET) {
      logger.warn('Stripe webhook: no secret configured');
      return NextResponse.json({ received: true });
    }

    const result = await handleWebhook(body, signature);
    return NextResponse.json(result);

  } catch (error) {
    logger.error('Stripe webhook error', { error });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
