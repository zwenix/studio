'use client';
import { useEffect, useMemo, useState, type DependencyList } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { deleteContent, getContentUrl, saveContentSafely, uploadContent } from '@/lib/content-storage';
import { getSupabaseClient, supabase } from './client';

// ─── Shared async-resource shape ─────────────────────────────────────────────
type AsyncResource<T> = {
  data:      T;
  loading:   boolean;
  /** Alias for loading — many pages destructure as isLoading */
  isLoading: boolean;
  error:     Error | null;
  refetch:   () => Promise<void>;
};

// ─── Auth state shape ─────────────────────────────────────────────────────────
type AuthState = {
  client:        ReturnType<typeof getSupabaseClient>;
  session:       Session | null;
  user:          User | null;
  /** Primary loading flag */
  loading:       boolean;
  /** Alias for loading — many pages destructure as isUserLoading */
  isUserLoading: boolean;
  error:         Error | null;
};

// ─── Helper ───────────────────────────────────────────────────────────────────
function buildStaticResource<T>(data: T): AsyncResource<T> {
  return {
    data,
    loading:   false,
    isLoading: false,
    error:     null,
    refetch:   async () => {},
  };
}

// ─── useAuth ──────────────────────────────────────────────────────────────────
export function useAuth(): AuthState {
  const client                    = getSupabaseClient();
  const [session,  setSession]    = useState<Session | null>(null);
  const [user,     setUser]       = useState<User | null>(null);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    // Register listener FIRST to avoid auth race condition
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    // Hydrate from existing session
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

  return { client, session, user, loading, isUserLoading: loading, error };
}

export function useUser(): AuthState {
  return useAuth();
}

// ─── Firestore-compat shim (returns Supabase client) ─────────────────────────
export function useFirestore() {
  return getSupabaseClient();
}

// ─── Storage shim ─────────────────────────────────────────────────────────────
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

// ─── Collection stub ──────────────────────────────────────────────────────────
export function useCollection<T = unknown>(
  ..._args: unknown[]
): AsyncResource<T[]> {
  return useMemo(() => buildStaticResource<T[]>([]), []);
}

// ─── Doc stub ─────────────────────────────────────────────────────────────────
export function useDoc<T = unknown>(
  ..._args: unknown[]
): AsyncResource<T | null> {
  return useMemo(() => buildStaticResource<T | null>(null), []);
}

// ─── useMemoFirebase shim ─────────────────────────────────────────────────────
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}

export { getSupabaseClient, supabase };
export default supabase;
