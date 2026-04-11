'use client';
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export type AppUser = User & {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
};

function normalise(user: User | null): AppUser | null {
  if (!user) return null;
  return {
    ...user,
    uid: user.id,
    displayName: user.user_metadata?.full_name ?? user.email ?? null,
    photoURL: user.user_metadata?.avatar_url ?? null,
  };
}

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(normalise(session?.user ?? null));
      setIsUserLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(normalise(session?.user ?? null));
      setIsUserLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { user, isUserLoading };
}
