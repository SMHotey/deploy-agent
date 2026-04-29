import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { parseVercelWebhook } from '@/lib/validation';
import { db } from '@/db';
import { deployments, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger, generateRequestId } from '@/lib/logger';

const VERCEL_WEBHOOK_SECRET = process.env.VERCEL_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/vercel
 * Receives Vercel deployment status events.
 *
 * Headers:
 *   - x-vercel-signature: HMAC-SHA256 signature (required if VERCEL_WEBHOOK_SECRET is set)
 *   - x-vercel-event-id: Unique event ID (for idempotency)
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const vercelEvent = request.headers.get('x-vercel-event') || '';
    const eventId = request.headers.get('x-vercel-event-id');

    logger.info('Vercel webhook received', { event: vercelEvent, eventId });

    // Verify signature if secret is configured
    if (VERCEL_WEBHOOK_SECRET) {
      const signature = request.headers.get('x-vercel-signature');
      if (!signature) {
        logger.warn('Vercel webhook signature missing');
        return NextResponse.json({ error: 'Signature required' }, { status: 401 });
      }

      const rawBody = await request.text();
      const expectedSignature = createHmac('sha256', VERCEL_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        logger.warn('Vercel webhook signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      // Re-parse since we consumed the body
      const body = JSON.parse(rawBody);
      return handleVercelEvent(body, vercelEvent, logger, requestId);
    }

    // No secret configured — parse body normally
    const body = await request.json();
    return handleVercelEvent(body, vercelEvent, logger, requestId);
  } catch (error) {
    logger.error('Vercel webhook error', { error });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleVercelEvent(
  body: unknown,
  eventType: string,
  logger: ReturnType<typeof createLogger>,
  requestId: string
) {
  const parsed = parseVercelWebhook(body);

  if (!parsed.success || !parsed.data) {
    logger.warn('Invalid Vercel webhook payload', { error: parsed.error?.issues });
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { payload } = parsed.data;
  if (!payload?.deployment) {
    logger.info('No deployment data in Vercel webhook');
    return NextResponse.json({ message: 'no deployment data' });
  }

  const { deployment } = payload;
  const deploymentId = deployment.id;

  logger.info('Vercel deployment event', { deploymentId, eventType });

  // Find matching deployment record
  const deploymentRecord = await db.query.deployments.findFirst({
    where: eq(deployments.deploymentIdExternal, deploymentId),
  });

  if (!deploymentRecord) {
    logger.info('No matching deployment record found', { deploymentId });
    return NextResponse.json({ message: 'deployment not tracked' });
  }

  // Update status if needed
  const statusMap: Record<string, string> = {
    'BUILDING': 'building',
    'READY': 'ready',
    'ERROR': 'error',
    'CANCELED': 'cancelled',
  };

  const newStatus = statusMap[eventType] || statusMap[deployment.url ? 'READY' : 'ERROR'];

  if (deploymentRecord.status !== newStatus) {
    await db
      .update(deployments)
      .set({
        status: newStatus as any,
        url: deployment.url || deploymentRecord.url,
        readyAt: newStatus === 'ready' ? new Date() : deploymentRecord.readyAt,
      })
      .where(eq(deployments.id, deploymentRecord.id));

    // Create audit log entry
    if (deploymentRecord.projectId) {
      await db.insert(auditLogs).values({
        projectId: deploymentRecord.projectId,
        action: 'deployment_status_updated',
        details: {
          source: 'vercel_webhook',
          deploymentId,
          newStatus,
          eventType,
        },
        ipAddress: 'webhook',
      });
    }

    logger.info('Deployment status updated', {
      deploymentId,
      oldStatus: deploymentRecord.status,
      newStatus,
    });
  }

  return NextResponse.json({
    message: 'Status updated',
    deploymentId,
    status: newStatus,
  });
}
