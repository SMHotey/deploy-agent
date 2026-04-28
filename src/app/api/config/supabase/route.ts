import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, getSupabaseAdminClient } from '@/lib/supabase';
import { db } from '@/db';
import { supabaseConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';
import { createLogger, generateRequestId } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    logger.info('Get Supabase config request', { userId: user.id });

    const [config] = await db.select()
      .from(supabaseConfig)
      .where(eq(supabaseConfig.userId, user.id))
      .limit(1);

    if (!config) {
      return NextResponse.json({ exists: false });
    }

    // Return config without sensitive keys (partial info)
    return NextResponse.json({
      exists: true,
      projectName: config.projectName,
      url: config.url,
      region: config.region,
      plan: config.plan,
      hasAnonKey: !!config.anonKey,
      hasServiceRoleKey: !!config.serviceRoleKey,
      createdAt: config.createdAt,
    });
  } catch (error) {
    logger.error('Get Supabase config error', { error });
    return NextResponse.json({ error: 'Failed to get config' }, { status: 500 });
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

    logger.info('Save Supabase config request', { userId: user.id });

    const body = await request.json();
    const { projectName, url, anonKey, serviceRoleKey, region = 'us-east-1', plan = 'free', dbPassword } = body;

    if (!projectName || !url || !anonKey) {
      return NextResponse.json(
        { error: 'projectName, url, and anonKey are required' },
        { status: 400 }
      );
    }

    // Validate Supabase URL format
    if (!url.includes('supabase.co')) {
      return NextResponse.json(
        { error: 'Invalid Supabase URL. Must be a supabase.co URL' },
        { status: 400 }
      );
    }

    // Test connection
    const testClient = createSupabaseClient({ url, anonKey });
    const { error: testError } = await testClient
      .from('projects')
      .select('*', { count: 'exact', head: true });

    if (testError && testError.code !== 'PGRST116') {
      // PGRST116 = table doesn't exist, which is fine for a new project
      logger.warn('Supabase connection test failed', { error: testError.message });
      return NextResponse.json(
        { error: `Supabase connection failed: ${testError.message}` },
        { status: 400 }
      );
    }

    const encryptionKey = process.env.ENCRYPTION_KEY!;
    const updates: any = {
      projectName,
      url,
      anonKey,
      region,
      plan,
      updatedAt: new Date(),
    };

    if (serviceRoleKey) {
      updates.serviceRoleKey = encrypt(serviceRoleKey, encryptionKey);
    }

    if (dbPassword) {
      updates.dbPassword = encrypt(dbPassword, encryptionKey);
    }

    // Check if config already exists
    const [existing] = await db.select({ id: supabaseConfig.id })
      .from(supabaseConfig)
      .where(eq(supabaseConfig.userId, user.id))
      .limit(1);

    if (existing) {
      await db.update(supabaseConfig)
        .set(updates)
        .where(eq(supabaseConfig.id, existing.id));
    } else {
      await db.insert(supabaseConfig).values({
        userId: user.id,
        ...updates,
        createdAt: new Date(),
      });
    }

    logger.info('Supabase config saved', { userId: user.id, projectName });

    return NextResponse.json({
      success: true,
      message: 'Supabase configuration saved',
    });
  } catch (error) {
    logger.error('Save Supabase config error', { error });
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    logger.info('Delete Supabase config request', { userId: user.id });

    await db.delete(supabaseConfig)
      .where(eq(supabaseConfig.userId, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete Supabase config error', { error });
    return NextResponse.json({ error: 'Failed to delete config' }, { status: 500 });
  }
}
