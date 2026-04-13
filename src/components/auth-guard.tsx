'use client';

import { useUser } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { User as UserProfile } from '@/lib/types';

const publicPaths = ['/', '/login', '/signup'];
const roleSelectionPath = '/role-selection';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Fetch user profile from Supabase whenever auth user changes
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setIsProfileLoading(false);
      return;
    }

    setIsProfileLoading(true);
    const supabase = getSupabaseClient();

    supabase
      .from('users')
      .select('*')
      .eq('id', user.uid)
      .single()
      .then(({ data, error }) => {
        if (error && error.code !== 'PGRST116') {
          console.error('AuthGuard: error fetching profile', error.message);
        }
        // Normalise snake_case → camelCase
        if (data) {
          setUserProfile({
            ...data,
            firstName: data.first_name ?? data.firstName ?? '',
            lastName:  data.last_name  ?? data.lastName  ?? '',
            avatarUrl: data.avatar_url ?? data.avatarUrl,
          } as UserProfile);
        } else {
          setUserProfile(null);
        }
        setIsProfileLoading(false);
      });
  }, [user]);

  const isLoading = isUserLoading || (!!user && isProfileLoading);

  useEffect(() => {
    if (isLoading) return;

    if (!user && !publicPaths.includes(pathname)) {
      router.push('/login');
      return;
    }

    if (user) {
      if (!userProfile && pathname !== roleSelectionPath) {
        router.push(roleSelectionPath);
        return;
      }
      if (userProfile && (publicPaths.includes(pathname) || pathname === roleSelectionPath)) {
        router.push('/dashboard');
        return;
      }
    }
  }, [user, userProfile, isLoading, router, pathname]);

  if (isLoading && !publicPaths.includes(pathname) && pathname !== roleSelectionPath) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !publicPaths.includes(pathname)) return null;
  if (user && !userProfile && pathname !== roleSelectionPath) return null;

  return <>{children}</>;
}
