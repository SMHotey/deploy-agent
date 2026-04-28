import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, type Project } from '@/db/schema';
import { eq, like, desc } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    logger.info('List projects request');

    // Authenticate user
    const user = await authenticate(request);
    if (!user) {
      logger.warn('Authentication failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.info('User authenticated', { userId: user.id });
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '10'), 100);
    const platform = request.nextUrl.searchParams.get('platform');

    const pageSize = limit;
    const offset = (page - 1) * pageSize;

    // Build query
    let query = db.select().from(projects) as any;

    if (platform) {
      query = query.where(eq(projects.platform, platform as any));
    }

    // Get total count (simplified - in production you'd want a separate count query)
    const allProjects = await (query as any);
    const filteredProjects = platform
      ? allProjects.filter((p: any) => p.platform === platform)
      : allProjects;

    // Sort by created date (newest first)
    filteredProjects.sort((a: any, b: any) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });

    // Paginate
    const paginated = filteredProjects.slice(offset, offset + pageSize);

    return NextResponse.json({
      projects: paginated.map((p: any) => ({
        id: p.id,
        name: p.name,
        repo_url: p.repoUrl,
        platform: p.platform,
        status: 'pending', // TODO: join with deployments for actual status
        created_at: p.createdAt,
      })),
      total: filteredProjects.length,
      page,
      limit,
    });
  } catch (error) {
    console.error('Projects list error:', error);
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    logger.info('Create project request');

    // Authenticate user
    const user = await authenticate(request);
    if (!user) {
      logger.warn('Authentication failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.info('User authenticated', { userId: user.id });

    const body = await request.json();
    const { name, repo_url, platform = 'vercel' } = body;

    if (!name || !repo_url) {
      return NextResponse.json(
        { error: 'name and repo_url required' },
        { status: 400 }
      );
    }

    logger.info('Creating project', { name, repo_url, platform });

    const [project] = await db.insert(projects).values({
      name,
      repoUrl: repo_url,
      platform: platform as any,
      userId: user.id,
    }).returning();

    return NextResponse.json({
      id: project.id,
      name: project.name,
      repo_url: project.repoUrl,
      platform: project.platform,
      status: 'pending',
    }, { status: 201 });
  } catch (error) {
    logger.error('Project creation error', { error });
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    logger.info('Delete project request');

    // Authenticate user
    const user = await authenticate(request);
    if (!user) {
      logger.warn('Authentication failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.info('User authenticated', { userId: user.id });

    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id required' },
        { status: 400 }
      );
    }

    logger.info('Deleting project', { projectId: id });

    const result = await db.delete(projects).where(eq(projects.id, parseInt(id))).returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Project deletion error', { error });
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
