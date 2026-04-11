'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/lib/supabase";
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { User as UserProfile } from '@/lib/types';

const publicPaths = ['/', '/login', '/signup'];
const roleSelectionPath = '/role-selection';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

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
