'use client';

import React from 'react';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Construction } from 'lucide-react';

export default function CommunicationPage() {
  return (
    <AppLayout>
      <div className="p-4 sm:p-8 pt-6 h-full flex flex-col">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center mb-4">
          <Mail className="mr-3 h-8 w-8" />
          Communication Portal
        </h1>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Coming Soon!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center py-16">
              <Construction className="h-16 w-16 mb-4" />
              <p className="text-xl font-semibold">This feature is under construction.</p>
              <p>We're working hard to bring you an integrated communication portal. Stay tuned!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
