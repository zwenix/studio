'use client';
import { useEffect, useMemo, useState, type DependencyList } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { deleteContent, getContentUrl, saveContentSafely, uploadContent } from '@/lib/content-storage';
import { getSupabaseClient, supabase } from './client';
type AsyncResource<T> = {
  data:     T;
  loading:  boolean;
  error:    Error | null;
  refetch:  () => Promise<void>;
};
type AuthState = {
  client:   ReturnType<typeof getSupabaseClient>;
  session:  Session | null;
  user:     User | null;
  loading:  boolean;
  error:    Error | null;
};
function buildStaticResource<T>(data: T): AsyncResource<T> {
  return {
    data,
    loading:  false,
    error:    null,
    refetch:  async () => {},
  };
}
export function useAuth(): AuthState {
  const client                    = getSupabaseClient();
  const [session,  setSession]    = useState<Session | null>(null);
  const [user,     setUser]       = useState<User | null>(null);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState<Error | null>(null);
  useEffect(() => {
    let active = true;
    // Register listener FIRST to avoid race condition
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });
    // Then hydrate from existing session
    client.auth
      .getSession()
      .then(({ data: d, error: sessionError }) => {
        if (!active) return;
        if (sessionError) setError(sessionError);
        setSession(d.session);
        setUser(d.session?.user ?? null);
        setLoading(false);
      })
      .catch((thrown) => {
        if (!active) return;
        setError(thrown instanceof Error ? thrown : new Error('Unable to load auth session.'));
        setLoading(false);
      });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);
  return { client, session, user, loading, error };
}
export function useUser(): AuthState {
  return useAuth();
}
export function useFirestore() {
  return getSupabaseClient();
}
export function useStorage() {
  const client = getSupabaseClient();
  return {
    storage: client.storage,
    uploadContent,
    saveContentSafely,
    deleteContent,
    getContentUrl,
  };
}
export function useCollection<T = unknown>(..._args: unknown[]): AsyncResource<T[]> {
  return useMemo(() => buildStaticResource<T[]>([]), []);
}
export function useDoc<T = unknown>(..._args: unknown[]): AsyncResource<T | null> {
  return useMemo(() => buildStaticResource<T | null>(null), []);
}
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  return useMemo(factory, deps);
}
export { getSupabaseClient, supabase };
export default supabase;
