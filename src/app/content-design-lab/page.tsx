
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectDesignLab() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/content-creator');
  }, [router]);
  return null;
}
