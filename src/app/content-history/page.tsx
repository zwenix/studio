'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { History, Loader2, Eye } from 'lucide-react';
import type { GeneratedContent } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

export default function ContentHistoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const contentHistoryQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'teachers', user.uid, 'generatedContent'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
  }, [firestore, user]);

  const { data: contentHistory, isLoading } = useCollection<GeneratedContent>(contentHistoryQuery);

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
          <History className="mr-3 h-8 w-8" />
          Content History
        </h1>
        <p className="text-muted-foreground">
          Review your last 10 pieces of AI-generated content.
        </p>

        {isLoading && (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && (!contentHistory || contentHistory.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-xl font-medium">No Content History</h3>
              <p className="text-muted-foreground mt-2">
                Your generated content will appear here once you create some.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contentHistory?.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="truncate">{item.topic}</CardTitle>
                <CardDescription>
                  {item.createdAt ? format(item.createdAt.toDate(), 'PPP') : 'Date unknown'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Badge variant="secondary">{item.contentType}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Grade {item.grade} - {item.subject}
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Eye className="mr-2 h-4 w-4" /> View Content
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>{item.topic}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto">
                        <Tabs defaultValue="content" className="w-full">
                          <TabsList>
                            <TabsTrigger value="content">Content</TabsTrigger>
                            {item.memo && <TabsTrigger value="memo">Memo</TabsTrigger>}
                            {item.rubric && <TabsTrigger value="rubric">Rubric</TabsTrigger>}
                          </TabsList>
                          <TabsContent value="content" className="mt-4">
                              <div className="bg-muted/50 p-4 rounded-md prose dark:prose-invert max-w-none">
                                <ReactMarkdown>{item.content}</ReactMarkdown>
                              </div>
                          </TabsContent>
                          {item.memo && <TabsContent value="memo" className="mt-4">
                              <div className="bg-muted/50 p-4 rounded-md prose dark:prose-invert max-w-none">
                                <ReactMarkdown>{item.memo}</ReactMarkdown>
                              </div>
                          </TabsContent>}
                          {item.rubric && <TabsContent value="rubric" className="mt-4">
                              <div className="bg-muted/50 p-4 rounded-md prose dark:prose-invert max-w-none">
                                <ReactMarkdown>{item.rubric}</ReactMarkdown>
                              </div>
                          </TabsContent>}
                        </Tabs>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
