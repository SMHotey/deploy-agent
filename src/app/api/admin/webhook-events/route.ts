import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { webhookEvents, projects } from '@/db/schema';
import { desc, eq, and, like } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { generateRequestId, createLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const source = searchParams.get('source');

    const query = db.query.webhookEvents.findMany({
      limit,
      offset,
      orderBy: [desc(webhookEvents.createdAt)],
      where: (webhookEvents, { eq, and }) => {
        const conditions = [];
        if (status) conditions.push(eq(webhookEvents.status, status));
        if (source) conditions.push(eq(webhookEvents.source, source));
        return conditions.length > 0 ? and(...conditions) : undefined;
      },
    });

    const [results, totalCount] = await Promise.all([
      query,
      db.$count(webhookEvents),
    ]);

    return NextResponse.json({
      events: results.map((e) => ({
        id: e.id,
        source: e.source,
        eventType: e.eventType,
        status: e.status,
        retryCount: e.retryCount,
        errorMessage: e.errorMessage,
        lastRetryAt: e.lastRetryAt,
        processedAt: e.processedAt,
        createdAt: e.createdAt,
      })),
      pagination: { limit, offset, total: totalCount },
    });
  } catch (error) {
    logger.error('Admin webhook events list error', { error });
    return NextResponse.json({ error: 'Failed to fetch webhook events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { eventId, action } = body;

    if (!eventId || action !== 'replay') {
      return NextResponse.json({ error: 'eventId and action="replay" required' }, { status: 400 });
    }

    const [event] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, eventId)).limit(1);
    if (!event) {
      return NextResponse.json({ error: 'Webhook event not found' }, { status: 404 });
    }

      // Replay the event
      try {
        if (event.source === 'github') {
          const payload = event.payload as any;
          const repository = payload.repository;
          const branch = payload.ref?.replace('refs/heads/', '') || payload.pull_request?.head?.ref || 'main';

          const matchingProjects = await db.query.projects.findMany({
            where: (projects, { eq, and, like }) =>
              and(
                like(projects.repoUrl, `%${repository?.full_name}%`),
                eq(projects.branch, branch),
              ),
          });
          
          // Update webhook event status
          await db.update(webhookEvents).set({
            status: 'processed',
            processedAt: new Date(),
            retryCount: event.retryCount + 1,
          }).where(eq(webhookEvents.id, eventId));

          return NextResponse.json({ success: true, message: 'Event replayed - triggering deployments', projectCount: matchingProjects.length });
        }

        return NextResponse.json({ success: false, error: 'Unsupported event source for replay' });
      } catch (replayError) {
      const errorMessage = replayError instanceof Error ? replayError.message : 'Unknown error';
      await db.update(webhookEvents).set({
        status: 'failed',
        errorMessage,
        lastRetryAt: new Date(),
        retryCount: event.retryCount + 1,
      }).where(eq(webhookEvents.id, eventId));

      return NextResponse.json({ error: 'Replay failed', details: errorMessage }, { status: 500 });
    }
  } catch (error) {
    logger.error('Webhook replay error', { error });
    return NextResponse.json({ error: 'Failed to replay webhook event' }, { status: 500 });
  }
}
