'use client';

import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Library, Search, Eye, Send, Loader2, Plus, FileUp, FileText, ImageIcon, Code, AlertCircle, Globe, CheckCircle2 } from 'lucide-react';
import { StaticTemplates } from '@/lib/templates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase, useStorage } from '@/firebase';
import { collection, query, where, addDoc, doc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { add } from 'date-fns';
import type { Class, Template } from '@/lib/types';
import { educationalData } from '@/lib/educational-data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateMemosAndRubrics } from '@/ai/flows/generate-memos-rubrics';

const RESOURCE_CATEGORIES = {
  "Teaching Tools & Aids": [
    "Lesson Plans",
    "Study Guides",
    "Booklets",
    "Subject Topic Cutouts",
    "Other"
  ],
  "Exercises, Tasks & Assessments": [
    "Exercises & Tasks",
    "Homework",
    "Assignments & Group Activities",
    "Other"
  ],
  "Class Management & Admin": [
    "Classroom Labels",
    "Wall Posters",
    "Signs",
    "Illustrations",
    "Letters to Parents",
    "Announcements & Notice",
    "Permission Slips",
    "Other"
  ]
};

export default function TemplateArchivePage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [viewingTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');

  // Upload States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<'idle' | 'ai' | 'storage' | 'finishing'>('idle');
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    grade: '',
    subject: '',
    phase: 'Foundation' as 'Foundation' | 'Intermediate' | 'Senior' | 'FET',
    resourceCategory: '',
    subType: '',
    manualType: '',
    fileType: 'pdf' as 'pdf' | 'image' | 'html' | 'url',
    externalUrl: '',
    content: '',
    memo: '',
    rubric: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const templatesQuery = useMemoFirebase(() => query(collection(firestore, 'templates')), [firestore]);
  const { data: contributedTemplates, isLoading: isTemplatesLoading } = useCollection<Template>(templatesQuery);

  const teacherClassesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'classes'), where('teacherId', '==', user.uid));
  }, [firestore, user]);
  const { data: teacherClasses } = useCollection<Class>(teacherClassesQuery);

  const allTemplates = useMemo(() => {
    const combined = [...StaticTemplates];
    if (contributedTemplates) {
      const sortedContributed = [...contributedTemplates].sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      combined.unshift(...sortedContributed);
    }
    return combined;
  }, [contributedTemplates]);

  const filteredTemplates = allTemplates.filter(t => {
    const title = t.title || '';
    const description = t.description || '';
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPhase = selectedPhase === 'all' || t.category === selectedPhase;
    return matchesSearch && matchesPhase;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (file.type.includes('image')) setUploadData(prev => ({ ...prev, fileType: 'image' }));
      else if (file.type === 'application/pdf') setUploadData(prev => ({ ...prev, fileType: 'pdf' }));
      else if (file.name.endsWith('.html')) setUploadData(prev => ({ ...prev, fileType: 'html' }));
    }
  };

  const handleUploadTemplate = async () => {
    if (!user || !storage) return;
    
    const finalType = uploadData.subType === 'Other' ? uploadData.manualType : uploadData.subType;

    if (!uploadData.title || !uploadData.grade || !uploadData.subject || !uploadData.resourceCategory || !finalType) {
      toast({ title: "Missing Information", description: "Please fill out all required fields.", variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadStep('ai');
    try {
      let fileUrl = uploadData.externalUrl || '';
      let content = uploadData.content;
      let finalMemo = uploadData.memo;
      let finalRubric = uploadData.rubric;

      // 1. AI Generation (if needed)
      if (uploadData.resourceCategory === "Exercises, Tasks & Assessments") {
        if (!finalMemo || !finalRubric) {
          try {
            const aiResult = await generateMemosAndRubrics({
                taskDescription: `Title: ${uploadData.title}. Type: ${finalType}. Description: ${uploadData.description}.`,
                gradeLevel: uploadData.grade,
                subject: uploadData.subject
            });
            finalMemo = finalMemo || aiResult.memo;
            finalRubric = finalRubric || aiResult.rubric;
          } catch (aiError) {
            console.error("AI Generation failed:", aiError);
          }
        }
      }

      // 2. Handle File Upload (only if URL not provided)
      setUploadStep('storage');
      if (selectedFile && !fileUrl) {
        try {
          if (uploadData.fileType === 'html') {
            content = await selectedFile.text();
          } else {
            // Direct simple upload to avoid timeout issues
            const fileRef = ref(storage, `templates/${user.uid}/${Date.now()}_${selectedFile.name}`);
            const result = await uploadBytes(fileRef, selectedFile);
            fileUrl = await getDownloadURL(result.ref);
          }
        } catch (storageError: any) {
          console.error("Storage error:", storageError);
          toast({ title: 'Upload Issue', description: 'Local upload failed. Using a Remote URL is recommended for larger files.', variant: 'destructive' });
          setIsUploading(false);
          return;
        }
      }

      // 3. Save to Firestore
      setUploadStep('finishing');
      await addDoc(collection(firestore, 'templates'), {
        title: uploadData.title,
        description: uploadData.description,
        grade: uploadData.grade,
        subject: uploadData.subject,
        category: uploadData.phase, 
        resourceCategory: uploadData.resourceCategory,
        contentType: finalType,
        content,
        memo: finalMemo,
        rubric: finalRubric,
        fileUrl,
        fileType: uploadData.fileType === 'url' ? 'html' : uploadData.fileType,
        teacherId: user.uid,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Success!', description: 'Content loaded successfully.' });
      setIsUploadOpen(false);
      resetUploadState();
    } catch (error: any) {
      console.error("Upload process failed:", error);
      toast({ title: 'Process Failed', description: 'Could not complete the load. Try using a Remote URL.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      setUploadStep('idle');
    }
  };

  const resetUploadState = () => {
    setUploadData({ 
      title: '', description: '', grade: '', subject: '', 
      phase: 'Foundation', resourceCategory: '', subType: '', manualType: '', 
      fileType: 'pdf', externalUrl: '', content: '', memo: '', rubric: '' 
    });
    setSelectedFile(null);
  };

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
            content: viewingTemplate.content || '',
            fileUrl: viewingTemplate.fileUrl || '',
            fileType: viewingTemplate.fileType || 'html',
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
        toast({ title: 'Success!', description: `Template assigned.` });
        setSelectedTemplate(null);
    } catch (error: any) {
        toast({ title: 'Assignment Failed', variant: 'destructive' });
    } finally {
        setIsAssigning(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center text-primary">
              <Library className="mr-3 h-8 w-8" />
              Template Store
            </h1>
            <p className="text-muted-foreground">Ready-to-use CAPS-aligned materials.</p>
          </div>
          <Dialog open={isUploadOpen} onOpenChange={(open) => { setIsUploadOpen(open); if (!open) resetUploadState(); }}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg"><Plus className="mr-2" /> Load Content</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-patrick-hand text-2xl">Load Template Document</DialogTitle>
                <DialogDescription>Link to a remote file or upload directly.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Title / Topic</Label>
                  <Input placeholder="e.g. Grade 10 Math: Trigonometry" value={uploadData.title} onChange={e => setUploadData({...uploadData, title: e.target.value})} disabled={isUploading} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Grade</Label>
                    <Select value={uploadData.grade} onValueChange={v => setUploadData({...uploadData, grade: v})} disabled={isUploading}>
                      <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                      <SelectContent>{Object.keys(educationalData).map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input placeholder="Mathematics" value={uploadData.subject} onChange={e => setUploadData({...uploadData, subject: e.target.value})} disabled={isUploading} />
                  </div>
                </div>

                <div className="space-y-2 bg-primary/5 p-4 rounded-xl border border-primary/20">
                  <Label className="text-primary flex items-center gap-2"><Globe className="h-4 w-4" /> Remote Document URL (Recommended)</Label>
                  <p className="text-[11px] text-muted-foreground mb-2">To prevent timeouts with large files, we recommend hosting your documents on a service like GitHub Gists or Firebase Hosting and pasting the URL below.</p>
                  <div className="relative">
                    <Code className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="https://gist.githubusercontent.com/..." 
                      className="pl-8 bg-white" 
                      value={uploadData.externalUrl} 
                      onChange={e => {
                        setUploadData({...uploadData, externalUrl: e.target.value, fileType: 'url'});
                        setSelectedFile(null);
                      }} 
                      disabled={isUploading} 
                    />
                  </div>
                </div>

                {!uploadData.externalUrl && (
                  <div className="space-y-2 border-t pt-4">
                    <Label className="flex items-center gap-2"><FileUp className="h-4 w-4" /> Or Upload Local File</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer bg-muted/20">
                      <input type="file" className="hidden" id="tpl-file-upload" onChange={handleFileChange} disabled={isUploading} />
                      <label htmlFor="tpl-file-upload" className="cursor-pointer">
                        <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        {selectedFile ? <p className="text-primary font-medium">{selectedFile.name}</p> : <p className="text-sm">Click to select PDF or Image</p>}
                      </label>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={uploadData.resourceCategory} onValueChange={v => setUploadData({...uploadData, resourceCategory: v, subType: ''})} disabled={isUploading}>
                      <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>{Object.keys(RESOURCE_CATEGORIES).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={uploadData.subType} onValueChange={v => setUploadData({...uploadData, subType: v})} disabled={!uploadData.resourceCategory || isUploading}>
                      <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        {uploadData.resourceCategory && RESOURCE_CATEGORIES[uploadData.resourceCategory as keyof typeof RESOURCE_CATEGORIES].map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {uploadData.subType === 'Other' && (
                  <Input placeholder="Manually type content type..." value={uploadData.manualType} onChange={e => setUploadData({...uploadData, manualType: e.target.value})} disabled={isUploading} />
                )}

                {uploadData.resourceCategory === "Exercises, Tasks & Assessments" && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label>Memo (Optional - AI will generate if blank)</Label>
                      <Textarea placeholder="Paste your answer key here..." value={uploadData.memo} onChange={e => setUploadData({...uploadData, memo: e.target.value})} disabled={isUploading} />
                    </div>
                    <div className="space-y-2">
                      <Label>Rubric (Optional - AI will generate if blank)</Label>
                      <Textarea placeholder="Paste your rubric criteria here..." value={uploadData.rubric} onChange={e => setUploadData({...uploadData, rubric: e.target.value})} disabled={isUploading} />
                    </div>
                  </div>
                )}

                {isUploading && (
                  <div className="bg-primary/10 p-4 rounded-xl flex flex-col items-center gap-3 animate-pulse">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="text-sm font-bold text-primary uppercase tracking-widest">Processing...</p>
                      <p className="text-xs text-muted-foreground mt-1">Current Step: {uploadStep.toUpperCase()}</p>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={isUploading}>Cancel</Button>
                <Button onClick={handleUploadTemplate} disabled={isUploading} className="bg-primary hover:bg-primary/90">
                  {isUploading ? 'Loading Store Item...' : 'Load Store Item'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search templates..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isTemplatesLoading && <div className="col-span-full flex justify-center py-12"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}
          {!isTemplatesLoading && filteredTemplates.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col hover:shadow-lg transition-all duration-300 group relative border-none bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="rounded-full px-3">Grade {tpl.grade}</Badge>
                  {tpl.teacherId === user?.uid && <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">My Upload</Badge>}
                </div>
                <CardTitle className="truncate font-patrick-hand text-xl">{tpl.title}</CardTitle>
                <CardDescription className="truncate text-primary font-medium">{tpl.subject}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2">{tpl.description}</p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                  <FileText className="h-3 w-3" /> {tpl.contentType}
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="secondary" className="w-full rounded-full group-hover:bg-primary group-hover:text-white transition-colors" onClick={() => setSelectedTemplate(tpl)}>
                  <Eye className="mr-2 h-4 w-4" /> View / Assign
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Dialog open={!!viewingTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
          <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden rounded-[2.5rem]">
            <div className="bg-primary p-6 text-white flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="font-patrick-hand text-3xl">{viewingTemplate?.title}</DialogTitle>
                <DialogDescription className="text-blue-100 font-medium">Review content and assign to your students.</DialogDescription>
              </div>
              <Badge variant="outline" className="text-white border-white/20 px-4 py-1 rounded-full uppercase text-xs font-bold">Grade {viewingTemplate?.grade}</Badge>
            </div>
            
            <div className="flex-1 overflow-hidden bg-muted/20">
              <Tabs defaultValue="content" className="h-full flex flex-col">
                <div className="px-6 pt-4">
                  <TabsList className="grid grid-cols-3 w-full max-w-md rounded-full p-1 bg-white/50 backdrop-blur-sm border">
                    <TabsTrigger value="content" className="rounded-full">Content</TabsTrigger>
                    <TabsTrigger value="memo" className="rounded-full">Memo</TabsTrigger>
                    <TabsTrigger value="rubric" className="rounded-full">Rubric</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="content" className="flex-1 overflow-auto m-0 p-6">
                  <div className="bg-white dark:bg-slate-950 rounded-3xl p-8 shadow-inner border min-h-full">
                    {viewingTemplate?.fileUrl ? (
                      <iframe src={viewingTemplate.fileUrl} className="w-full aspect-[3/4] border-0 rounded-2xl" />
                    ) : (
                      <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: viewingTemplate?.content || '' }} />
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="memo" className="flex-1 overflow-auto m-0 p-6">
                  <div className="bg-white dark:bg-slate-950 rounded-3xl p-8 shadow-inner border min-h-full prose dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: viewingTemplate?.memo || '<p class="text-muted-foreground text-center py-12">No memo provided for this item.</p>' }} />
                  </div>
                </TabsContent>
                
                <TabsContent value="rubric" className="flex-1 overflow-auto m-0 p-6">
                  <div className="bg-white dark:bg-slate-950 rounded-3xl p-8 shadow-inner border min-h-full prose dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: viewingTemplate?.rubric || '<p class="text-muted-foreground text-center py-12">No rubric provided for this item.</p>' }} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="p-6 bg-white dark:bg-slate-900 border-t flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1 w-full flex gap-2">
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-full rounded-full border-2 focus:ring-primary h-12"><SelectValue placeholder="Select Class to Assign" /></SelectTrigger>
                  <SelectContent>{teacherClasses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button disabled={!selectedClassId || isAssigning} onClick={handleAssign} className="h-12 px-8 rounded-full shadow-lg transition-transform active:scale-95">
                  {isAssigning ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Assign Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
