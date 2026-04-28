import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword, generateAccessToken, authenticateWithSupabase, getUserSupabaseConfig } from '@/lib/auth';
import { getUserTokens } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const body = await request.json();
    const { email, password, useSupabaseAuth = false } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Get user (needed for both auth methods)
    const userWithHash = await getUserByEmail(email);
    if (!userWithHash) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Try Supabase Auth if requested
    if (useSupabaseAuth) {
      logger.info('Attempting Supabase Auth login', { email });

      // Get user's Supabase config
      const userTokens = await getUserTokens(userWithHash.id, process.env.ENCRYPTION_KEY!);
      const supabaseConfig = await getUserSupabaseConfig(userWithHash.id, process.env.ENCRYPTION_KEY!);

      if (!supabaseConfig) {
        return NextResponse.json(
          { error: 'Supabase not configured for this user' },
          { status: 400 }
        );
      }

      const result = await authenticateWithSupabase(
        email,
        password,
        supabaseConfig.url,
        supabaseConfig.anonKey || ''
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Supabase authentication failed' },
          { status: 401 }
        );
      }

      logger.info('Supabase Auth login successful', { userId: userWithHash.id });

      return NextResponse.json({
        user: {
          id: userWithHash.id,
          email: userWithHash.email,
          name: userWithHash.name,
        },
        accessToken: result.token, // Supabase JWT
        supabaseToken: result.token, // Also provide as supabase token
      });
    }

    // Traditional login (local password hash)
    logger.info('Attempting local login', { email });

    // Verify password
    const valid = await verifyPassword(password, userWithHash.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateAccessToken({
      id: userWithHash.id,
      email: userWithHash.email,
      name: userWithHash.name || '',
    });

    logger.info('Local login successful', { userId: userWithHash.id });

    return NextResponse.json({
      user: {
        id: userWithHash.id,
        email: userWithHash.email,
        name: userWithHash.name,
      },
      accessToken: token,
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
