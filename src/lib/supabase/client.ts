import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
let instance: SupabaseClient | null = null;
/**
 * Get the singleton Supabase browser client.
 * Uses createBrowserClient from @supabase/ssr which stores auth
 * state in cookies (readable by middleware) instead of localStorage.
 *
 * Called lazily — never at module load time — so env vars are always ready.
 */
export function getSupabaseClient(): SupabaseClient {
  if (instance) return instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  instance = createBrowserClient(url, key);
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
 * Named export: lazy proxy so `import { supabase } from '@/lib/supabase/client'`
 * works without crashing at module load time.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseClient();
    const value  = Reflect.get(client as object, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
export default supabase;
