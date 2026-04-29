import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teams, teamMembers, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

/**
 * POST /api/teams/[teamId]/members
 * Add a member to the team (owner/admin only).
 * Body: { email, role? }
 */
export async function POST(
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

    // Check if user is owner or admin
    const membership = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)),
    });

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const targetUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!targetUser) {
      // Generic message prevents user enumeration
      return NextResponse.json({ error: 'Unable to add member' }, { status: 400 });
    }

    // Check if already a member
    const existingMember = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUser.id)),
    });

    if (existingMember) {
      // Same message as "user not found" prevents enumeration
      return NextResponse.json({ error: 'Unable to add member' }, { status: 400 });
    }

    // Prevent role escalation beyond own role
    const newRole = role || 'member';
    const roleHierarchy: Record<string, number> = { owner: 4, admin: 3, member: 2, viewer: 1 };
    if (membership.role !== 'owner' && roleHierarchy[newRole] >= roleHierarchy[membership.role]) {
      return NextResponse.json({ error: 'Cannot assign a role equal to or higher than yours' }, { status: 403 });
    }

    const [newMember] = await db
      .insert(teamMembers)
      .values({
        teamId,
        userId: targetUser.id,
        role: newRole,
      })
      .returning();

    logger.info('Team member added', { teamId, userId: targetUser.id, role: newRole });

    return NextResponse.json(
      {
        id: newMember.id,
        userId: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: newMember.role,
        joinedAt: newMember.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Add team member error', { error });
    return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
  }
}
