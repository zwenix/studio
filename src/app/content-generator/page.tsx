'use client';

import React, { useState } from 'react';
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
import { Loader2, Sparkles, Download } from 'lucide-react';
import Image from 'next/image';
import { educationalData } from '@/lib/educational-data';
import { generateCAPSContent, GenerateCAPSContentInput, GenerateCAPSContentOutput } from '@/ai/flows/generate-caps-content';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, writeBatch, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { add } from 'date-fns';
import type { Class } from '@/lib/types';


type ContentType = "lesson plan" | "exercise" | "assessment" | "class planner" | "educational poster";

export default function ContentGeneratorPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState<ContentType | ''>('');
  const [manualSubject, setManualSubject] = useState('');
  const [manualTopic, setManualTopic] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  
  const [generatedContent, setGeneratedContent] = useState<GenerateCAPSContentOutput | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');

  const subjects = grade ? educationalData[grade as keyof typeof educationalData]?.subjects : [];
  const topics = grade && subject ? educationalData[grade as keyof typeof educationalData]?.topics[subject] : [];
  
  const teacherClassesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'classes'), where('teacherId', '==', user.uid));
  }, [firestore, user]);
  const { data: teacherClasses } = useCollection<Class>(teacherClassesQuery);

  const handleGenerate = async () => {
    const finalSubject = subject === 'manual' ? manualSubject : subject;
    const finalTopic = topic === 'manual' ? manualTopic : topic;

    if (!grade || !finalSubject || !finalTopic || !contentType) {
      toast({
        title: "Missing Information",
        description: "Please fill out all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setGeneratedContent(null);

    try {
      const input: GenerateCAPSContentInput = {
        grade: grade as any,
        subject: finalSubject,
        topic: finalTopic,
        contentType: contentType,
        additionalInstructions,
      };
      const result = await generateCAPSContent(input);
      setGeneratedContent(result);
    } catch (error) {
        console.error("Failed to generate content:", error);
        toast({
            title: "Generation Failed",
            description: "Could not generate content. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleSaveAndAssign = async () => {
    if (!generatedContent || !selectedClassId || !user) {
        toast({ title: 'Missing Information', description: 'Please generate content and select a class.', variant: 'destructive'});
        return;
    }

    const selectedClass = teacherClasses?.find(c => c.id === selectedClassId);
    if (!selectedClass || !selectedClass.learnerIds || selectedClass.learnerIds.length === 0) {
        toast({ title: 'No Students in Class', description: 'The selected class has no students to assign the content to.', variant: 'destructive'});
        return;
    }

    setIsAssigning(true);
    try {
        // 1. Save content to /content collection
        const contentRef = await addDoc(collection(firestore, 'content'), {
            ...generatedContent,
            teacherId: user.uid,
            grade,
            subject: subject === 'manual' ? manualSubject : subject,
            topic: topic === 'manual' ? manualTopic : topic,
            contentType,
            createdAt: serverTimestamp(),
        });

        // 2. Create a batch to create assignments for each student
        const batch = writeBatch(firestore);
        const assignmentsCollection = collection(firestore, 'classes', selectedClassId, 'assignments');
        const dueDate = Timestamp.fromDate(add(new Date(), { days: 7 }));

        for (const learnerId of selectedClass.learnerIds) {
            const assignmentRef = doc(assignmentsCollection);
            batch.set(assignmentRef, {
                contentId: contentRef.id,
                learnerId,
                status: 'assigned',
                dueDate,
                createdAt: serverTimestamp(),
            });
        }

        await batch.commit();

        toast({ title: 'Success!', description: `Content assigned to ${selectedClass.name}.` });
        setGeneratedContent(null);
        setSelectedClassId('');

    } catch (error: any) {
        console.error("Failed to assign content:", error);
        toast({ title: 'Assignment Failed', description: error.message || 'Could not assign content.', variant: 'destructive' });
    } finally {
        setIsAssigning(false);
    }
  };

  const handleExportPdf = () => {
    if (!generatedContent) return;
    
    const finalTopic = topic === 'manual' ? manualTopic : topic;

    const doc = new jsPDF();
    const margin = 15;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;

    // --- Content Page ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`${finalTopic} (${contentType})`, margin, margin);

    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    const contentLines = doc.splitTextToSize(generatedContent.content, maxWidth);
    doc.text(contentLines, margin, margin + 15);

    // --- Memo Page ---
    if (generatedContent.memo) {
      doc.addPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Memo', margin, margin);
      
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const memoLines = doc.splitTextToSize(generatedContent.memo, maxWidth);
      doc.text(memoLines, margin, margin + 15);
    }

    // --- Rubric Page ---
    if (generatedContent.rubric) {
      doc.addPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Rubric', margin, margin);

      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const rubricLines = doc.splitTextToSize(generatedContent.rubric, maxWidth);
      doc.text(rubricLines, margin, margin + 15);
    }

    doc.save(`EduAI - ${finalTopic}.pdf`);
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
            <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="AI Content Generator" width={32} height={32} className="mr-3" />
            AI Content Generator
          </h1>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Content Details</CardTitle>
              <CardDescription>
                Specify the details for the CAPS-compliant content you want to generate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger id="grade"><SelectValue placeholder="Select a grade" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(educationalData).map((g) => (
                        <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content-type">Content Type</Label>
                  <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                    <SelectTrigger id="content-type"><SelectValue placeholder="Select a type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lesson plan">Lesson Plan</SelectItem>
                      <SelectItem value="exercise">Exercise</SelectItem>
                      <SelectItem value="assessment">Assessment</SelectItem>
                      <SelectItem value="class planner">Class Planner</SelectItem>
                      <SelectItem value="educational poster">Educational Poster</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select value={subject} onValueChange={setSubject} disabled={!grade}>
                  <SelectTrigger id="subject"><SelectValue placeholder="Select a subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects?.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                    <SelectItem value="manual">Other (Type manually)</SelectItem>
                  </SelectContent>
                </Select>
                {subject === 'manual' && (
                  <Input placeholder="Enter subject manually" value={manualSubject} onChange={(e) => setManualSubject(e.target.value)} className="mt-2" />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Select value={topic} onValueChange={setTopic} disabled={!subject || subject === 'manual'}>
                  <SelectTrigger id="topic"><SelectValue placeholder="Select a topic" /></SelectTrigger>
                  <SelectContent>
                    {topics?.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                     <SelectItem value="manual">Other (Type manually)</SelectItem>
                  </SelectContent>
                </Select>
                 {topic === 'manual' && (
                  <Input placeholder="Enter topic manually" value={manualTopic} onChange={(e) => setManualTopic(e.target.value)} className="mt-2" />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
                <Textarea id="instructions" placeholder="e.g., Focus on visual aids, include a group activity..." value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Content
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Generated Content</CardTitle>
              <CardDescription>
                The AI-generated content will appear here. Review, export, or assign to a class.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto bg-muted/50 rounded-lg p-4 prose-sm max-w-none">
              {isLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="Generating content" width={48} height={48} className="animate-pulse" />
                      <p className="mt-4">Generating content, please wait...</p>
                  </div>
              )}
              {generatedContent ? (
                  <Tabs defaultValue="content" className="w-full">
                    <TabsList>
                      <TabsTrigger value="content">Content</TabsTrigger>
                      {generatedContent.memo && <TabsTrigger value="memo">Memo</TabsTrigger>}
                      {generatedContent.rubric && <TabsTrigger value="rubric">Rubric</TabsTrigger>}
                    </TabsList>
                    <TabsContent value="content" className="mt-4 prose max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-sm">{generatedContent.content}</pre>
                    </TabsContent>
                    {generatedContent.memo && <TabsContent value="memo" className="mt-4 prose max-w-none">
                         <pre className="whitespace-pre-wrap font-sans text-sm">{generatedContent.memo}</pre>
                    </TabsContent>}
                     {generatedContent.rubric && <TabsContent value="rubric" className="mt-4 prose max-w-none">
                         <pre className="whitespace-pre-wrap font-sans text-sm">{generatedContent.rubric}</pre>
                    </TabsContent>}
                  </Tabs>
              ) : !isLoading && (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Sparkles className="h-12 w-12" />
                    <p className="mt-4 text-center">Your generated content will be displayed here.</p>
                </div>
              )}
            </CardContent>
             <CardFooter className="flex flex-col items-stretch gap-4 pt-4 border-t sm:flex-row sm:items-center">
                <Button onClick={handleExportPdf} variant="outline" disabled={!generatedContent || isLoading}>
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                </Button>
                <div className="flex-grow hidden sm:block" />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={!generatedContent || isAssigning}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Select a class to assign" />
                        </SelectTrigger>
                        <SelectContent>
                            {teacherClasses && teacherClasses.length > 0 ? (
                                teacherClasses.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))
                            ) : (
                                <div className="p-2 text-sm text-muted-foreground text-center">No classes found</div>
                            )}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleSaveAndAssign} variant="default" disabled={!generatedContent || !selectedClassId || isAssigning}>
                        {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save & Assign'}
                    </Button>
                </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
