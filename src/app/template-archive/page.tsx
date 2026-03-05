// This file has been integrated into the Storage Library. Redirecting...
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedTemplateArchive() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/content-storage-library');
  }, [router]);
  return null;
}
