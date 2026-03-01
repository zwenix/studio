'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Library, Search, Eye, Send, Loader2 } from 'lucide-react';
import { StaticTemplates } from '@/lib/templates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, doc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { add } from 'date-fns';
import type { Class, Template } from '@/lib/types';

export default function TemplateArchivePage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewingTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');

  const teacherClassesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'classes'), where('teacherId', '==', user.uid));
  }, [firestore, user]);
  const { data: teacherClasses } = useCollection<Class>(teacherClassesQuery);

  const filteredTemplates = StaticTemplates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAssign = async () => {
    if (!viewingTemplate || !selectedClassId || !user) return;
    setIsAssigning(true);
    try {
        const contentRef = await addDoc(collection(firestore, 'content'), {
            teacherId: user.uid,
            grade: viewingTemplate.grade,
            subject: viewingTemplate.subject,
            topic: viewingTemplate.title,
            contentType: viewingTemplate.contentType,
            content: viewingTemplate.content,
            memo: viewingTemplate.memo || '',
            rubric: viewingTemplate.rubric || '',
            createdAt: serverTimestamp(),
        });

        const batch = writeBatch(firestore);
        const selectedClass = teacherClasses?.find(c => c.id === selectedClassId);
        const dueDate = Timestamp.fromDate(add(new Date(), { days: 7 }));

        selectedClass?.learnerIds.forEach(learnerId => {
            const assignmentRef = doc(collection(firestore, 'classes', selectedClassId, 'assignments'));
            batch.set(assignmentRef, {
                contentId: contentRef.id,
                learnerId,
                teacherId: user.uid,
                status: 'assigned',
                dueDate,
                createdAt: serverTimestamp(),
                rubric: viewingTemplate.rubric || '' 
            });
        });

        await batch.commit();
        toast({ title: 'Success!', description: `Template assigned to class.` });
        setSelectedTemplate(null);
    } catch (error: any) {
        toast({ title: 'Assignment Failed', description: error.message, variant: 'destructive' });
    } finally {
        setIsAssigning(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
          <Library className="mr-3 h-8 w-8 text-primary" />
          Template Archive
        </h1>
        <p className="text-muted-foreground">
          Ready-to-use CAPS-aligned educational materials. Select a template to view or assign.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              <SelectItem value="Foundation">Foundation Phase</SelectItem>
              <SelectItem value="Intermediate">Intermediate Phase</SelectItem>
              <SelectItem value="Senior">Senior Phase</SelectItem>
              <SelectItem value="FET">FET Phase</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline">{tpl.category}</Badge>
                  <Badge>Grade {tpl.grade}</Badge>
                </div>
                <CardTitle>{tpl.title}</CardTitle>
                <CardDescription>{tpl.subject}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {tpl.description}
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" className="w-full" onClick={() => setSelectedTemplate(tpl)}>
                  <Eye className="mr-2 h-4 w-4" /> View Template
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No templates found matching your criteria.</p>
          </div>
        )}

        <Dialog open={!!viewingTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{viewingTemplate?.title}</DialogTitle>
              <DialogDescription>
                Review the content and assign it to your class.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto p-4 border rounded-md">
              <Tabs defaultValue="content">
                <TabsList>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="rubric">Rubric</TabsTrigger>
                </TabsList>
                <TabsContent value="content" className="prose dark:prose-invert max-w-none pt-4">
                  <div dangerouslySetInnerHTML={{ __html: viewingTemplate?.content || '' }} />
                </TabsContent>
                <TabsContent value="rubric" className="prose dark:prose-invert max-w-none pt-4">
                  <div dangerouslySetInnerHTML={{ __html: viewingTemplate?.rubric || 'No rubric provided.' }} />
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-4 pt-4 border-t">
              <div className="flex-1 flex gap-2 items-center">
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Class to Assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherClasses?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button disabled={!selectedClassId || isAssigning} onClick={handleAssign}>
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
