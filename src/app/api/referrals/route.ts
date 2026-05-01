import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, referrals } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

// Generate unique referral code
function generateReferralCode(): string {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

// GET /api/referrals - Get user's referral code + stats
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { verify } = await import('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY!;
    
    let payload: any;
    try {
      payload = verify(token, jwtSecret);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.sub;

    // Get or create referral code
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let referralCode = user.referralCode;
    if (!referralCode) {
      // Generate unique code
      let code: string;
      let attempts = 0;
      do {
        code = generateReferralCode();
        const existing = await db.query.users.findFirst({
          where: eq(users.referralCode, code),
        });
        if (!existing) {
          referralCode = code;
          break;
        }
        attempts++;
      } while (attempts < 5);

      if (referralCode) {
        await db.update(users)
          .set({ referralCode, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }
    }

    // Get referral stats
    const userReferrals = await db.query.referrals.findMany({
      where: eq(referrals.referrerId, userId),
      with: {
        referred: true,
      },
    });

    const completed = userReferrals.filter((r) => r.status === 'completed').length;
    const pending = userReferrals.filter((r) => r.status === 'pending').length;

    return NextResponse.json({
      ok: true,
      referralCode: referralCode || null,
      referralLink: referralCode ? `${process.env.DEPLOY_AGENT_URL || 'http://localhost:3000'}/auth/register?ref=${referralCode}` : null,
      stats: {
        total: userReferrals.length,
        completed,
        pending,
        rewarded: userReferrals.filter((r) => r.rewardClaimed).length,
      },
      referrals: userReferrals.map((r) => ({
        id: r.id,
        referredEmail: (r.referred as any)?.email || 'unknown',
        status: r.status,
        createdAt: r.createdAt,
        rewardClaimed: r.rewardClaimed,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/referrals/claim - Claim reward for completed referrals
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { verify } = await import('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY!;
    
    let payload: any;
    try {
      payload = verify(token, jwtSecret);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.sub;

    // Claim unclaimed rewards
    const result = await db.update(referrals)
      .set({ rewardClaimed: true, rewardedAt: new Date() })
      .where(
        and(
          eq(referrals.referrerId, userId),
          eq(referrals.status, 'completed'),
          eq(referrals.rewardClaimed, false)
        )
      )
      .returning();

    return NextResponse.json({
      ok: true,
      claimed: result.length,
      message: `Claimed ${result.length} reward(s)`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
