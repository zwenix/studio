
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
import { Library, Search, Eye, Send, Loader2, Plus, FileUp, FileText, ImageIcon, Code, AlertCircle } from 'lucide-react';
import { StaticTemplates } from '@/lib/templates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase, useStorage } from '@/firebase';
import { collection, query, where, addDoc, doc, writeBatch, serverTimestamp, Timestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { add } from 'date-fns';
import type { Class, Template } from '@/lib/types';
import { educationalData } from '@/lib/educational-data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TemplateArchivePage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewingTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');

  // Upload States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    grade: '',
    subject: '',
    category: 'Foundation' as 'Foundation' | 'Intermediate' | 'Senior' | 'FET',
    contentType: 'Worksheet',
    fileType: 'pdf' as 'pdf' | 'image' | 'html',
    content: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch contributed templates from Firestore
  const templatesQuery = useMemoFirebase(() => query(collection(firestore, 'templates')), [firestore]);
  const { data: contributedTemplates, isLoading: isTemplatesLoading, error: templatesError } = useCollection<Template>(templatesQuery);

  const teacherClassesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'classes'), where('teacherId', '==', user.uid));
  }, [firestore, user]);
  const { data: teacherClasses } = useCollection<Class>(teacherClassesQuery);

  // Combine static and contributed templates, sorting new ones first
  const allTemplates = useMemo(() => {
    const combined = [...StaticTemplates];
    if (contributedTemplates) {
      // Sort contributed templates by creation date if available
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
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
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
    if (!uploadData.title || !uploadData.grade || !uploadData.subject || !uploadData.category) {
      toast({ title: "Missing Information", description: "Please fill out all required fields.", variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      let fileUrl = '';
      let content = uploadData.content;

      if (selectedFile) {
        if (uploadData.fileType === 'html') {
          content = await selectedFile.text();
        } else {
          const fileRef = ref(storage, `templates/${user.uid}/${Date.now()}_${selectedFile.name}`);
          await uploadBytes(fileRef, selectedFile);
          fileUrl = await getDownloadURL(fileRef);
        }
      }

      await addDoc(collection(firestore, 'templates'), {
        ...uploadData,
        content,
        fileUrl,
        teacherId: user.uid,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Success!', description: 'Template added to archive.' });
      setIsUploadOpen(false);
      setUploadData({ title: '', description: '', grade: '', subject: '', category: 'Foundation', contentType: 'Worksheet', fileType: 'pdf', content: '' });
      setSelectedFile(null);
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
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

        if (!selectedClass || selectedClass.learnerIds.length === 0) {
          throw new Error("This class has no students to assign to.");
        }

        selectedClass.learnerIds.forEach(learnerId => {
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
        toast({ title: 'Success!', description: `Template assigned to ${selectedClass.name}.` });
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
              <Library className="mr-3 h-8 w-8 text-primary" />
              Template Store
            </h1>
            <p className="text-muted-foreground">
              Ready-to-use CAPS-aligned materials. Select or upload your own.
            </p>
          </div>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg transform transition hover:scale-105">
                <Plus className="mr-2 h-5 w-5" /> Upload Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Contribute a Template</DialogTitle>
                <DialogDescription>Share a high-quality PDF, Image, or HTML template with the community.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Title / Topic</Label>
                  <Input placeholder="e.g. Grade 10 Math: Trigonometry Intro" value={uploadData.title} onChange={e => setUploadData({...uploadData, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="What does this template cover?" value={uploadData.description} onChange={e => setUploadData({...uploadData, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phase</Label>
                    <Select value={uploadData.category} onValueChange={v => setUploadData({...uploadData, category: v as any})}>
                      <SelectTrigger><SelectValue placeholder="Select Phase" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Foundation">Foundation Phase</SelectItem>
                        <SelectItem value="Intermediate">Intermediate Phase</SelectItem>
                        <SelectItem value="Senior">Senior Phase</SelectItem>
                        <SelectItem value="FET">FET Phase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Grade</Label>
                    <Select value={uploadData.grade} onValueChange={v => setUploadData({...uploadData, grade: v})}>
                      <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(educationalData).map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                        <SelectItem value="Any">Any Grade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input placeholder="e.g. Mathematics" value={uploadData.subject} onChange={e => setUploadData({...uploadData, subject: e.target.value})} />
                </div>
                
                <div className="space-y-2">
                  <Label>Resource Format</Label>
                  <Select value={uploadData.fileType} onValueChange={v => setUploadData({...uploadData, fileType: v as any})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="image">Image / Infographic</SelectItem>
                      <SelectItem value="html">HTML Code / File</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {uploadData.fileType === 'html' ? (
                  <div className="space-y-2">
                    <Label>Paste HTML or Upload .html file</Label>
                    <div className="flex flex-col gap-2">
                      <Input type="file" accept=".html" onChange={handleFileChange} />
                      <span className="text-center text-xs text-muted-foreground">OR</span>
                      <Textarea placeholder="Paste HTML here..." rows={8} value={uploadData.content} onChange={e => setUploadData({...uploadData, content: e.target.value})} className="font-mono text-xs" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Upload {uploadData.fileType.toUpperCase()} File</Label>
                    <div className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${selectedFile ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}>
                      <input type="file" accept={uploadData.fileType === 'pdf' ? '.pdf' : 'image/*'} className="hidden" id="tpl-file-upload" onChange={handleFileChange} />
                      <label htmlFor="tpl-file-upload" className="cursor-pointer">
                        <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        {selectedFile ? <p className="font-medium text-primary">{selectedFile.name}</p> : <p className="text-sm text-muted-foreground">Click to select a {uploadData.fileType} file</p>}
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                <Button onClick={handleUploadTemplate} disabled={isUploading}>
                  {isUploading ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2" />}
                  Submit Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

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

        {templatesError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Community Content</AlertTitle>
            <AlertDescription>
              We couldn't fetch some templates. You can still use the system templates below.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isTemplatesLoading && (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}
          
          {!isTemplatesLoading && filteredTemplates.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col hover:shadow-md transition-shadow group relative">
              {tpl.teacherId && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    Community
                  </Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline">{tpl.category}</Badge>
                  <Badge>Grade {tpl.grade}</Badge>
                </div>
                <CardTitle className="group-hover:text-primary transition-colors pr-8">{tpl.title}</CardTitle>
                <CardDescription>{tpl.subject}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {tpl.description}
                </p>
                <div className="mt-auto flex items-center gap-2">
                  {tpl.fileType === 'pdf' && <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100"><FileText className="h-3 w-3 mr-1" /> PDF</Badge>}
                  {tpl.fileType === 'image' && <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100"><ImageIcon className="h-3 w-3 mr-1" /> Image</Badge>}
                  {(!tpl.fileType || tpl.fileType === 'html') && <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100"><Code className="h-3 w-3 mr-1" /> HTML</Badge>}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" className="w-full" onClick={() => setSelectedTemplate(tpl)}>
                  <Eye className="mr-2 h-4 w-4" /> View Template
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {!isTemplatesLoading && filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No templates found matching your criteria.</p>
          </div>
        )}

        <Dialog open={!!viewingTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>{viewingTemplate?.title}</DialogTitle>
                {viewingTemplate?.fileUrl && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={viewingTemplate.fileUrl} target="_blank" rel="noreferrer">Open in New Tab</a>
                  </Button>
                )}
              </div>
              <DialogDescription>
                Review the content and assign it to your class.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden p-4 border rounded-md bg-muted/20">
              <Tabs defaultValue="content" className="h-full flex flex-col">
                <TabsList>
                  <TabsTrigger value="content">Content Preview</TabsTrigger>
                  <TabsTrigger value="rubric">Rubric</TabsTrigger>
                </TabsList>
                <TabsContent value="content" className="flex-1 overflow-auto mt-4 min-h-0">
                  {viewingTemplate?.fileType === 'pdf' ? (
                    <iframe src={viewingTemplate.fileUrl} className="w-full h-full rounded-md border" />
                  ) : viewingTemplate?.fileType === 'image' ? (
                    <img src={viewingTemplate.fileUrl} alt="Template" className="max-w-full h-auto mx-auto rounded-md" />
                  ) : (
                    <div className="prose dark:prose-invert max-w-none p-4 bg-white dark:bg-slate-950 rounded-md">
                      <div dangerouslySetInnerHTML={{ __html: viewingTemplate?.content || '' }} />
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="rubric" className="flex-1 overflow-auto mt-4 min-h-0">
                  <div className="prose dark:prose-invert max-w-none p-4 bg-white dark:bg-slate-950 rounded-md">
                    <div dangerouslySetInnerHTML={{ __html: viewingTemplate?.rubric || 'No rubric provided for this template.' }} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-4 pt-4 border-t mt-4">
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
                <Button disabled={!selectedClassId || isAssigning} onClick={handleAssign} className="shrink-0">
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
