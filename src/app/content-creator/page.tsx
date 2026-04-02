// src/app/content-creator/page.tsx
// Server component wrapper — force-dynamic prevents static prerender.
// Rendering is delegated to ContentCreatorClient.

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
          <div className="flex h-full items-center justify-center">
            <Loader2 className="animate-spin h-12 w-12 text-primary" />
          </div>
        }
      >
        <ContentCreatorClient />
      </Suspense>
    </AppLayout>
  );
}
