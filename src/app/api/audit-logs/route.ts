import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLogs, projects } from '@/db/schema';
import { eq, and, desc, inArray, count } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

/**
 * GET /api/audit-logs
 * List audit logs for the authenticated user's projects.
 *
 * Query params:
 *   - project_id (optional): Filter by specific project
 *   - page (optional, default 1): Page number
 *   - limit (optional, default 20, max 100): Items per page
 *   - action (optional): Filter by action type
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const action = searchParams.get('action');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // Get all user's project IDs
    const userProjects = await db.query.projects.findMany({
      where: eq(projects.userId, user.id),
      columns: { id: true },
    });

    const projectIds = userProjects.map((p) => p.id);

    if (projectIds.length === 0) {
      return NextResponse.json({ auditLogs: [], total: 0 });
    }

    // Build conditions
    const whereCondition = and(
      inArray(auditLogs.projectId, projectIds),
      projectId ? eq(auditLogs.projectId, parseInt(projectId)) : undefined,
      action ? eq(auditLogs.action, action) : undefined,
    );

    // Fetch audit logs
    const logs = await db.query.auditLogs.findMany({
      where: whereCondition,
      orderBy: [desc(auditLogs.createdAt)],
      limit,
      offset: (page - 1) * limit,
    });

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(whereCondition);
    const total = countResult[0]?.count ?? 0;

    // Enrich with project name
    const enrichedLogs = logs.map((log) => ({
      id: log.id,
      projectId: log.projectId,
      userId: log.userId,
      action: log.action,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    }));

    logger.info('Audit logs retrieved', { userId: user.id, count: enrichedLogs.length });

    return NextResponse.json({
      auditLogs: enrichedLogs,
      total,
      page,
      limit,
    });
  } catch (error) {
    logger.error('Failed to fetch audit logs', { error });
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/audit-logs
 * Create a new audit log entry.
 * Internal use — can be called by other API routes to log actions.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, action, details, ipAddress } = body;

    if (!projectId || !action) {
      return NextResponse.json(
        { error: 'projectId and action are required' },
        { status: 400 }
      );
    }

    // Verify project ownership
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, parseInt(projectId)), eq(projects.userId, user.id)),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const [newLog] = await db
      .insert(auditLogs)
      .values({
        projectId: parseInt(projectId),
        userId: user.id,
        action,
        details: details || {},
        ipAddress: ipAddress || request.headers.get('x-forwarded-for') || 'unknown',
      })
      .returning();

    logger.info('Audit log created', { action, projectId });

    return NextResponse.json(
      {
        id: newLog.id,
        action: newLog.action,
        projectId: newLog.projectId,
        createdAt: newLog.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to create audit log', { error });
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}
