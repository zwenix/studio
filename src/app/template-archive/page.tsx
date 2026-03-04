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
import { Library, Search, Eye, Send, Loader2, Plus, FileUp, FileText, ImageIcon, Code, AlertCircle, Globe, CheckCircle2, Copy, Download } from 'lucide-react';
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
    fileType: 'html' as 'pdf' | 'image' | 'html' | 'url',
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

    // VALIDATION FIX: Ensure all fields including 'subject' are present.
    if (!uploadData.title || !uploadData.grade || !uploadData.subject || !uploadData.resourceCategory || !finalType) {
      toast({ title: "Missing Information", description: "Please fill out all required fields, including Grade and Subject.", variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadStep('ai');
    try {
      let fileUrl = uploadData.externalUrl || '';
      let content = uploadData.content;
      let finalMemo = uploadData.memo;
      let finalRubric = uploadData.rubric;

      // 1. AI Generation (only for assessments)
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

      // 2. Handle File Upload (only if text/URL not provided)
      setUploadStep('storage');
      if (selectedFile && !fileUrl && !content) {
        try {
          if (uploadData.fileType === 'html') {
            content = await selectedFile.text();
          } else {
            const fileRef = ref(storage, `templates/${user.uid}/${Date.now()}_${selectedFile.name}`);
            const result = await uploadBytes(fileRef, selectedFile);
            fileUrl = await getDownloadURL(result.ref);
          }
        } catch (storageError: any) {
          console.error("Storage error:", storageError);
          toast({ title: 'Upload Issue', description: 'Large files may timeout. Please use Paste HTML for best results.', variant: 'destructive' });
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
        fileType: uploadData.fileType,
        teacherId: user.uid,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Success!', description: 'Content added to Store.' });
      setIsUploadOpen(false);
      resetUploadState();
    } catch (error: any) {
      console.error("Upload process failed:", error);
      toast({ title: 'Process Failed', description: 'Direct uploads may timeout on some connections. Try the "Paste HTML" tab.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      setUploadStep('idle');
    }
  };

  const resetUploadState = () => {
    setUploadData({ 
      title: '', description: '', grade: '', subject: '', 
      phase: 'Foundation', resourceCategory: '', subType: '', manualType: '', 
      fileType: 'html', externalUrl: '', content: '', memo: '', rubric: '' 
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
              <Button size="lg" className="shadow-lg rounded-full font-bold h-14 px-8 bg-yellow-400 text-indigo-950 hover:bg-yellow-300"><Plus className="mr-2" /> Load My Content</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="font-patrick-hand text-4xl text-primary">Add New Template</DialogTitle>
                <DialogDescription>Fill out all details. Note that Subject appears after selecting a Grade.</DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Title / Topic</Label>
                    <Input placeholder="e.g. Intro to Trigonometry" value={uploadData.title} onChange={e => setUploadData({...uploadData, title: e.target.value})} disabled={isUploading} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Grade</Label>
                    <Select value={uploadData.grade} onValueChange={v => setUploadData({...uploadData, grade: v, subject: ''})} disabled={isUploading}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Grade" /></SelectTrigger>
                      <SelectContent>{Object.keys(educationalData).map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select value={uploadData.subject} onValueChange={v => setUploadData({...uploadData, subject: v})} disabled={!uploadData.grade || isUploading}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Subject" /></SelectTrigger>
                      <SelectContent>
                        {uploadData.grade && educationalData[uploadData.grade as keyof typeof educationalData]?.subjects.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Tabs defaultValue="paste" className="w-full">
                  <TabsList className="grid grid-cols-3 w-full rounded-full bg-muted p-1 h-14">
                    <TabsTrigger value="paste" className="rounded-full font-bold"><Copy className="h-4 w-4 mr-2" /> Paste HTML</TabsTrigger>
                    <TabsTrigger value="url" className="rounded-full font-bold"><Globe className="h-4 w-4 mr-2" /> Remote URL</TabsTrigger>
                    <TabsTrigger value="file" className="rounded-full font-bold"><FileUp className="h-4 w-4 mr-2" /> Upload File</TabsTrigger>
                  </TabsList>

                  <TabsContent value="paste" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>HTML Content (Most Reliable)</Label>
                      <Textarea 
                        placeholder="Paste your full HTML document code here..." 
                        className="min-h-[250px] font-mono text-xs rounded-2xl border-2" 
                        value={uploadData.content}
                        onChange={e => setUploadData({...uploadData, content: e.target.value, fileType: 'html', externalUrl: ''})}
                        disabled={isUploading}
                      />
                      <p className="text-[10px] text-muted-foreground bg-blue-50 p-2 rounded-lg border">Pasting text directly is immune to upload timeouts and connection errors.</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="url" className="space-y-4 pt-4">
                    <div className="space-y-2 bg-primary/5 p-6 rounded-[2rem] border-2 border-dashed border-primary/20">
                      <Label className="text-primary flex items-center gap-2 font-bold text-lg"><Globe className="h-5 w-5" /> Remote Document Link</Label>
                      <p className="text-sm text-muted-foreground mb-4">Host files in your <strong>/public/templates</strong> folder for the best performance.</p>
                      <Input 
                        placeholder="https://your-app.web.app/templates/my-lesson.html" 
                        className="bg-white rounded-full h-12 border-2 border-primary/20 px-6" 
                        value={uploadData.externalUrl} 
                        onChange={e => setUploadData({...uploadData, externalUrl: e.target.value, fileType: 'url', content: ''})} 
                        disabled={isUploading} 
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="file" className="space-y-4 pt-4">
                    <div className="border-2 border-dashed rounded-[2.5rem] p-12 text-center hover:border-primary transition-colors cursor-pointer bg-muted/20">
                      <input type="file" className="hidden" id="tpl-file-upload" onChange={handleFileChange} disabled={isUploading} />
                      <label htmlFor="tpl-file-upload" className="cursor-pointer">
                        <FileUp className="h-14 w-14 mx-auto text-muted-foreground mb-4" />
                        {selectedFile ? <p className="text-primary font-bold text-lg">{selectedFile.name}</p> : <div className='space-y-1'><p className="text-lg font-bold">Click to select PDF or Image</p><p className='text-xs text-muted-foreground'>Files over 5MB may time out.</p></div>}
                      </label>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-6">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={uploadData.resourceCategory} onValueChange={v => setUploadData({...uploadData, resourceCategory: v, subType: ''})} disabled={isUploading}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>{Object.keys(RESOURCE_CATEGORIES).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Resource Type</Label>
                    <Select value={uploadData.subType} onValueChange={v => setUploadData({...uploadData, subType: v})} disabled={!uploadData.resourceCategory || isUploading}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        {uploadData.resourceCategory && RESOURCE_CATEGORIES[uploadData.resourceCategory as keyof typeof RESOURCE_CATEGORIES].map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {uploadData.subType === 'Other' && (
                  <Input placeholder="Manually type content type..." value={uploadData.manualType} onChange={e => setUploadData({...uploadData, manualType: e.target.value})} disabled={isUploading} className="rounded-xl" />
                )}

                {isUploading && (
                  <div className="bg-indigo-950 p-8 rounded-[2rem] flex flex-col items-center gap-4 animate-pulse border border-yellow-400/30 text-white">
                    <Loader2 className="h-10 w-10 animate-spin text-yellow-400" />
                    <div className="text-center">
                      <p className="text-lg font-patrick-hand text-yellow-400 uppercase tracking-widest">Adventure in Progress...</p>
                      <p className="text-sm text-indigo-200 mt-1 capitalize font-medium">{uploadStep} Phase</p>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 pb-2">
                <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={isUploading} className="rounded-full px-8 h-12">Cancel</Button>
                <Button onClick={handleUploadTemplate} disabled={isUploading} className="rounded-full px-10 h-12 shadow-lg bg-primary hover:bg-primary/90 font-bold">
                  {isUploading ? 'Processing...' : 'Add to Store'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search templates..." className="pl-12 rounded-full border-2 h-14 text-lg focus:ring-primary" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isTemplatesLoading && <div className="col-span-full flex justify-center py-12"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}
          {!isTemplatesLoading && filteredTemplates.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col hover:shadow-xl transition-all duration-300 group relative border-none bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="rounded-full px-3">Grade {tpl.grade}</Badge>
                  {tpl.teacherId === user?.uid && <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 rounded-full">My Content</Badge>}
                </div>
                <CardTitle className="truncate font-patrick-hand text-2xl group-hover:text-primary transition-colors">{tpl.title}</CardTitle>
                <CardDescription className="truncate text-primary font-bold">{tpl.subject}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2">{tpl.description}</p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-black tracking-widest bg-muted/50 px-2 py-1 rounded-full w-fit">
                  <FileText className="h-3 w-3" /> {tpl.contentType}
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-6">
                <Button variant="secondary" className="w-full rounded-full h-12 group-hover:bg-primary group-hover:text-white transition-all shadow-sm font-bold" onClick={() => setSelectedTemplate(tpl)}>
                  <Eye className="mr-2 h-4 w-4" /> View / Assign
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Dialog open={!!viewingTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
          <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-500 p-8 text-white flex flex-row items-center justify-between shrink-0">
              <div>
                <DialogTitle className="font-patrick-hand text-4xl">{viewingTemplate?.title}</DialogTitle>
                <DialogDescription className="text-blue-100 font-bold mt-1">Review and distribute to your class.</DialogDescription>
              </div>
              <Badge variant="outline" className="text-white border-white/40 px-6 py-2 rounded-full uppercase text-sm font-black shadow-inner">Grade {viewingTemplate?.grade}</Badge>
            </div>
            
            <div className="flex-1 overflow-hidden bg-muted/20">
              <Tabs defaultValue="content" className="h-full flex flex-col">
                <div className="px-8 pt-6 shrink-0">
                  <TabsList className="grid grid-cols-3 w-full max-w-md rounded-full p-1.5 bg-white/50 backdrop-blur-md border shadow-sm h-14">
                    <TabsTrigger value="content" className="rounded-full font-bold">Content</TabsTrigger>
                    <TabsTrigger value="memo" className="rounded-full font-bold">Memo</TabsTrigger>
                    <TabsTrigger value="rubric" className="rounded-full font-bold">Rubric</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="content" className="flex-1 overflow-auto m-0 p-8">
                  <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] p-10 shadow-xl border min-h-full">
                    {viewingTemplate?.fileUrl ? (
                      <iframe src={viewingTemplate.fileUrl} className="w-full aspect-[3/4] border-0 rounded-2xl" title="Template Preview" />
                    ) : (
                      <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: viewingTemplate?.content || '' }} />
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="memo" className="flex-1 overflow-auto m-0 p-8">
                  <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] p-10 shadow-xl border min-h-full prose dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: viewingTemplate?.memo || '<p class="text-muted-foreground text-center py-12">No memo required for this resource type.</p>' }} />
                  </div>
                </TabsContent>
                
                <TabsContent value="rubric" className="flex-1 overflow-auto m-0 p-8">
                  <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] p-10 shadow-xl border min-h-full prose dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: viewingTemplate?.rubric || '<p class="text-muted-foreground text-center py-12">No rubric required for this resource type.</p>' }} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="p-8 bg-white dark:bg-slate-900 border-t flex flex-col sm:flex-row gap-4 items-center shrink-0">
              <div className="flex-1 w-full flex gap-3">
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-full rounded-full border-2 focus:ring-primary h-14 text-lg px-6"><SelectValue placeholder="Select Class to Assign" /></SelectTrigger>
                  <SelectContent className="rounded-2xl">{teacherClasses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button disabled={!selectedClassId || isAssigning} onClick={handleAssign} className="h-14 px-10 rounded-full shadow-xl transition-all active:scale-95 text-lg font-bold">
                  {isAssigning ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
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
