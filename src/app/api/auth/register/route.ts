import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, generateAccessToken, storeUserTokens, getUserByEmail } from '@/lib/auth';
import { createSupabaseClient, getSupabaseAdminClient } from '@/lib/supabase';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({
      email,
      passwordHash,
      name: name || null,
    }).returning();

    // Generate token
    const token = generateAccessToken({
      id: user.id,
      email: user.email,
      name: user.name || '',
      isAdmin: false,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken: token,
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
