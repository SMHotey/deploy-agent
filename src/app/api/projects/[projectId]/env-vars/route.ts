import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { environmentVariables, projects } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { encrypt, decrypt, type EncryptedValue } from '@/lib/encryption';
import { createLogger, generateRequestId } from '@/lib/logger';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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

    // Verify project ownership
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const envVars = await db.query.environmentVariables.findMany({
      where: eq(environmentVariables.projectId, projectId),
      orderBy: [desc(environmentVariables.createdAt)],
    });

    // Return keys without decrypting values (security)
    const result = envVars.map((ev) => ({
      id: ev.id,
      key: ev.key,
      isSecret: ev.isSecret,
      createdAt: ev.createdAt.toISOString(),
      valuePreview: ev.isSecret ? '••••••••' : null,
    }));

    logger.info('Environment variables listed', { projectId, count: result.length });

    return NextResponse.json({ envVars: result });
  } catch (error) {
    logger.error('Failed to list environment variables', { error });
    return NextResponse.json(
      { error: 'Failed to fetch environment variables' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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

    // Verify project ownership
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const body = await request.json();
    const { key, value, isSecret = true } = body;

    if (!key || !value) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      );
    }

    if (!ENCRYPTION_KEY) {
      logger.error('ENCRYPTION_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Encrypt the value
    const encrypted = encrypt(value, ENCRYPTION_KEY);

    // Check if key already exists (update instead of create)
    const existing = await db.query.environmentVariables.findFirst({
      where: and(
        eq(environmentVariables.projectId, projectId),
        eq(environmentVariables.key, key)
      ),
    });

    if (existing) {
      // Update existing
      await db
        .update(environmentVariables)
        .set({
          encryptedValue: JSON.stringify(encrypted),
          iv: encrypted.iv,
          isSecret,
        })
        .where(eq(environmentVariables.id, existing.id));

      logger.info('Environment variable updated', { projectId, key });

      return NextResponse.json({
        id: existing.id,
        key,
        isSecret,
        message: 'Environment variable updated',
      });
    }

    // Create new
    const [newEnvVar] = await db
      .insert(environmentVariables)
      .values({
        projectId,
        key,
        encryptedValue: JSON.stringify(encrypted),
        iv: encrypted.iv,
        isSecret,
      })
      .returning();

    logger.info('Environment variable created', { projectId, key });

    return NextResponse.json(
      {
        id: newEnvVar.id,
        key: newEnvVar.key,
        isSecret: newEnvVar.isSecret,
        createdAt: newEnvVar.createdAt.toISOString(),
        message: 'Environment variable created',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to save environment variable', { error });
    return NextResponse.json(
      { error: 'Failed to save environment variable' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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

    // Verify project ownership
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const envVarId = searchParams.get('id');

    if (!envVarId) {
      return NextResponse.json(
        { error: 'Environment variable ID is required' },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(environmentVariables)
      .where(
        and(
          eq(environmentVariables.id, parseInt(envVarId)),
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
