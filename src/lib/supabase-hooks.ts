'use client';

import { useEffect, useMemo, useState, type DependencyList } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase/client';
import {
  deleteContent,
  getContentUrl,
  saveContentSafely,
  uploadContent,
} from './content-storage';

// ---------------------------------------------------------------------------
// Generic async-resource shape
// ---------------------------------------------------------------------------
export type AsyncResource<T> = {
  data: T;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export type AuthState = {
  client: ReturnType<typeof getSupabaseClient>;
  session: Session | null;
  user: SupabaseUser | null;
  loading: boolean;
  error: Error | null;
};

function buildStaticResource<T>(data: T): AsyncResource<T> {
  return { data, loading: false, error: null, refetch: async () => {} };
}

// ---------------------------------------------------------------------------
// useAuth
// FIX: Previous version had a stale closure bug — the onAuthStateChange
// listener was registered AFTER the initial getSession() but before its
// promise resolved, so a sign-in race could leave loading = true forever.
// ---------------------------------------------------------------------------
export function useAuth(): AuthState {
  const client = getSupabaseClient();

  const [session, setSession]   = useState<Session | null>(null);
  const [user,    setUser]      = useState<SupabaseUser | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    // Subscribe FIRST so we never miss an event
    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      }
    );

    // Hydrate initial session
    client.auth.getSession().then(({ data, error: err }) => {
      if (!mounted) return;
      if (err) setError(err);
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [client]);

  return { client, session, user, loading, error };
}

/** Alias kept for backward-compat with components that use useUser() */
export function useUser(): AuthState {
  return useAuth();
}

/** Returns the Supabase client (name kept for Firebase-migration compat) */
export function useFirestore() {
  return getSupabaseClient();
}

/** Returns upload/download helpers for Supabase Storage */
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

// ---------------------------------------------------------------------------
// Stub hooks — kept for components migrated from Firebase that still call
// useCollection / useDoc.  Replace with real Supabase queries gradually.
// ---------------------------------------------------------------------------
export function useCollection<T>(..._args: unknown[]): AsyncResource<T[]> {
  return useMemo(() => buildStaticResource<T[]>([]), []);
}

export function useDoc<T>(..._args: unknown[]): AsyncResource<T | null> {
  return useMemo(() => buildStaticResource<T | null>(null), []);
}

/**
 * useMemoFirebase — originally wrapped Firestore query builders.
 * Now a thin memo wrapper kept for call-site compatibility.
 */
export function useMemoFirebase<T>(
  factory: () => T,
  deps: DependencyList
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}
