
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectStorageLibrary() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/content-archive');
  }, [router]);
  return null;
}
