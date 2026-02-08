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
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { History, Loader2, Eye, Printer } from 'lucide-react';
import type { GeneratedContent } from '@/lib/types';
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
  
  const handlePrint = (item: GeneratedContent) => {
    if (!item) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print - ${item.topic}</title>
            <style>
              body { font-family: sans-serif; line-height: 1.5; padding: 2rem; }
              img { max-width: 100%; height: auto; border-radius: 0.5rem; display: block; margin: 1rem 0; }
              hr { border: 0; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
              h1, h2, h3, h4 { font-weight: 600; margin-top: 2rem; margin-bottom: 1rem; }
              h1 { font-size: 2em; }
              h2 { font-size: 1.5em; }
              h3 { font-size: 1.25em; }
              ol, ul { padding-left: 1.5rem; }
              em { font-style: italic; color: #555; }
            </style>
          </head>
          <body>
            <h1>${item.topic}</h1>
            <h2>${item.contentType}</h2>
            <hr />
            ${item.content}
            ${item.memo ? `
              <hr style="margin-top: 3rem;" />
              <h2>Memo</h2>
              ${item.memo}
            ` : ''}
            ${item.rubric ? `
              <hr style="margin-top: 3rem;" />
              <h2>Rubric</h2>
              ${item.rubric}
            ` : ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

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
                    <div className="flex-1 overflow-auto p-4">
                        <Tabs defaultValue="content" className="w-full">
                          <TabsList>
                            <TabsTrigger value="content">Content</TabsTrigger>
                            {item.memo && <TabsTrigger value="memo">Memo</TabsTrigger>}
                            {item.rubric && <TabsTrigger value="rubric">Rubric</TabsTrigger>}
                          </TabsList>
                          <TabsContent value="content" className="mt-4">
                              <div className="prose dark:prose-invert max-w-none bg-muted/50 p-4 rounded-md">
                                <div dangerouslySetInnerHTML={{ __html: item.content }} />
                              </div>
                          </TabsContent>
                          {item.memo && <TabsContent value="memo" className="mt-4">
                              <div className="prose dark:prose-invert max-w-none bg-muted/50 p-4 rounded-md">
                                <div dangerouslySetInnerHTML={{ __html: item.memo }} />
                              </div>
                          </TabsContent>}
                          {item.rubric && <TabsContent value="rubric" className="mt-4">
                              <div className="prose dark:prose-invert max-w-none bg-muted/50 p-4 rounded-md">
                                <div dangerouslySetInnerHTML={{ __html: item.rubric }} />
                              </div>
                          </TabsContent>}
                        </Tabs>
                    </div>
                     <DialogFooter className="p-4 pt-2 border-t">
                        <Button variant="outline" onClick={() => handlePrint(item)}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </Button>
                      </DialogFooter>
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
