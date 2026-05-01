import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reviews, projectSubmissions, userPoints, pointsTransactions, leaderboard, reviewRatings } from '@/db/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

// Calculate points based on review quality
function calculatePoints(qualityScore: number, reviewRating: number, hasScreenshots: boolean, hasChecklist: boolean): number {
  const basePoints = {
    5: 100,
    4: 50,
    3: 30,
    2: 10,
    1: 5,
  }[qualityScore] || 10;

  let bonus = 0;
  if (hasScreenshots) bonus += 20;
  if (hasChecklist) bonus += 15;
  if (reviewRating >= 4) bonus += 10;

  return basePoints + bonus;
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { reviewId, qualityScore, feedback } = body;

    if (!reviewId || !qualityScore) {
      return NextResponse.json(
        { error: 'reviewId and qualityScore are required' },
        { status: 400 }
      );
    }

    // Get review and verify ownership
    const review = await db
      .select({ submissionId: reviews.submissionId, testerId: reviews.testerId, rating: reviews.rating, screenshots: reviews.screenshots, testingChecklist: reviews.testingChecklist })
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);

    if (!review[0]) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const submission = await db
      .select({ userId: projectSubmissions.userId, category: projectSubmissions.category })
      .from(projectSubmissions)
      .where(eq(projectSubmissions.id, review[0].submissionId))
      .limit(1);

    if (!submission[0]) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission[0].userId !== user.id && !user.isAdmin) {
      return NextResponse.json(
        { error: 'Only the project owner can rate reviews' },
        { status: 403 }
      );
    }

    const existingRating = await db
      .select()
      .from(reviewRatings)
      .where(eq(reviewRatings.reviewId, reviewId))
      .limit(1);

    if (existingRating[0]) {
      return NextResponse.json(
        { error: 'Review already rated' },
        { status: 409 }
      );
    }

    const hasScreenshots = review[0].screenshots !== null;
    const hasChecklist = review[0].testingChecklist !== null;
    const pointsAwarded = calculatePoints(qualityScore, review[0].rating, hasScreenshots, hasChecklist);

    const rating = await db
      .insert(reviewRatings)
      .values({ reviewId, ratedBy: user.id, qualityScore, pointsAwarded, feedback: feedback || null })
      .returning();

    // Award points to tester
    const testerPoints = await db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, review[0].testerId))
      .limit(1);

    if (testerPoints[0]) {
      await db
        .update(userPoints)
        .set({
          totalPoints: testerPoints[0].totalPoints + pointsAwarded,
          availablePoints: testerPoints[0].availablePoints + pointsAwarded,
          level: Math.floor((testerPoints[0].totalPoints + pointsAwarded) / 1000) + 1,
          updatedAt: new Date(),
        })
        .where(eq(userPoints.userId, review[0].testerId));
    } else {
      await db
        .insert(userPoints)
        .values({ userId: review[0].testerId, totalPoints: pointsAwarded, availablePoints: pointsAwarded, spentPoints: 0, level: 1 });
    }

    await db
      .insert(pointsTransactions)
      .values({
        userId: review[0].testerId,
        amount: pointsAwarded,
        type: 'review_rating',
        referenceId: reviewId,
        referenceType: 'review',
        description: `Points awarded for review #${reviewId} (quality: ${qualityScore}/5)`,
      });

    await updateLeaderboard(review[0].testerId, submission[0].category);

    logger.info('Review rated', { reviewId, qualityScore, pointsAwarded });

    return NextResponse.json({ success: true, rating: rating[0], pointsAwarded });
  } catch (error) {
    logger.error('Review rating error', { error });
    return NextResponse.json({ error: 'Failed to rate review' }, { status: 500 });
  }
}

async function updateLeaderboard(userId: number, category: string | null) {
  try {
    const userPointsData = await db
      .select({ totalPoints: userPoints.totalPoints })
      .from(userPoints)
      .where(eq(userPoints.userId, userId))
      .limit(1);

    if (!userPointsData[0]) return;

    // Upsert overall leaderboard (category = null)
    const existingOverall = await db
      .select()
      .from(leaderboard)
      .where(and(eq(leaderboard.userId, userId), isNull(leaderboard.category)))
      .limit(1);

    if (existingOverall[0]) {
      await db
        .update(leaderboard)
        .set({ points: userPointsData[0].totalPoints, updatedAt: new Date() })
        .where(eq(leaderboard.id, existingOverall[0].id));
    } else {
      await db
        .insert(leaderboard)
        .values({ userId, category: null, points: userPointsData[0].totalPoints, reviewsCount: 1 });
    }

    // Upsert category leaderboard (if category is specified)
    if (category) {
      const existingCategory = await db
        .select()
        .from(leaderboard)
        .where(and(eq(leaderboard.userId, userId), eq(leaderboard.category, category as any)))
        .limit(1);

      if (existingCategory[0]) {
        await db
          .update(leaderboard)
          .set({ 
            points: userPointsData[0].totalPoints, 
            reviewsCount: existingCategory[0].reviewsCount + 1, 
            updatedAt: new Date() 
          })
          .where(eq(leaderboard.id, existingCategory[0].id));
      } else {
        await db
          .insert(leaderboard)
          .values({ userId, category, points: userPointsData[0].totalPoints, reviewsCount: 1 });
      }
    }

     await recalculateRanks();
  } catch (error) {
    console.error('Leaderboard update error:', error);
  }
}

async function recalculateRanks() {
  // Get all entries grouped by category
  const categories = await db
    .selectDistinct({ category: leaderboard.category })
    .from(leaderboard);

  for (const { category } of categories) {
    const entries = await db
      .select({ id: leaderboard.id })
      .from(leaderboard)
      .where(category ? eq(leaderboard.category, category as any) : isNull(leaderboard.category))
      .orderBy(desc(leaderboard.points));

    // Update ranks
    for (let i = 0; i < entries.length; i++) {
      await db
        .update(leaderboard)
        .set({ rank: i + 1 })
        .where(eq(leaderboard.id, entries[i].id));
    }
  }
}
