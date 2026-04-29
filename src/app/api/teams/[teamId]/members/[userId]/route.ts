import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teams, teamMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

/**
 * DELETE /api/teams/[teamId]/members/[userId]
 * Remove a member from the team.
 * - Owner can remove anyone
 * - Admin can remove members and viewers
 * - Members cannot remove anyone
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; userId: string }> }
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

    const targetUserId = parseInt(resolvedParams.userId);
    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Get the requester's membership
    const requesterMembership = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)),
    });

    if (!requesterMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get the target's membership
    const targetMembership = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)),
    });

    if (!targetMembership) {
      return NextResponse.json({ error: 'User is not a member of this team' }, { status: 404 });
    }

    // Prevent removing the owner
    if (targetMembership.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the team owner' }, { status: 403 });
    }

    // Prevent self-removal via this endpoint (owner should delete team)
    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself from the team' }, { status: 400 });
    }

    // Check permissions
    const roleHierarchy: Record<string, number> = { owner: 4, admin: 3, member: 2, viewer: 1 };
    if (
      requesterMembership.role !== 'owner' &&
      roleHierarchy[targetMembership.role] >= roleHierarchy[requesterMembership.role]
    ) {
      return NextResponse.json({ error: 'Insufficient permissions to remove this user' }, { status: 403 });
    }

    // Remove member
    await db
      .delete(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId))
      );

    logger.info('Team member removed', {
      teamId,
      removedUserId: targetUserId,
      removedBy: user.id,
    });

    return NextResponse.json({ message: 'Member removed' });
  } catch (error) {
    logger.error('Remove team member error', { error });
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }
}
