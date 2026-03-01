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
  CardFooter
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, where, addDoc, doc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { History, Loader2, Eye, Printer, Send } from 'lucide-react';
import type { GeneratedContent, Class } from '@/lib/types';
import { format, add } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function ContentHistoryPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedItem, setSelectedItem] = useState<GeneratedContent | null>(null);

  const contentHistoryQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'teachers', user.uid, 'generatedContent'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [firestore, user]);

  const { data: contentHistory, isLoading } = useCollection<GeneratedContent>(contentHistoryQuery);
  
  const teacherClassesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'classes'), where('teacherId', '==', user.uid));
  }, [firestore, user]);
  const { data: teacherClasses } = useCollection<Class>(teacherClassesQuery);

  const handleAssign = async (item: GeneratedContent) => {
    if (!item || !selectedClassId || !user) {
        toast({ title: 'Missing Information', description: 'Please select a class.', variant: 'destructive' });
        return;
    }
    
    setIsAssigning(true);
    try {
        // 1. Create a persistent content record
        const contentRef = await addDoc(collection(firestore, 'content'), {
            teacherId: user.uid,
            grade: item.grade,
            subject: item.subject,
            topic: item.topic,
            contentType: item.contentType,
            content: item.content,
            memo: item.memo || '',
            rubric: item.rubric || '',
            createdAt: serverTimestamp(),
        });

        const selectedClass = teacherClasses?.find(c => c.id === selectedClassId);
        if (!selectedClass || !selectedClass.learnerIds || selectedClass.learnerIds.length === 0) {
            throw new Error("This class has no students to assign content to.");
        }

        const batch = writeBatch(firestore);
        const dueDate = Timestamp.fromDate(add(new Date(), { days: 7 }));

        selectedClass.learnerIds.forEach(learnerId => {
            // Get a unique doc reference for each assignment
            const assignmentRef = doc(collection(firestore, 'classes', selectedClassId, 'assignments'));
            batch.set(assignmentRef, {
                contentId: contentRef.id,
                learnerId,
                teacherId: user.uid,
                status: 'assigned',
                dueDate,
                createdAt: serverTimestamp(),
                rubric: item.rubric || '' 
            });
        });

        await batch.commit();
        toast({ title: 'Success!', description: `Content assigned to ${selectedClass.learnerIds.length} students.` });
        setSelectedItem(null);
        setSelectedClassId('');
    } catch (error: any) {
        console.error("Assignment error:", error);
        toast({ title: 'Assignment Failed', description: error.message, variant: 'destructive' });
    } finally {
        setIsAssigning(false);
    }
  };

  const handlePrint = (item: GeneratedContent) => {
    if (!item) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print - ${item.topic}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Comic+Neue:wght@400;700&family=Schoolbell&display=swap');
              body { font-family: sans-serif; line-height: 1.5; padding: 2rem; }
              img { max-width: 100%; height: auto; border-radius: 0.5rem; display: block; margin: 1rem 0; }
              hr { border: 0; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
              .font-patrick-hand { font-family: 'Patrick Hand', cursive; }
              .font-comic-neue { font-family: 'Comic Neue', cursive; }
              .font-schoolbell { font-family: 'Schoolbell', cursive; }
              h1, h2, h3, h4 { font-weight: 600; margin-top: 2rem; margin-bottom: 1rem; }
              ol, ul { padding-left: 1.5rem; }
            </style>
          </head>
          <body>
            ${item.content}
            ${item.memo ? `<hr /><h2>Memo</h2>${item.memo}` : ''}
            ${item.rubric ? `<hr /><h2>Rubric</h2>${item.rubric}` : ''}
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
          Review and assign your previous AI-generated content.
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
            <Card key={item.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="truncate">{item.topic}</CardTitle>
                <CardDescription>
                  {item.createdAt ? format(item.createdAt.toDate(), 'PPP') : 'Date unknown'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 flex-1">
                <div>
                  <Badge variant="secondary">{item.contentType}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Grade {item.grade} - {item.subject}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedItem(item)}>
                  <Eye className="mr-2 h-4 w-4" /> View / Assign
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{selectedItem?.topic}</DialogTitle>
              <DialogDescription>Review content and assign to a class.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-4 border rounded-md">
                <Tabs defaultValue="content" className="w-full">
                  <TabsList>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    {selectedItem?.memo && <TabsTrigger value="memo">Memo</TabsTrigger>}
                    {selectedItem?.rubric && <TabsTrigger value="rubric">Rubric</TabsTrigger>}
                  </TabsList>
                  <TabsContent value="content" className="mt-4">
                      <div className="prose dark:prose-invert max-w-none bg-muted/50 p-4 rounded-md">
                        <div dangerouslySetInnerHTML={{ __html: selectedItem?.content || '' }} />
                      </div>
                  </TabsContent>
                  {selectedItem?.memo && <TabsContent value="memo" className="mt-4">
                      <div className="prose dark:prose-invert max-w-none bg-muted/50 p-4 rounded-md">
                        <div dangerouslySetInnerHTML={{ __html: selectedItem?.memo || '' }} />
                      </div>
                  </TabsContent>}
                  {selectedItem?.rubric && <TabsContent value="rubric" className="mt-4">
                      <div className="prose dark:prose-invert max-w-none bg-muted/50 p-4 rounded-md">
                        <div dangerouslySetInnerHTML={{ __html: selectedItem?.rubric || '' }} />
                      </div>
                  </TabsContent>}
                </Tabs>
            </div>
             <DialogFooter className="flex-col sm:flex-row gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => selectedItem && handlePrint(selectedItem)}>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
                <div className="flex-1 flex gap-2 items-center">
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Assign to Class" /></SelectTrigger>
                        <SelectContent>{teacherClasses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button disabled={!selectedClassId || isAssigning} onClick={() => selectedItem && handleAssign(selectedItem)}>
                        {isAssigning ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Assign
                    </Button>
                </div>
              </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
