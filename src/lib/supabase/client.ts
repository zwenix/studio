import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let instance: SupabaseClient | null = null;

/**
 * Get the singleton Supabase browser client.
 * Uses createBrowserClient from @supabase/ssr which stores auth
 * state in cookies (readable by middleware) instead of localStorage.
 */
export function getSupabaseClient(): SupabaseClient {
  if (instance) return instance;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  instance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return instance;
}

/**
 * Alias for getSupabaseClient — used by components like
 * Grade1EnglishGenerator that import { createClient }.
 */
export function createClient(): SupabaseClient {
  return getSupabaseClient();
}

/**
 * Default export: pre-initialised Supabase client instance.
 */
const supabase = getSupabaseClient();
export default supabase;
