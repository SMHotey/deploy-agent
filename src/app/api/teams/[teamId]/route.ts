import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teams, teamMembers, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';
import { sql } from 'drizzle-orm';

/**
 * GET /api/teams/[teamId]
 * Get team details with members.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const resolvedParams = await params;
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const teamId = parseInt(resolvedParams.teamId);
    if (isNaN(teamId)) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
    }

    // Check membership
    const membership = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)),
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get team with members
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        members: {
          with: {
            user: true,
          },
        },
        owner: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const members = team.members.map((m) => ({
      id: m.userId,
      name: m.user?.name || null,
      email: m.user?.email || null,
      role: m.role,
      joinedAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({
      id: team.id,
      name: team.name,
      description: team.description,
      ownerId: team.ownerId,
      ownerName: (team.owner as any)?.name || null,
      members,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error('Team GET error', { error });
    return NextResponse.json({ error: 'Failed to get team' }, { status: 500 });
  }
}

/**
 * PUT /api/teams/[teamId]
 * Update team (owner or admin only).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const resolvedParams = await params;
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const teamId = parseInt(resolvedParams.teamId);
    if (isNaN(teamId)) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
    }

    // Check membership and role
    const membership = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)),
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (name && name.trim().length === 0) {
      return NextResponse.json({ error: 'Team name cannot be empty' }, { status: 400 });
    }

    const updates: Record<string, string | null> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    updates.updatedAt = new Date().toISOString();

    const [updatedTeam] = await db
      .update(teams)
      .set(updates)
      .where(eq(teams.id, teamId))
      .returning();

    logger.info('Team updated', { teamId, userId: user.id });

    return NextResponse.json({
      id: updatedTeam.id,
      name: updatedTeam.name,
      description: updatedTeam.description,
      updatedAt: updatedTeam.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error('Team PUT error', { error });
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}

/**
 * DELETE /api/teams/[teamId]
 * Delete team (owner only).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const resolvedParams = await params;
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const teamId = parseInt(resolvedParams.teamId);
    if (isNaN(teamId)) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
    }

    // Check if user is owner
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.ownerId !== user.id) {
      return NextResponse.json({ error: 'Only the team owner can delete the team' }, { status: 403 });
    }

    // Delete members and team in a transaction
    await db.transaction(async (tx) => {
      await tx.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
      await tx.delete(teams).where(eq(teams.id, teamId));
    });

    logger.info('Team deleted', { teamId, userId: user.id });

    return NextResponse.json({ message: 'Team deleted' });
  } catch (error) {
    logger.error('Team DELETE error', { error });
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
