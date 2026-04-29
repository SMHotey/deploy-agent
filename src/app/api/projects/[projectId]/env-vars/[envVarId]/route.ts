import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { environmentVariables, projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { decrypt, type EncryptedValue } from '@/lib/encryption';
import { createLogger, generateRequestId } from '@/lib/logger';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

/**
 * GET /api/projects/[projectId]/env-vars/[envVarId]
 * Returns the decrypted value of a specific environment variable.
 * WARNING: Only use this when the actual value is needed (e.g., for deployment).
 * The list endpoint intentionally returns masked values.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; envVarId: string }> }
) {
  const resolvedParams = await params;
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const projectId = parseInt(resolvedParams.projectId);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const envVarId = parseInt(resolvedParams.envVarId);
    if (isNaN(envVarId)) {
      return NextResponse.json({ error: 'Invalid env var ID' }, { status: 400 });
    }

    // Verify project ownership
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const envVar = await db.query.environmentVariables.findFirst({
      where: and(
        eq(environmentVariables.id, envVarId),
        eq(environmentVariables.projectId, projectId)
      ),
    });

    if (!envVar) {
      return NextResponse.json(
        { error: 'Environment variable not found' },
        { status: 404 }
      );
    }

    if (!ENCRYPTION_KEY) {
      logger.error('ENCRYPTION_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Decrypt and return value
    const encryptedData = JSON.parse(envVar.encryptedValue) as EncryptedValue;
    const decryptedValue = decrypt(encryptedData, ENCRYPTION_KEY);

    return NextResponse.json({
      id: envVar.id,
      key: envVar.key,
      value: decryptedValue,
      isSecret: envVar.isSecret,
    });
  } catch (error) {
    logger.error('Failed to retrieve environment variable', { error });
    return NextResponse.json(
      { error: 'Failed to retrieve environment variable' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/env-vars/[envVarId]
 * Deletes a specific environment variable by ID.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; envVarId: string }> }
) {
  const resolvedParams = await params;
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const projectId = parseInt(resolvedParams.projectId);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const envVarId = parseInt(resolvedParams.envVarId);
    if (isNaN(envVarId)) {
      return NextResponse.json({ error: 'Invalid env var ID' }, { status: 400 });
    }

    // Verify project ownership
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const deleted = await db
      .delete(environmentVariables)
      .where(
        and(
          eq(environmentVariables.id, envVarId),
          eq(environmentVariables.projectId, projectId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Environment variable not found' },
        { status: 404 }
      );
    }

    logger.info('Environment variable deleted', { projectId, envVarId });

    return NextResponse.json({ message: 'Environment variable deleted' });
  } catch (error) {
    logger.error('Failed to delete environment variable', { error });
    return NextResponse.json(
      { error: 'Failed to delete environment variable' },
      { status: 500 }
    );
  }
}
