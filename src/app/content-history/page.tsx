// This file has been replaced by Content Storage Library. Redirecting...
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedContentHistory() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/content-storage-library');
  }, [router]);
  return null;
}
