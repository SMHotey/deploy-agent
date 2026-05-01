import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reviews, projectSubmissions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
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
    const { submissionId, rating, title, content, pros = [], cons = [], bugsFound = 0, screenshots = [], videoUrl, timeSpentMinutes, testingChecklist = {} } = body;

    if (!submissionId || !rating || !title || !content) {
      return NextResponse.json(
        { error: 'submissionId, rating, title, and content are required' },
        { status: 400 }
      );
    }

    // Verify submission exists
    const submission = await db
      .select()
      .from(projectSubmissions)
      .where(eq(projectSubmissions.id, submissionId))
      .limit(1);

    if (!submission[0]) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission[0].userId === user.id) {
      return NextResponse.json(
        { error: 'You cannot review your own project' },
        { status: 403 }
      );
    }

    const review = await db
      .insert(reviews)
      .values({
        submissionId,
        testerId: user.id,
        rating,
        title,
        content,
        pros: pros.length > 0 ? JSON.stringify(pros) : null,
        cons: cons.length > 0 ? JSON.stringify(cons) : null,
        bugsFound,
        screenshots: screenshots.length > 0 ? JSON.stringify(screenshots) : null,
        videoUrl,
        timeSpentMinutes,
        testingChecklist: Object.keys(testingChecklist).length > 0 ? JSON.stringify(testingChecklist) : null,
        status: 'pending',
      })
      .returning();

    // Update testers count
    await db
      .update(projectSubmissions)
      .set({ currentTesters: submission[0].currentTesters + 1 })
      .where(eq(projectSubmissions.id, submissionId));

    logger.info('Review submitted', { reviewId: review[0].id, submissionId });

    return NextResponse.json({ success: true, review: review[0] });
  } catch (error) {
    logger.error('Review submission error', { error });
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId is required' }, { status: 400 });
    }

    const reviewsList = await db
      .select()
      .from(reviews)
      .where(eq(reviews.submissionId, parseInt(submissionId)))
      .orderBy(desc(reviews.createdAt));

    return NextResponse.json({
      reviews: reviewsList.map((r: any) => ({
        id: r.id,
        testerId: r.testerId,
        rating: r.rating,
        title: r.title,
        content: r.content,
        pros: r.pros ? JSON.parse(r.pros) : [],
        cons: r.cons ? JSON.parse(r.cons) : [],
        bugsFound: r.bugsFound,
        screenshots: r.screenshots ? JSON.parse(r.screenshots) : [],
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Fetch reviews error', { error });
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
