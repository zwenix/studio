// src/app/content-creator/page.tsx
// This is a SERVER component — no 'use client' directive.
// It sets force-dynamic so Next.js never tries to statically prerender this route,
// then hands off rendering to the client component below.

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { ContentCreatorClient } from './content-creator-client';

export const dynamic = 'force-dynamic';

export default function ContentCreatorPage() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <Loader2 className="animate-spin h-12 w-12 text-primary" />
          </div>
        }
      >
        <ContentCreatorClient />
      </Suspense>
    </AppLayout>
  );
}
