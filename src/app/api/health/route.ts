import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { createSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;

  const checks: Record<string, { status: string; error?: string }> = {
    app: { status: 'ok' },
  };

  // Check database
  if (databaseUrl) {
    try {
      const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 });
      await pool.query('SELECT 1');
      await pool.end();
      checks.database = { status: 'ok' };
    } catch (error) {
      checks.database = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  } else {
    checks.database = { status: 'not_configured' };
  }

  // Check Redis
  if (redisUrl) {
    try {
      const redis = new Redis(redisUrl, { connectTimeout: 5000 });
      await redis.ping();
      redis.disconnect();
      checks.redis = { status: 'ok' };
    } catch (error) {
      checks.redis = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  } else {
    checks.redis = { status: 'not_configured' };
  }

  // Check Supabase (if configured)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createSupabaseClient({ url: supabaseUrl, anonKey: supabaseAnonKey });
      const { error } = await supabase.from('users').select('*', { count: 'exact', head: true });
      
      if (error && error.code !== 'PGRST116') {
        checks.supabase = { status: 'error', error: error.message };
      } else {
        checks.supabase = { status: 'ok' };
      }
    } catch (error) {
      checks.supabase = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  } else {
    checks.supabase = { status: 'not_configured' };
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'ok' || c.status === 'not_configured');

  return NextResponse.json({
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  }, {
    status: allHealthy ? 200 : 503,
  });
}

export async function HEAD(request: NextRequest) {
  const response = await GET(request);
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}