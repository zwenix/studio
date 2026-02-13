'use client';

import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const publicPaths = ['/', '/login', '/signup'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && !publicPaths.includes(pathname)) {
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

  if (loading && !publicPaths.includes(pathname)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user && !publicPaths.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}
