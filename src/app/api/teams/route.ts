import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teams, teamMembers, users } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

// GET /api/teams - list user's teams
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Find teams where user is a member
    const memberships = await db.query.teamMembers.findMany({
      where: eq(teamMembers.userId, user.id),
      with: {
        team: {
          with: {
            owner: true,
          },
        },
      },
    });

    const result = memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      description: m.team.description,
      ownerId: m.team.ownerId,
      ownerName: m.team.owner?.name || null,
      role: m.role,
      createdAt: m.team.createdAt.toISOString(),
      updatedAt: m.team.updatedAt.toISOString(),
    }));

    logger.info('Teams listed', { userId: user.id, count: result.length });

    return NextResponse.json({ teams: result });
  } catch (error) {
    logger.error('Teams GET error', { error });
    return NextResponse.json({ error: 'Failed to get teams' }, { status: 500 });
  }
}

// POST /api/teams - create team
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const [team] = await db
      .insert(teams)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        ownerId: user.id,
      })
      .returning();

    // Add owner as team member
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: 'owner',
    });

    logger.info('Team created', { teamId: team.id, ownerId: user.id });

    return NextResponse.json(
      {
        id: team.id,
        name: team.name,
        description: team.description,
        ownerId: team.ownerId,
        role: 'owner',
        createdAt: team.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Teams POST error', { error });
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
