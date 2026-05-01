import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deployments, projects, users } from '@/db/schema';
import { desc } from 'drizzle-orm';
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

    const query = db.query.deployments.findMany({
      limit,
      offset,
      orderBy: [desc(deployments.createdAt)],
      where: status ? (deployments, { eq }) => eq(deployments.status, status as any) : undefined,
      with: {
        project: {
          columns: { id: true, name: true, repoUrl: true },
          with: {
            user: {
              columns: { id: true, email: true, name: true },
            },
          },
        },
      },
    });

    const [results, totalCount] = await Promise.all([
      query,
      db.$count(deployments),
    ]);

    return NextResponse.json({
      deployments: results.map((d) => ({
        id: d.id,
        deploymentIdExternal: d.deploymentIdExternal,
        status: d.status,
        url: d.url,
        branch: d.branch,
        isPreview: d.isPreview,
        prNumber: d.prNumber,
        commitSha: d.commitSha,
        createdAt: d.createdAt,
        startedAt: d.startedAt,
        readyAt: d.readyAt,
        buildTime: d.buildTime,
        errorMessage: d.errorMessage,
        project: d.project ? {
          id: (d.project as any).id,
          name: (d.project as any).name,
          repoUrl: (d.project as any).repoUrl,
          user: (d.project as any).user,
        } : null,
      })),
      pagination: { limit, offset, total: totalCount },
    });
  } catch (error) {
    logger.error('Admin deployments list error', { error });
    return NextResponse.json({ error: 'Failed to fetch deployments' }, { status: 500 });
  }
}
