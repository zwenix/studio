'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';
import type { User as UserProfile } from '@/lib/types';

const publicPaths = ['/', '/login', '/signup'];
const roleSelectionPath = '/role-selection';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isLoading = isAuthLoading || (!!user && isProfileLoading);

  useEffect(() => {
    if (isLoading) {
      return; // Wait until all loading is finished
    }

    // If not authenticated and not on a public page, redirect to login
    if (!user && !publicPaths.includes(pathname)) {
      router.push('/login');
      return;
    }

    // If authenticated...
    if (user) {
      // But no profile exists and they are not on the role selection page, redirect there
      if (!userProfile && pathname !== roleSelectionPath) {
        router.push(roleSelectionPath);
        return;
      }
      
      // If a profile exists and they land on a public or role selection page, redirect to dashboard
      if (userProfile && (publicPaths.includes(pathname) || pathname === roleSelectionPath)) {
        router.push('/dashboard');
        return;
      }
    }

  }, [user, userProfile, isLoading, router, pathname]);

  // Show a global loader for protected routes while we verify auth and profile status
  if (isLoading && !publicPaths.includes(pathname) && pathname !== roleSelectionPath) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // Prevent rendering children if a redirect is imminent
  if (!user && !publicPaths.includes(pathname)) {
    return null;
  }
  
  if (user && !userProfile && pathname !== roleSelectionPath) {
      return null;
  }

  return <>{children}</>;
}

    