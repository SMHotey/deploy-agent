import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

/**
 * Create a Supabase client for interacting with the database and auth.
 * If serviceRoleKey is provided, the client will have elevated privileges.
 */
export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.anonKey, {
    // If we have a service role key, we can use it for admin operations
    // but the primary client uses anon key; we'll expose a method to get admin client.
    global: {
      headers: {
        // We could optionally set a custom header, but supabase-js handles auth via anonKey.
      },
    },
  });
}

/**
 * Get an admin client with service role key (if available).
 */
export function getSupabaseAdminClient(config: SupabaseConfig): SupabaseClient | null {
  if (!config.serviceRoleKey) {
    return null;
  }
  return createClient(config.url, config.serviceRoleKey, {
    // Admin client can bypass RLS
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type { SupabaseClient };