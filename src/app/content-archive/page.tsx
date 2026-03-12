
'use client';

import React, { useState, useMemo } from 'react';
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
  DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Box, History, ExternalLink, Library, Loader2, Eye, Send, Trash2, Edit3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, where, addDoc, doc, writeBatch, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore';
import type { GeneratedContent, Class, Template } from '@/lib/types';
import { format, add } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { StaticTemplates } from '@/lib/templates';

type CombinedItem = 
  | (GeneratedContent & { isSystem: false }) 
  | (Template & { createdAt: Timestamp; isSystem: true });

export default function ContentArchivePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedItem, setSelectedItem] = useState<CombinedItem | null>(null);

  const contentHistoryQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'teachers', user.uid, 'generatedContent'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
  }, [firestore, user]);

  const { data: contentHistory, isLoading } = useCollection<GeneratedContent>(contentHistoryQuery);
  
  const teacherClassesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'classes'), where('teacherId', '==', user.uid));
  }, [firestore, user]);
  const { data: teacherClasses } = useCollection<Class>(teacherClassesQuery);

  const combinedItems = useMemo((): CombinedItem[] => {
    const userItems: CombinedItem[] = (contentHistory || []).map(item => ({ ...item, isSystem: false as const }));
    const systemItems: CombinedItem[] = StaticTemplates.map(t => ({
      ...t,
      createdAt: Timestamp.now(),
      isSystem: true as const,
    }));
    return [...userItems, ...systemItems].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [contentHistory]);

  const filteredItems = combinedItems.filter(item => {
    const label = item.isSystem ? item.title : item.topic;
    const subject = item.subject || 'General';
    return (
      (label?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (subject?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleAssign = async (item: CombinedItem) => {
    if (!item || !selectedClassId || !user) return;
    setIsAssigning(true);
    try {
        const itemAny = item as any;
        const contentRef = await addDoc(collection(firestore, 'content'), {
            teacherId: user.uid,
            grade: item.grade,
            subject: item.subject,
            topic: item.isSystem ? itemAny.title : itemAny.topic,
            contentType: item.contentType,
            content: item.content,
            memo: itemAny.memo || '',
            rubric: itemAny.rubric || '',
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
                rubric: itemAny.rubric || '',
            });
        });

        await batch.commit();
        toast({ title: 'Success', description: 'Item assigned to class.' });
        setSelectedItem(null);
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to assign content.', variant: "destructive" });
    } finally {
        setIsAssigning(false);
    }
  };

  const handleDelete = async (item: CombinedItem) => {
    if (!user || item.isSystem) return;
    try {
      await deleteDoc(doc(firestore, 'teachers', user.uid, 'generatedContent', item.id));
      toast({ title: 'Removed', description: 'Item removed from Archive.' });
    } catch (e) {
      toast({ title: 'Error', variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-8 p-4 sm:p-8 pt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-indigo-600 to-blue-500 p-10 rounded-[3rem] text-white shadow-xl">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold font-patrick-hand flex items-center gap-4">
              <Box className="h-12 w-12 text-yellow-400" /> Content & Archive
            </h1>
            <p className="text-xl text-blue-100 font-medium mt-2">Central hub for all your materials and templates.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-indigo-950 text-white border-none shadow-lg rounded-[2.5rem] overflow-hidden group">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-4 bg-yellow-400 rounded-2xl text-indigo-950"><Library className="h-8 w-8" /></div>
              <div>
                <CardTitle className="font-patrick-hand text-2xl">Official Repo</CardTitle>
                <CardDescription className="text-indigo-200">System templates & documentation.</CardDescription>
              </div>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full rounded-full bg-white/10 hover:bg-white/20 text-white border-white/20 border">
                <a href="https://zwenix.github.io/eduai-caps-resources/" target="_blank" rel="noopener noreferrer">
                  Browse CAPS Resources <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-indigo-950 text-white border-none shadow-lg rounded-[2.5rem] overflow-hidden group">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-4 bg-blue-500 rounded-2xl text-white"><History className="h-8 w-8" /></div>
              <div>
                <CardTitle className="font-patrick-hand text-2xl">Community Store</CardTitle>
                <CardDescription className="text-indigo-200">Shared materials.</CardDescription>
              </div>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full rounded-full bg-white/10 hover:bg-white/20 text-white border-white/20 border">
                <a href="https://github.com/zwenix/eduai-community-content" target="_blank" rel="noopener noreferrer">
                  Explore User Library <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search archive..." className="pl-12 rounded-full h-12" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isLoading && <div className="col-span-full flex justify-center py-12"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}
            
            {!isLoading && filteredItems?.map((item) => {
              const label = item.isSystem ? item.title : item.topic;
              return (
                <Card key={item.id} className="hover:shadow-xl transition-all rounded-[2.5rem] border-none bg-white dark:bg-slate-900 group">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant={item.isSystem ? "default" : "secondary"}>
                        {item.isSystem ? 'Official' : 'History'} - Grade {item.grade}
                      </Badge>
                      {!item.isSystem && (
                        <button onClick={() => handleDelete(item)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <CardTitle className="font-patrick-hand text-2xl truncate">{label}</CardTitle>
                    <CardDescription className="font-bold text-primary">{item.subject}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs uppercase font-black text-muted-foreground">{item.contentType}</div>
                    <p className="text-xs text-muted-foreground">{item.createdAt ? format(item.createdAt.toDate(), 'PPP') : 'N/A'}</p>
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button variant="secondary" className="flex-1 rounded-full" onClick={() => setSelectedItem(item)}>
                      <Eye className="mr-2 h-4 w-4" /> View
                    </Button>
                    <Button variant="outline" className="flex-1 rounded-full border-primary text-primary" onClick={() => {
                      const editParam = item.isSystem ? `templateId=${item.id}` : `editId=${item.id}`;
                      router.push(`/content-creator?${editParam}`);
                    }}>
                      <Edit3 className="mr-2 h-4 w-4" /> Tweak
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-500 p-8 text-white flex justify-between items-center">
              <div>
                <DialogTitle className="font-patrick-hand text-4xl">
                  {selectedItem ? (selectedItem.isSystem ? selectedItem.title : selectedItem.topic) : ''}
                </DialogTitle>
                <DialogDescription className="text-blue-100 font-bold">Preview and Distribute</DialogDescription>
              </div>
              <Badge variant="outline" className="text-white border-white/40">Grade {selectedItem?.grade}</Badge>
            </div>
            
            <div className="flex-1 overflow-auto bg-muted/20 p-8">
              <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] p-10 shadow-inner prose dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: selectedItem?.content || '' }} />
              </div>
            </div>
            
            <div className="p-8 bg-white dark:bg-slate-900 border-t flex flex-col sm:flex-row gap-4">
              <Button variant="outline" className="rounded-full h-14 px-8" onClick={() => {
                  if (selectedItem) {
                    const editParam = selectedItem.isSystem ? `templateId=${selectedItem.id}` : `editId=${selectedItem.id}`;
                    router.push(`/content-creator?${editParam}`);
                  }
                }}>
                <Edit3 className="mr-2 h-5 w-5" /> Tweak in Creator
              </Button>
              <div className="flex-1 flex gap-3">
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-full rounded-full border-2 h-14">
                    <SelectValue placeholder="Assign to Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherClasses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button disabled={!selectedClassId || isAssigning} onClick={() => selectedItem && handleAssign(selectedItem)} className="h-14 px-10 rounded-full font-bold">
                  {isAssigning ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-5 w-5" />} Assign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
