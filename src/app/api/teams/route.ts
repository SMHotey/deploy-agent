import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teams, teamMembers, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
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

    // Get teams where user is owner or member
    const userTeams = await db.query.teams.findMany({
      with: {
        members: {
          with: {
            user: true,
          },
        },
        owner: true,
      },
      where: (teams, { or, eq }) => or(
        eq(teams.ownerId, user.id),
        // TODO: Add check for team_members
      ),
    });

    return NextResponse.json({ teams: userTeams });
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

    if (!name) {
      return NextResponse.json({ error: 'Team name required' }, { status: 400 });
    }

    const [team] = await db.insert(teams).values({
      name,
      description: description || null,
      ownerId: user.id,
    }).returning();

    // Add owner as team member
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: 'owner',
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    logger.error('Teams POST error', { error });
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
