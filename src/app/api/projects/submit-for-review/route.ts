import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projectSubmissions, projects } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, category, title, description, liveUrl, demoCredentials, testingInstructions, pointsReward = 100, maxTesters = 5 } = body;

    if (!projectId || !category || !title || !description) {
      return NextResponse.json(
        { error: 'projectId, category, title, and description are required' },
        { status: 400 }
      );
    }

    // Verify project exists and user owns it
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project[0]) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project[0].userId !== user.id && !user.isAdmin) {
      return NextResponse.json(
        { error: 'You can only submit your own projects' },
        { status: 403 }
      );
    }

    // Check if already submitted
    const existing = await db
      .select()
      .from(projectSubmissions)
      .where(eq(projectSubmissions.projectId, projectId))
      .limit(1);

    if (existing[0]) {
      return NextResponse.json(
        { error: 'Project already submitted for review' },
        { status: 409 }
      );
    }

    const submission = await db
      .insert(projectSubmissions)
      .values({
        projectId,
        userId: user.id,
        category,
        title,
        description,
        liveUrl: liveUrl || project[0].repoUrl,
        repoUrl: project[0].repoUrl,
        demoCredentials: demoCredentials ? JSON.stringify(demoCredentials) : null,
        testingInstructions,
        pointsReward,
        maxTesters,
        status: 'pending',
      })
      .returning();

    logger.info('Project submitted for review', { submissionId: submission[0].id, projectId, category });

    return NextResponse.json({ success: true, submission: submission[0] });
  } catch (error) {
    logger.error('Project submission error', { error });
    return NextResponse.json({ error: 'Failed to submit project' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'approved';

    // Build conditions array
    const conditions = [];
    if (category) {
      conditions.push(eq(projectSubmissions.category, category as any));
    }
    if (status) {
      conditions.push(eq(projectSubmissions.status, status as any));
    }

    // Query with where BEFORE orderBy
    const submissions = await db
      .select({
        id: projectSubmissions.id,
        projectId: projectSubmissions.projectId,
        userId: projectSubmissions.userId,
        category: projectSubmissions.category,
        title: projectSubmissions.title,
        description: projectSubmissions.description,
        liveUrl: projectSubmissions.liveUrl,
        pointsReward: projectSubmissions.pointsReward,
        currentTesters: projectSubmissions.currentTesters,
        maxTesters: projectSubmissions.maxTesters,
        status: projectSubmissions.status,
        createdAt: projectSubmissions.createdAt,
        projectName: projects.name,
      })
      .from(projectSubmissions)
      .leftJoin(projects, eq(projects.id, projectSubmissions.projectId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(projectSubmissions.createdAt));

    logger.info('Fetched projects for review', { count: submissions.length, category, status });

    return NextResponse.json({
      submissions: submissions.map((s: any) => ({
        id: s.id,
        projectId: s.projectId,
        title: s.title,
        description: s.description,
        category: s.category,
        liveUrl: s.liveUrl,
        pointsReward: s.pointsReward,
        testers: { current: s.currentTesters, max: s.maxTesters },
        status: s.status,
        createdAt: s.createdAt,
        project: { name: s.projectName },
      })),
    });
  } catch (error) {
    logger.error('Fetch projects for review error', { error });
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}
