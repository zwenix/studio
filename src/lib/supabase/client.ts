import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let supabaseInstance: SupabaseClient | null = null;

function createLazyProxy<T extends object>(getTarget: () => T): T {
  const handler: ProxyHandler<T> = {
    get(_target, prop, receiver) {
      const target = getTarget();
      const value = Reflect.get(target as object, prop, receiver);

      if (typeof value === 'function') {
        return value.bind(target);
      }

      return value;
    },
  };

  return new Proxy({} as T, handler);
}

export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

export const supabase = createLazyProxy(getSupabaseClient) as SupabaseClient;
export function createClient() {
  return getSupabaseClient();
}

export default supabase;
