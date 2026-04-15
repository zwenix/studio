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
export default supabase;


/**
 * React hook to get current Supabase user
 * Fixes: useUser is not a function error
 */
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
