'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
  FileUp,
  Camera,
  ScanText,
  Zap,
  Palette,
  Edit3,
  Box,
  Clock,
  Target,
  Users as UsersIcon,
  Printer,
  Save,
  Trash2,
  Type,
  Image as ImageIcon,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { educationalData } from '@/lib/educational-data';
import { generateCAPSContent } from '@/ai/flows/generate-caps-content';
import type { GenerateCAPSContentOutput } from '@/ai/flows/generate-caps-content';
import { extractTextFromImage } from '@/ai/flows/extract-text-from-images';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import {
  collection,
  addDoc,
  doc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { useDropzone } from 'react-dropzone';
import type { Teacher, GeneratedContent } from '@/lib/types';
import { cn } from '@/lib/utils';

const CONTENT_CATEGORIES = {
  'Teaching Tools & Aids': ['Lesson Plans', 'Lesson Slides', 'Notes/Learning Aids for Learners', 'Study Guides', 'Booklets', 'Poster'],
  'Assignments, Exercises & Tasks': ['Worksheet', 'Exercises & Tasks', 'Homework', 'Assignments'],
  'Assessments': [
    'Controlled Test',
    'Examination',
    'Formal Assessment Task (FAT)',
    'Investigation',
    'Project',
    'Case Study',
    'Oral/Speech',
    'Demonstration',
    'Practical Task/Experiment',
    'Portfolio'
  ],
  'Class Management & Admin': [
    'Individualised Learning Plan (ILP)',
    'Classroom Labels',
    'Letters to Parents',
    'Permission Slips',
  ],
  'Other': []
};

const LANGUAGES = ['English', 'Afrikaans', 'isiZulu', 'isiXhosa', 'Sepedi', 'Sesotho', 'Setswana'];

const FONT_OPTIONS = [
  { value: 'font-body', label: 'Modern Sans' },
  { value: 'font-patrick-hand', label: 'Teacher\'s Pet' },
  { value: 'font-comic-neue', label: 'School Friendly' },
  { value: 'font-schoolbell', label: 'Classic Handwriting' },
];

export function ContentCreatorClient() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const printableRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState('ai');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GenerateCAPSContentOutput | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [fontFamily, setFontFamily] = useState('font-body');
  const [useAiImages, setUseAiImages] = useState(true);

  // AI Inputs
  const [grade, setGrade] = useState('');
  const [customGrade, setCustomGrade] = useState('');
  
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  
  const [category, setCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState('');
  
  const [subType, setSubType] = useState<string>('');
  const [customSubType, setCustomSubType] = useState('');
  
  const [term, setTerm] = useState('');
  const [language, setLanguage] = useState('English');
  const [customLanguage, setCustomLanguage] = useState('');
  
  const [learnerProfile, setLearnerProfile] = useState('');
  const [objective, setObjective] = useState('');
  const [duration, setDuration] = useState(''); // This is now Length & Duration free text
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Scanning State
  const [preview, setPreview] = useState<string | null>(null);

  const subjects = useMemo(() => {
    if (!grade || grade === 'Other') return [];
    return (educationalData as any)[grade]?.subjects || [];
  }, [grade]);

  const topics = useMemo(() => {
    if (!grade || !subject || grade === 'Other' || subject === 'Other') return [];
    return (educationalData as any)[grade]?.topics?.[subject] || [];
  }, [grade, subject]);

  const teacherRef = useMemoFirebase(() => (user ? doc(firestore, 'teachers', user.uid) : null), [firestore, user]);
  const { data: teacherData } = useDoc<Teacher>(teacherRef);

  useEffect(() => {
    const editId = searchParams.get('editId');
    if (user && editId) {
      getDoc(doc(firestore, 'teachers', user.uid, 'generatedContent', editId)).then(snap => {
        if (snap.exists()) {
          const data = snap.data() as GeneratedContent;
          setGeneratedContent({ content: data.content, memo: data.memo || '', rubric: data.rubric || '' });
          setGrade(data.grade);
          setSubject(data.subject);
          setTopic(data.topic);
        }
      }).catch(err => {
        console.error('Failed to load content for editing:', err);
        toast({ title: 'Failed to load content', description: 'Could not retrieve the selected content for editing.', variant: 'destructive' });
      });
    }
  }, [searchParams, user, firestore, toast]);

  const handleGenerate = async () => {
    const finalGrade = grade === 'Other' ? customGrade : grade;
    const finalSubject = subject === 'Other' ? customSubject : subject;
    const finalCategory = category === 'Other' ? customCategory : category;
    const finalSubType = subType === 'Other' ? customSubType : subType;
    const finalTopic = topic === 'Other' ? customTopic : topic;
    const finalLanguage = language === 'Other' ? customLanguage : language;

    if (!finalGrade || !finalCategory || !finalSubType || !finalSubject || !finalTopic) {
      toast({ 
        title: 'Missing Information', 
        description: `Please ensure Grade, Subject, Category, Type, and Topic are provided.`, 
        variant: 'destructive' 
      });
      return;
    }

    setIsLoading(true);
    setGeneratedContent(null);

    try {
      const result = await generateCAPSContent({
        grade: finalGrade,
        subject: finalSubject,
        topic: finalTopic,
        contentType: finalSubType,
        category: finalCategory,
        term,
        language: finalLanguage,
        learnerProfile,
        objective,
        duration,
        additionalInstructions,
        teacherName: user?.displayName || 'Educator',
        signatureUrl: teacherData?.signatureUrl,
      });
      setGeneratedContent(result);
    } catch (error) {
      console.error('Generation Failed:', error);
      toast({ title: 'Generation Failed', description: 'Internal server error during content generation.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToArchive = async () => {
    if (!user || !generatedContent) return;
    
    setIsSaving(true);
    try {
      const finalGrade = grade === 'Other' ? customGrade : grade;
      const finalSubject = subject === 'Other' ? customSubject : subject;
      const finalTopic = topic === 'Other' ? customTopic : topic;
      const finalSubType = subType === 'Other' ? customSubType : subType;

      await addDoc(collection(firestore, 'teachers', user.uid, 'generatedContent'), {
        teacherId: user.uid,
        grade: finalGrade,
        subject: finalSubject,
        topic: finalTopic,
        contentType: finalSubType,
        content: generatedContent.content,
        memo: generatedContent.memo,
        rubric: generatedContent.rubric,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Saved!', description: 'Content added to your archive.' });
    } catch (e) {
      toast({ title: 'Save Failed', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setGeneratedContent(null);
    toast({ title: 'Discarded', description: 'Generated content cleared.' });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': ['.jpeg', '.png', '.jpg'] }, multiple: false });

  const handleExtract = async () => {
    if (!preview) return;
    setIsLoading(true);
    try {
      const result = await extractTextFromImage({ photoDataUri: preview });
      setGeneratedContent({ content: `<div class="p-4">${result.extractedText}</div>`, memo: '', rubric: '' });
      setIsEditMode(true);
    } catch (error) {
      toast({ title: 'Extraction Failed', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <Palette className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Content Creator</h1>
            <p className="text-muted-foreground">Unified workshop for magic generation and design.</p>
          </div>
        </div>
        
        {generatedContent && (
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={handleDiscard}>
              <Trash2 className="mr-2 h-4 w-4" /> Discard
            </Button>
            <Button className="rounded-full bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveToArchive} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save to Archive
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="bg-indigo-950 text-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden no-print">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-2">
              <TabsList className="grid grid-cols-3 bg-white/10 rounded-full h-14 p-1">
                <TabsTrigger value="ai" className="rounded-full font-bold h-12 data-[state=active]:bg-yellow-400 data-[state=active]:text-indigo-950">
                  <Sparkles className="mr-2 h-4 w-4" /> Magic AI
                </TabsTrigger>
                <TabsTrigger value="upload" className="rounded-full font-bold h-12 data-[state=active]:bg-yellow-400 data-[state=active]:text-indigo-950">
                  <Camera className="mr-2 h-4 w-4" /> Scan
                </TabsTrigger>
                <TabsTrigger value="archive" className="rounded-full font-bold h-12 data-[state=active]:bg-yellow-400 data-[state=active]:text-indigo-950">
                  <Box className="mr-2 h-4 w-4" /> Archive
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="space-y-4 py-6 scroll-area max-h-[70vh] overflow-y-auto">
              <TabsContent value="ai" className="space-y-4 m-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-indigo-200">Grade Level*</Label>
                    <Select value={grade} onValueChange={setGrade}>
                      <SelectTrigger className="bg-white/10 border-white/20"><SelectValue placeholder="Grade" /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(educationalData).map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                        <SelectItem value="Other">Other...</SelectItem>
                      </SelectContent>
                    </Select>
                    {grade === 'Other' && (
                      <Input placeholder="Specify Grade" value={customGrade} onChange={e => setCustomGrade(e.target.value)} className="bg-white/10 mt-2" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-indigo-200">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="bg-white/10 border-white/20"><SelectValue placeholder="Language" /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        <SelectItem value="Other">Other...</SelectItem>
                      </SelectContent>
                    </Select>
                    {language === 'Other' && (
                      <Input placeholder="Specify Language" value={customLanguage} onChange={e => setCustomLanguage(e.target.value)} className="bg-white/10 mt-2" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-indigo-200">Category*</Label>
                    <Select value={category} onValueChange={v => { setCategory(v); setSubType(''); }}>
                      <SelectTrigger className="bg-white/10 border-white/20"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(CONTENT_CATEGORIES).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        <SelectItem value="Other">Other...</SelectItem>
                      </SelectContent>
                    </Select>
                    {category === 'Other' && (
                      <Input placeholder="Specify Category" value={customCategory} onChange={e => setCustomCategory(e.target.value)} className="bg-white/10 mt-2" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-indigo-200">Type*</Label>
                    <Select value={subType} onValueChange={setSubType} disabled={!category}>
                      <SelectTrigger className="bg-white/10 border-white/20"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        {category && category !== 'Other' && (CONTENT_CATEGORIES as any)[category]?.map((type: string) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        <SelectItem value="Other">Other...</SelectItem>
                      </SelectContent>
                    </Select>
                    {subType === 'Other' && (
                      <Input placeholder="Specify Type" value={customSubType} onChange={e => setCustomSubType(e.target.value)} className="bg-white/10 mt-2" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-indigo-200">Subject*</Label>
                    <Select value={subject} onValueChange={setSubject} disabled={grade === ''}>
                      <SelectTrigger className="bg-white/10 border-white/20"><SelectValue placeholder="Subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects?.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        <SelectItem value="Other">Other...</SelectItem>
                      </SelectContent>
                    </Select>
                    {subject === 'Other' && (
                      <Input placeholder="Specify Subject" value={customSubject} onChange={e => setCustomSubject(e.target.value)} className="bg-white/10 mt-2" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-indigo-200">Topic*</Label>
                    <Select value={topic} onValueChange={setTopic} disabled={subject === ''}>
                      <SelectTrigger className="bg-white/10 border-white/20"><SelectValue placeholder="Topic" /></SelectTrigger>
                      <SelectContent>
                        {topics?.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        <SelectItem value="Other">Other...</SelectItem>
                      </SelectContent>
                    </Select>
                    {topic === 'Other' && (
                      <Input placeholder="Specify Topic" value={customTopic} onChange={e => setCustomTopic(e.target.value)} className="bg-white/10 mt-2" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-indigo-200 flex items-center gap-2"><Clock className="h-3 w-3" /> Length & Duration (Optional)</Label>
                  <Input 
                    placeholder="e.g. 45 minutes, 15 questions..." 
                    value={duration} 
                    onChange={e => setDuration(e.target.value)} 
                    className="bg-white/10" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-indigo-200 flex items-center gap-2"><Target className="h-3 w-3" /> Teaching Objective</Label>
                  <Input placeholder="e.g. Master long division with remainders" value={objective} onChange={e => setObjective(e.target.value)} className="bg-white/10" />
                </div>

                <div className="space-y-2">
                  <Label className="text-indigo-200 flex items-center gap-2"><UsersIcon className="h-3 w-3" /> Learner Profile / Barriers</Label>
                  <Textarea placeholder="e.g. 'Many learners need visual pizza aids for fractions'" value={learnerProfile} onChange={e => setLearnerProfile(e.target.value)} className="bg-white/10 min-h-[80px]" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/10 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-400/20 rounded-lg">
                      <ImageIcon className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">AI-Generated Images</p>
                      <p className="text-xs text-indigo-300">Use Gemini to create custom illustrations</p>
                    </div>
                  </div>
                  <Switch
                    checked={useAiImages}
                    onCheckedChange={setUseAiImages}
                    className="data-[state=checked]:bg-yellow-400"
                  />
                </div>

                <Button onClick={handleGenerate} disabled={isLoading} className="w-full rounded-full h-14 bg-yellow-400 text-indigo-950 font-bold">
                  {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Zap className="mr-2" />} Generate Magic
                </Button>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4 m-0">
                <div {...getRootProps()} className="border-2 border-dashed rounded-[2.5rem] p-12 text-center cursor-pointer hover:bg-white/5 transition-all">
                  <input {...getInputProps()} />
                  <FileUp className="h-16 w-16 mx-auto mb-4 text-indigo-200" />
                  <p className="font-bold font-patrick-hand">Drag & Drop Documents</p>
                </div>
                <Button onClick={handleExtract} disabled={!preview || isLoading} className="w-full rounded-full h-14 bg-yellow-400 text-indigo-950">
                  {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <ScanText className="mr-2" />} Process Scan
                </Button>
              </TabsContent>

              <TabsContent value="archive" className="py-8 text-center">
                <Box className="h-20 w-20 mx-auto mb-6 text-yellow-400" />
                <Button asChild className="rounded-full h-14 bg-white/10 border-white/20 border w-full"><Link href="/content-archive">Open Archive</Link></Button>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <Card className="flex flex-col rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-xl overflow-hidden min-h-[600px]">
          <CardHeader className="border-b bg-primary/5 no-print">
            <div className="flex justify-between items-center">
              <CardTitle className="font-patrick-hand text-2xl">Workspace</CardTitle>
              <div className="flex gap-2">
                {generatedContent && (
                  <>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger className="w-[160px] rounded-full h-9">
                        <Type className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Font" />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-full">
                      <Printer className="mr-2 h-4 w-4" /> Export PDF
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditMode(!isEditMode)} className="rounded-full">
                      <Edit3 className="mr-2 h-4 w-4" /> {isEditMode ? 'View' : 'Edit'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-6" ref={printableRef}>
            {generatedContent ? (
              isEditMode ? (
                <Textarea className="h-full font-mono text-xs no-print" value={generatedContent.content} onChange={e => setGeneratedContent({...generatedContent, content: e.target.value})} />
              ) : (
                <div className={cn("prose dark:prose-invert max-w-none print:text-black", fontFamily)} dangerouslySetInnerHTML={{ __html: generatedContent.content }} />
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-50 no-print">
                <Palette className="h-20 w-20 mb-4" />
                <p className="font-patrick-hand text-2xl">Design Adventure Starts Here!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
