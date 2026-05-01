import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaderboard, users, userPoints } from '@/db/schema';
import { eq, desc, isNull, isNotNull, count, and } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const user = await authenticate(request);

    // Build where condition
    const whereCondition = category 
      ? and(eq(leaderboard.category, category as any), isNotNull(leaderboard.category))
      : isNull(leaderboard.category);

    // Query leaderboard with where BEFORE orderBy/limit
    const leaderboardData = await db
      .select({
        rank: leaderboard.rank,
        userId: leaderboard.userId,
        category: leaderboard.category,
        points: leaderboard.points,
        reviewsCount: leaderboard.reviewsCount,
        avgRatingGiven: leaderboard.avgRatingGiven,
        avgQualityScore: leaderboard.avgQualityScore,
        userName: users.name,
        userLevel: userPoints.level,
      })
      .from(leaderboard)
      .leftJoin(users, eq(users.id, leaderboard.userId))
      .leftJoin(userPoints, eq(userPoints.userId, leaderboard.userId))
      .where(whereCondition)
      .orderBy(desc(leaderboard.rank))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalCount = await db
      .select({ count: count() })
      .from(leaderboard)
      .where(whereCondition);

    // Get user's own rank (if authenticated)
    let userRank = null;
    if (user) {
      const userEntry = await db
        .select({ rank: leaderboard.rank })
        .from(leaderboard)
        .where(and(eq(leaderboard.userId, user.id), whereCondition))
        .limit(1);

      if (userEntry[0]) {
        userRank = userEntry[0].rank;
      }
    }

    // Get available categories
    const categories = await db
      .selectDistinct({ category: leaderboard.category })
      .from(leaderboard)
      .where(isNotNull(leaderboard.category));

    logger.info('Leaderboard fetched', {
      category: category || 'overall',
      count: leaderboardData.length,
    });

    return NextResponse.json({
      leaderboard: leaderboardData.map((entry: any) => ({
        rank: entry.rank,
        user: {
          id: entry.userId,
          name: entry.userName,
          level: entry.userLevel,
        },
        points: entry.points,
        reviewsCount: entry.reviewsCount,
        avgRatingGiven: entry.avgRatingGiven,
        avgQualityScore: entry.avgQualityScore,
        category: entry.category,
      })),
      userRank,
      pagination: {
        limit,
        offset,
        total: Number(totalCount[0]?.count) || 0,
      },
      categories: categories.map((c: any) => c.category).filter(Boolean),
    });
  } catch (error) {
    logger.error('Leaderboard fetch error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user points
    const pointsData = await db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, user.id))
      .limit(1);

    if (!pointsData[0]) {
      return NextResponse.json({
        points: { userId: user.id, totalPoints: 0, availablePoints: 0, spentPoints: 0, level: 1 },
        transactions: [],
        leaderboardRank: null,
      });
    }

    // Get recent transactions
    const { pointsTransactions } = await import('@/db/schema');
    const transactions = await db
      .select()
      .from(pointsTransactions)
      .where(eq(pointsTransactions.userId, user.id))
      .orderBy(desc(pointsTransactions.createdAt))
      .limit(10);

    // Get leaderboard rank (overall)
    const overallRank = await db
      .select({ rank: leaderboard.rank })
      .from(leaderboard)
      .where(and(eq(leaderboard.userId, user.id), isNull(leaderboard.category)))
      .limit(1);

    // Get category ranks
    const categoryRanks = await db
      .select({
        category: leaderboard.category,
        rank: leaderboard.rank,
        points: leaderboard.points,
      })
      .from(leaderboard)
      .where(and(eq(leaderboard.userId, user.id), isNotNull(leaderboard.category)));

    logger.info('User points fetched', { userId: user.id });

    return NextResponse.json({
      points: pointsData[0],
      transactions: transactions.map((t: any) => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt,
      })),
      leaderboardRank: {
        overall: overallRank[0]?.rank || null,
        categories: categoryRanks,
      },
    });
  } catch (error) {
    logger.error('User points fetch error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch points' },
      { status: 500 }
    );
  }
}
