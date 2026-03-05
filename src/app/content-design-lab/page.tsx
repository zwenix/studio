'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Sparkles, 
  Download, 
  Printer, 
  FileUp, 
  Camera, 
  ScanText, 
  Save, 
  Send,
  Zap,
  Palette
} from 'lucide-react';
import Image from 'next/image';
import { educationalData } from '@/lib/educational-data';
import { generateCAPSContent, GenerateCAPSContentOutput } from '@/ai/flows/generate-caps-content';
import { extractTextFromImage } from '@/ai/flows/extract-text-from-images';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, addDoc, writeBatch, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { add } from 'date-fns';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Class, Teacher, User } from '@/lib/types';

const CONTENT_CATEGORIES = {
  "Teaching Tools & Aids": ["Lesson Plans", "Study Guides", "Booklets", "Subject Topic Cutouts", "Other"],
  "Exercises, Tasks & Assessments": ["Exercises & Tasks", "Homework", "Assignments & Group Activities", "Other"],
  "Class Management & Admin": ["Classroom Labels", "Wall Posters", "Signs", "Illustrations", "Letters to Parents", "Announcements & Notice", "Permission Slips", "Other"]
};

export default function ContentDesignLabPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  // Lab State
  const [activeTab, setActiveTab] = useState('ai');
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GenerateCAPSContentOutput | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');

  // AI Generator Form
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState<string>('');
  const [subType, setSubType] = useState<string>('');
  const [manualType, setManualType] = useState<string>('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [customHeading, setCustomHeading] = useState('');
  const [customSubject, setCustomSubject] = useState('');

  // OCR/Upload Form
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCameraOpen, setCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const subjects = grade ? educationalData[grade as keyof typeof educationalData]?.subjects : [];
  const topics = grade && subject ? educationalData[grade as keyof typeof educationalData]?.topics[subject] : [];
  
  const teacherRef = useMemoFirebase(() => user ? doc(firestore, 'teachers', user.uid) : null, [firestore, user]);
  const { data: teacherData } = useDoc<Teacher>(teacherRef);
  
  const teacherClassesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'classes'), where('teacherId', '==', user.uid));
  }, [firestore, user]);
  const { data: teacherClasses } = useCollection<Class>(teacherClassesQuery);

  const finalContentType = useMemo(() => {
    if (subType === 'Other') return manualType;
    return subType;
  }, [subType, manualType]);

  // --- AI GENERATION ---
  const handleGenerate = async () => {
    if (!grade || !subject || !topic || !finalContentType || !category) {
      toast({ title: "Missing Information", description: "Fill out all required fields.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    setGeneratedContent(null);

    try {
      const result = await generateCAPSContent({
        grade: grade as any,
        subject,
        topic,
        contentType: finalContentType,
        category: category as any,
        additionalInstructions,
        teacherName: user?.displayName || 'Educator',
        signatureUrl: teacherData?.signatureUrl,
        aiDifficultyAdaptation: teacherData?.aiDifficultyAdaptation,
        culturalContextIntegration: teacherData?.culturalContextIntegration,
      });
      setGeneratedContent(result);
    } catch (error) {
        toast({ title: "Generation Failed", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  // --- OCR / UPLOAD ---
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const currentFile = acceptedFiles[0];
      setFile(currentFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(currentFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
    multiple: false,
  });

  const handleExtract = async () => {
    if (!preview) return;
    setIsLoading(true);
    try {
      const result = await extractTextFromImage({ photoDataUri: preview });
      setGeneratedContent({
        content: `<div>${result.extractedText}</div>`,
        memo: '',
        rubric: ''
      });
      setActiveTab('ai'); // Move to review state
      toast({ title: 'Text Extracted!' });
    } catch (error) {
      toast({ title: 'Extraction Failed', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isCameraOpen) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          setHasCameraPermission(true);
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (error) {
          setHasCameraPermission(false);
        }
      };
      getCameraPermission();
    } else if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  }, [isCameraOpen]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setPreview(dataUrl);
      setCameraOpen(false);
    }
  };

  // --- UNIFIED ACTIONS ---
  const handleSaveToLibrary = async () => {
    if (!generatedContent || !user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(firestore, 'teachers', user.uid, 'generatedContent'), {
        ...generatedContent,
        teacherId: user.uid,
        grade,
        subject,
        topic: topic || 'User Upload',
        category: category || 'General',
        contentType: finalContentType || 'Document',
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Saved to Library!', description: 'You can find this in your Storage Library.' });
    } catch (error) {
      toast({ title: 'Save Failed', variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!generatedContent || !selectedClassId || !user) return;
    setIsAssigning(true);
    try {
        const contentRef = await addDoc(collection(firestore, 'content'), {
            ...generatedContent,
            teacherId: user.uid,
            grade,
            subject,
            topic: topic || 'Lab Assignment',
            contentType: finalContentType || 'Document',
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
                rubric: generatedContent.rubric || '' 
            });
        });

        await batch.commit();
        toast({ title: 'Assigned successfully!' });
    } catch (error) {
        toast({ title: 'Assignment Failed', variant: "destructive" });
    } finally {
        setIsAssigning(false);
    }
  };

  const handlePrint = () => {
    if (!generatedContent) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>EduAI Lab</title><style>body{font-family:sans-serif;padding:2rem;}img{max-width:100%;}hr{margin:2rem 0;}</style></head><body>${generatedContent.content}${generatedContent.memo ? `<hr/><h2>Memo</h2>${generatedContent.memo}` : ''}</body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center gap-3">
          <Palette className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Content Generation & Design Lab</h1>
            <p className="text-muted-foreground">The magical workshop for all your classroom materials.</p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card className="bg-indigo-950 text-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="pb-2">
                <TabsList className="grid grid-cols-2 bg-white/10 rounded-full h-14 p-1">
                  <TabsTrigger value="ai" className="rounded-full font-bold h-12 data-[state=active]:bg-yellow-400 data-[state=active]:text-indigo-950">
                    <Sparkles className="mr-2 h-4 w-4" /> AI Magic
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="rounded-full font-bold h-12 data-[state=active]:bg-yellow-400 data-[state=active]:text-indigo-950">
                    <Camera className="mr-2 h-4 w-4" /> Scan & Upload
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="space-y-4 py-6">
                <TabsContent value="ai" className="space-y-4 m-0">
                  <div className="grid grid-cols-1 gap-4">
                    <Select value={grade} onValueChange={setGrade}>
                      <SelectTrigger className="bg-white/10 border-white/20 rounded-xl"><SelectValue placeholder="Select Grade" /></SelectTrigger>
                      <SelectContent>{Object.keys(educationalData).map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}</SelectContent>
                    </Select>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Select value={category} onValueChange={v => { setCategory(v); setSubType(''); }}>
                        <SelectTrigger className="bg-white/10 border-white/20 rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
                        <SelectContent>{Object.keys(CONTENT_CATEGORIES).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={subType} onValueChange={setSubType} disabled={!category}>
                        <SelectTrigger className="bg-white/10 border-white/20 rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>{category && CONTENT_CATEGORIES[category as keyof typeof CONTENT_CATEGORIES].map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    <Select value={subject} onValueChange={setSubject} disabled={!grade}>
                      <SelectTrigger className="bg-white/10 border-white/20 rounded-xl"><SelectValue placeholder="Subject" /></SelectTrigger>
                      <SelectContent>{subjects?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>

                    <Select value={topic} onValueChange={setTopic} disabled={!subject}>
                      <SelectTrigger className="bg-white/10 border-white/20 rounded-xl"><SelectValue placeholder="Topic" /></SelectTrigger>
                      <SelectContent>{topics?.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>

                    <Textarea placeholder="Magical instructions (e.g. Include lots of space for drawing)..." value={additionalInstructions} onChange={e => setAdditionalInstructions(e.target.value)} className="bg-white/10 border-white/20 rounded-2xl min-h-[100px]" />
                  </div>
                  <Button onClick={handleGenerate} disabled={isLoading} className="w-full rounded-full h-14 text-lg font-bold bg-yellow-400 text-indigo-950 hover:bg-yellow-300 shadow-lg">
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Zap className="mr-2 h-5 w-5" />} Generate Content
                  </Button>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4 m-0">
                  <div {...getRootProps()} className={`border-2 border-dashed rounded-[2.5rem] p-12 text-center transition-all ${isDragActive ? 'border-yellow-400 bg-white/10' : 'border-white/20 hover:border-yellow-400/50 cursor-pointer'}`}>
                    <input {...getInputProps()} />
                    <FileUp className="h-16 w-16 mx-auto mb-4 text-indigo-200" />
                    <p className="text-xl font-bold font-patrick-hand">Drag & Drop Documents</p>
                    <p className="text-sm text-indigo-200 mt-2">PDF or Images supported</p>
                  </div>

                  <div className="flex gap-4">
                    <Dialog open={isCameraOpen} onOpenChange={setCameraOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1 rounded-full border-white/20 bg-white/5 h-12 font-bold hover:bg-white/10 text-white"><Camera className="mr-2 h-4 w-4" /> Camera Scan</Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-[2rem] bg-indigo-950 text-white border-none">
                        <DialogHeader><DialogTitle className="font-patrick-hand text-2xl">Camera Capture</DialogTitle></DialogHeader>
                        {hasCameraPermission === false ? <Alert variant="destructive"><AlertTitle>Access Denied</AlertTitle></Alert> : <video ref={videoRef} className="w-full aspect-video rounded-2xl bg-black" autoPlay muted playsInline />}
                        <DialogFooter><Button onClick={handleCapture} className="w-full rounded-full bg-yellow-400 text-indigo-950 font-bold">Capture Photo</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {preview && (
                    <div className="relative group">
                      <img src={preview} alt="Scan preview" className="rounded-2xl max-h-48 w-full object-cover border-2 border-white/10" />
                      <div className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                        <Button variant="secondary" size="sm" onClick={() => setPreview(null)} className="rounded-full">Remove</Button>
                      </div>
                    </div>
                  )}

                  <Button onClick={handleExtract} disabled={!preview || isLoading} className="w-full rounded-full h-14 text-lg font-bold bg-yellow-400 text-indigo-950 hover:bg-yellow-300 shadow-lg">
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ScanText className="mr-2 h-5 w-5" />} Process with OCR
                  </Button>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          <Card className="flex flex-col rounded-[2.5rem] overflow-hidden border-none shadow-xl bg-white dark:bg-slate-900">
            <CardHeader className="bg-primary/5 border-b pb-4">
              <CardTitle className="font-patrick-hand text-2xl flex items-center gap-2">Design Preview & Actions</CardTitle>
              <CardDescription>Review your work and distribute it.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 animate-pulse">
                  <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  <p className="font-patrick-hand text-xl">Creating your masterpiece...</p>
                </div>
              ) : generatedContent ? (
                <div className="prose dark:prose-invert max-w-none bg-muted/30 p-6 rounded-[2rem] border">
                  <div dangerouslySetInnerHTML={{ __html: generatedContent.content }} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                  <Palette className="h-20 w-20 mb-4" />
                  <p className="font-patrick-hand text-2xl">Design something magical!</p>
                </div>
              )}
            </CardContent>
            
            {generatedContent && (
              <CardFooter className="flex flex-col gap-4 border-t p-6 bg-slate-50 dark:bg-slate-950">
                <div className="flex w-full gap-2">
                  <Button variant="outline" onClick={handlePrint} className="flex-1 rounded-full"><Printer className="mr-2 h-4 w-4" /> Print / PDF</Button>
                  <Button variant="outline" onClick={handleSaveToLibrary} disabled={isSaving} className="flex-1 rounded-full">
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save to Library
                  </Button>
                </div>
                <div className="flex w-full gap-2 items-center">
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="flex-1 rounded-full"><SelectValue placeholder="Assign to Class" /></SelectTrigger>
                    <SelectContent>{teacherClasses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button disabled={!selectedClassId || isAssigning} onClick={handleAssign} className="rounded-full px-8 bg-primary">
                    {isAssigning ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Assign
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
