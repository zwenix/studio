// This file has been replaced by Content Design Lab. Redirecting...
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedContentGenerator() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/content-design-lab');
  }, [router]);
  return null;
}
