'use client';

import React, { useState, useMemo } from 'react';
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
import { Loader2, Sparkles, Download, Printer } from 'lucide-react';
import Image from 'next/image';
import { educationalData } from '@/lib/educational-data';
import { generateCAPSContent, GenerateCAPSContentOutput } from '@/ai/flows/generate-caps-content';
import type { GenerateCAPSContentInput as CAPSInput } from '@/ai/flows/generate-caps-content';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, addDoc, writeBatch, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { add } from 'date-fns';
import type { Class, Teacher } from '@/lib/types';

const CONTENT_CATEGORIES = {
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

export default function ContentGeneratorPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  
  const [category, setCategory] = useState<string>('');
  const [subType, setSubType] = useState<string>('');
  const [manualType, setManualType] = useState<string>('');

  const [manualSubject, setManualSubject] = useState('');
  const [manualTopic, setManualTopic] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [difficulty, setDifficulty] = useState('');
  const [length, setLength] = useState('');
  const [assessmentFormat, setAssessmentFormat] = useState('');
  const [generatedContent, setGeneratedContent] = useState<GenerateCAPSContentOutput | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [fontFamily, setFontFamily] = useState('');
  const [customHeading, setCustomHeading] = useState('');
  const [customSubject, setCustomSubject] = useState('');

  const subjects = grade ? educationalData[grade as keyof typeof educationalData]?.subjects : [];
  const topics = grade && subject ? educationalData[grade as keyof typeof educationalData]?.topics[subject] : [];
  const isFoundationPhase = ['R', '1', '2', '3'].includes(grade);
  
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

  const handleGenerate = async () => {
    const finalSubject = subject === 'manual' ? manualSubject : subject;
    const finalTopic = topic === 'manual' ? manualTopic : topic;

    if (!grade || !finalSubject || !finalTopic || !finalContentType) {
      toast({ title: "Missing Information", description: "Fill out all required fields.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    setGeneratedContent(null);

    let finalFont = fontFamily || (isFoundationPhase ? 'font-patrick-hand' : 'font-sans');

    try {
      const input: CAPSInput = {
        grade: grade as any,
        subject: finalSubject,
        topic: finalTopic,
        contentType: finalContentType,
        additionalInstructions,
        difficulty: difficulty || undefined,
        length: length || undefined,
        assessmentFormat: assessmentFormat as any || undefined,
        fontFamily: finalFont,
        customHeading,
        customSubject,
        teacherName: user?.displayName || 'Educator',
        signatureUrl: teacherData?.signatureUrl,
        aiDifficultyAdaptation: teacherData?.aiDifficultyAdaptation,
        culturalContextIntegration: teacherData?.culturalContextIntegration,
      };
      const result = await generateCAPSContent(input);
      setGeneratedContent(result);

      if (result && user) {
        await addDoc(collection(firestore, 'teachers', user.uid, 'generatedContent'), {
          ...result,
          teacherId: user.uid,
          grade,
          subject: finalSubject,
          topic: finalTopic,
          contentType: finalContentType,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
        toast({ title: "Generation Failed", description: "Could not generate content. Try again.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const handleSaveAndAssign = async () => {
    if (!generatedContent || !selectedClassId || !user) return;
    setIsAssigning(true);
    try {
        const contentRef = await addDoc(collection(firestore, 'content'), {
            ...generatedContent,
            teacherId: user.uid,
            grade,
            subject: subject === 'manual' ? manualSubject : subject,
            topic: topic === 'manual' ? manualTopic : topic,
            contentType: finalContentType,
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
        toast({ title: 'Success!', description: `Content assigned.` });
        setGeneratedContent(null);
    } catch (error: any) {
        toast({ title: 'Assignment Failed', description: error.message, variant: 'destructive' });
    } finally {
        setIsAssigning(false);
    }
  };

  const handlePrint = () => {
    if (!generatedContent) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>EduAI Companion Content</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Comic+Neue:wght@400;700&family=Schoolbell&display=swap');
              body { font-family: sans-serif; padding: 2rem; color: #000; }
              img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0; display: block; }
              hr { border: 0; border-top: 1px solid #eee; margin: 2rem 0; }
              .font-patrick-hand { font-family: 'Patrick Hand', cursive; }
              .font-comic-neue { font-family: 'Comic Neue', cursive; }
              .font-schoolbell { font-family: 'Schoolbell', cursive; }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${generatedContent.content}
            ${generatedContent.memo ? `<hr /><h2 style="page-break-before: always;">Memo</h2>${generatedContent.memo}` : ''}
            ${generatedContent.rubric ? `<hr /><h2>Rubric</h2>${generatedContent.rubric}` : ''}
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 1000);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
          <Image src="https://i.ibb.co/tTc5gG5k/eduaicompanion-logo2-preview-1772467621580-2-preview-1772473153046.png" alt="EduAI Logo" width={32} height={48} className="mr-3" />
          AI Content Generator
        </h1>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Content Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Custom Heading (Optional)" value={customHeading} onChange={e => setCustomHeading(e.target.value)} />
              <Input placeholder="Custom Subject (Optional)" value={customSubject} onChange={e => setCustomSubject(e.target.value)} />
              
              <div className="grid grid-cols-1 gap-4">
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                  <SelectContent>{Object.keys(educationalData).map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={v => { setCategory(v); setSubType(''); }}>
                    <SelectTrigger><SelectValue placeholder="Choose Category" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(CONTENT_CATEGORIES).map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Resource Type</Label>
                  <Select value={subType} onValueChange={setSubType} disabled={!category}>
                    <SelectTrigger><SelectValue placeholder="Choose Type" /></SelectTrigger>
                    <SelectContent>
                      {category && CONTENT_CATEGORIES[category as keyof typeof CONTENT_CATEGORIES].map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {subType === 'Other' && (
                <Input placeholder="Manually type content type (e.g. Activity Sheet)" value={manualType} onChange={e => setManualType(e.target.value)} />
              )}

              <Select value={subject} onValueChange={setSubject} disabled={!grade}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  {subjects?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  <SelectItem value="manual">Other...</SelectItem>
                </SelectContent>
              </Select>
              {subject === 'manual' && <Input placeholder="Type subject..." value={manualSubject} onChange={e => setManualSubject(e.target.value)} />}

              <Select value={topic} onValueChange={setTopic} disabled={!subject || subject === 'manual'}>
                <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
                <SelectContent>
                  {topics?.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  <SelectItem value="manual">Other...</SelectItem>
                </SelectContent>
              </Select>
              {topic === 'manual' && <Input placeholder="Type topic..." value={manualTopic} onChange={e => setManualTopic(e.target.value)} />}

              <Textarea placeholder="Additional instructions..." value={additionalInstructions} onChange={e => setAdditionalInstructions(e.target.value)} />
            </CardContent>
            <CardFooter>
              <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                Generate Content
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col">
            <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
            <CardContent className="flex-1 overflow-auto bg-muted/50 p-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full"><Loader2 className="h-12 w-12 animate-spin" /><p className="mt-4">Creating your content...</p></div>
              ) : generatedContent ? (
                <Tabs defaultValue="content">
                  <TabsList><TabsTrigger value="content">Content</TabsTrigger><TabsTrigger value="memo">Memo</TabsTrigger></TabsList>
                  <TabsContent value="content" className="prose dark:prose-invert max-w-none"><div dangerouslySetInnerHTML={{ __html: generatedContent.content }} /></TabsContent>
                  <TabsContent value="memo" className="prose dark:prose-invert max-w-none"><div dangerouslySetInnerHTML={{ __html: generatedContent.memo }} /></TabsContent>
                </Tabs>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><Sparkles className="h-12 w-12" /><p className="mt-4">Generated content will appear here.</p></div>
              )}
            </CardContent>
            {generatedContent && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-stretch gap-4 border-t pt-4">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handlePrint} className="flex-1">
                    <Download className="h-4 w-4 mr-2" /> PDF / Print
                  </Button>
                </div>
                <div className='flex gap-2 items-center'>
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Assign to Class" /></SelectTrigger>
                    <SelectContent>{teacherClasses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button disabled={!selectedClassId || isAssigning} onClick={handleSaveAndAssign}>{isAssigning ? <Loader2 className="animate-spin" /> : 'Assign'}</Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
