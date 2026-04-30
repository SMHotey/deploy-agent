import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users, supabaseConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from './encryption';
import { createSupabaseClient, getSupabaseAdminClient } from './supabase';
import { NextResponse } from 'next/server';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  isAdmin: boolean;
}

export interface TokenPair {
  accessToken: string;
  expiresIn: number;
}

const JWT_SECRET = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'change-me-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate access token (JWT)
 */
export function generateAccessToken(user: AuthUser): string {
  const secret = (process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'change-me-jwt-secret') as string;
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } as object,
    secret,
    { expiresIn: JWT_EXPIRES_IN } as any
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): AuthUser | null {
  try {
    const secret = (process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'change-me-jwt-secret') as string;
    const decoded = jwt.verify(token, secret) as any;
    return { 
      id: decoded.sub, 
      email: decoded.email || '', 
      name: decoded.name || '',
      isAdmin: decoded.isAdmin || false,
    };
  } catch {
    return null;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(id: number): Promise<AuthUser | null> {
  const [user] = await db.select({ id: users.id, email: users.email, name: users.name, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    name: user.name || '',
    isAdmin: user.isAdmin || false,
  };
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<(AuthUser & { passwordHash: string }) | null> {
  const [user] = await db.select({ id: users.id, email: users.email, name: users.name, isAdmin: users.isAdmin, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name || '',
    isAdmin: user.isAdmin || false,
    passwordHash: user.passwordHash,
  };
}

/**
 * Store user tokens (encrypted)
 */
export async function storeUserTokens(
  userId: number,
  tokens: { vercelToken?: string; githubToken?: string; netlifyToken?: string; supabaseToken?: string },
  encryptionKey: string
): Promise<void> {
  const updates: Record<string, string> = {};
  
  if (tokens.vercelToken) {
    const encrypted = encrypt(tokens.vercelToken, encryptionKey);
    updates.vercelToken = JSON.stringify(encrypted);
  }
  
  if (tokens.githubToken) {
    const encrypted = encrypt(tokens.githubToken, encryptionKey);
    updates.githubToken = JSON.stringify(encrypted);
  }

  if (tokens.netlifyToken) {
    const encrypted = encrypt(tokens.netlifyToken, encryptionKey);
    updates.netlifyToken = JSON.stringify(encrypted);
  }
  
  if (tokens.supabaseToken) {
    const encrypted = encrypt(tokens.supabaseToken, encryptionKey);
    updates.supabaseToken = JSON.stringify(encrypted);
  }
  
  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, userId));
  }
}

/**
 * Get decrypted user tokens
 */
export async function getUserTokens(userId: number, encryptionKey: string): Promise<{ vercelToken?: string; githubToken?: string; netlifyToken?: string; supabaseToken?: string }> {
  const [user] = await db.select({ vercelToken: users.vercelToken, githubToken: users.githubToken, netlifyToken: users.netlifyToken, supabaseToken: users.supabaseToken })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (!user) return {};
  
  const tokens: { vercelToken?: string; githubToken?: string; netlifyToken?: string; supabaseToken?: string } = {};
  
  if (user.vercelToken) {
    try {
      const encrypted = JSON.parse(user.vercelToken);
      tokens.vercelToken = decrypt(encrypted, encryptionKey);
    } catch { /* ignore */ }
  }
  
  if (user.githubToken) {
    try {
      const encrypted = JSON.parse(user.githubToken);
      tokens.githubToken = decrypt(encrypted, encryptionKey);
    } catch { /* ignore */ }
  }

  if (user.netlifyToken) {
    try {
      const encrypted = JSON.parse(user.netlifyToken);
      tokens.netlifyToken = decrypt(encrypted, encryptionKey);
    } catch { /* ignore */ }
  }
  
  if (user.supabaseToken) {
    try {
      const encrypted = JSON.parse(user.supabaseToken);
      tokens.supabaseToken = decrypt(encrypted, encryptionKey);
    } catch { /* ignore */ }
  }
  
  return tokens;
}

/**
 * Get user's Supabase config (decrypted)
 */
export async function getUserSupabaseConfig(userId: number, encryptionKey: string): Promise<{
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  projectName?: string;
  region?: string;
  dbPassword?: string;
} | null> {
  const [config] = await db.select()
    .from(supabaseConfig)
    .where(eq(supabaseConfig.userId, userId))
    .limit(1);

  if (!config) return null;

  const result: any = {
    url: config.url,
    anonKey: config.anonKey || '',
    projectName: config.projectName,
    region: config.region,
  };

  if (config.serviceRoleKey) {
    try {
      const encrypted = JSON.parse(config.serviceRoleKey);
      result.serviceRoleKey = decrypt(encrypted, encryptionKey);
    } catch { /* ignore */ }
  }

  if (config.dbPassword) {
    try {
      const encrypted = JSON.parse(config.dbPassword);
      result.dbPassword = decrypt(encrypted, encryptionKey);
    } catch { /* ignore */ }
  }

  return result;
}

/**
 * Authenticate with Supabase (sign in with email/password)
 * Returns Supabase JWT and user info if successful
 */
export async function authenticateWithSupabase(
  email: string,
  password: string,
  supabaseUrl: string,
  anonKey: string
): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
  try {
    const supabase = createSupabaseClient({ url: supabaseUrl, anonKey });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.session) {
      return { success: false, error: 'No session returned' };
    }

    // Store Supabase token encrypted in our user record
    const [user] = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      await storeUserTokens(user.id, { supabaseToken: data.session.access_token }, 
        process.env.ENCRYPTION_KEY!);
    }

    return {
      success: true,
      token: data.session.access_token,
      user: data.user,
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Authentication failed' 
    };
  }
}

/**
 * Auth middleware for API routes
 */
export async function authenticate(request: Request): Promise<AuthUser | null> {
  // TEMP: Disable auth for testing if flag is set
  if (process.env.DISABLE_AUTH === 'true') {
    return { id: 1, email: 'test@test.com', name: 'Test User', isAdmin: true };
  }

  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.slice(7);
  return verifyToken(token);
}

/**
 * Require admin user - throws/returns error if not admin
 */
export async function requireAdmin(request: Request): Promise<AuthUser | NextResponse> {
  const user = await authenticate(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  return user;
}
