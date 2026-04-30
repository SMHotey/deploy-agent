import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, teamMembers, teams } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { generateRequestId, createLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const allUsers = await db.query.users.findMany({
      columns: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        teamMemberships: {
          with: {
            team: {
              columns: { id: true, name: true },
            },
          },
        },
      },
    });

    const result = allUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isAdmin: u.isAdmin,
      teams: u.teamMemberships.map((tm) => ({
        id: tm.team.id,
        name: tm.team.name,
        role: tm.role,
      })),
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ users: result });
  } catch (error) {
    logger.error('Admin users list error', { error });
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { userId, isAdmin } = body;

    if (!userId || typeof isAdmin !== 'boolean') {
      return NextResponse.json({ error: 'userId and isAdmin boolean required' }, { status: 400 });
    }

    await db.update(users).set({ isAdmin, updatedAt: new Date() }).where(eq(users.id, userId));

    logger.info('Admin status updated', { userId, isAdmin, adminId: authResult.id });
    return NextResponse.json({ success: true, userId, isAdmin });
  } catch (error) {
    logger.error('Admin update error', { error });
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
