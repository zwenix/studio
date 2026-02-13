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
import { Loader2, Sparkles, Download, Save, Printer } from 'lucide-react';
import Image from 'next/image';
import { educationalData } from '@/lib/educational-data';
import { generateCAPSContent, GenerateCAPSContentOutput } from '@/ai/flows/generate-caps-content';
import type { GenerateCAPSContentInput as CAPSInput } from '@/ai/flows/generate-caps-content';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, addDoc, writeBatch, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { add } from 'date-fns';
import type { Class, Teacher } from '@/lib/types';


type ContentType = "lesson plan" | "exercise" | "assessment" | "class planner" | "educational poster";
export type GenerateCAPSContentInput = CAPSInput;

const fonts = [
    { value: 'font-patrick-hand', label: "Teacher's Pet" },
    { value: 'font-comic-neue', label: 'Comic Neue' },
    { value: 'font-schoolbell', label: 'Schoolbell' },
    { value: 'font-sans', label: 'Default Sans-Serif' },
];

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

  // New state for enhanced assessment options
  const [difficulty, setDifficulty] = useState('');
  const [length, setLength] = useState('');
  const [assessmentFormat, setAssessmentFormat] = useState('');
  
  const [generatedContent, setGeneratedContent] = useState<GenerateCAPSContentOutput | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');

  // New state for customization
  const [fontFamily, setFontFamily] = useState('');
  const [customHeading, setCustomHeading] = useState('');
  const [customSubject, setCustomSubject] = useState('');


  const subjects = grade ? educationalData[grade as keyof typeof educationalData]?.subjects : [];
  const topics = grade && subject ? educationalData[grade as keyof typeof educationalData]?.topics[subject] : [];
  
  const foundationPhaseGrades = ['R', '1', '2', '3'];
  const isFoundationPhase = foundationPhaseGrades.includes(grade);
  
  const teacherRef = useMemoFirebase(() => user ? doc(firestore, 'teachers', user.uid) : null, [firestore, user]);
  const { data: teacherData } = useDoc<Teacher>(teacherRef);
  
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

    let finalFont = fontFamily;
    if (isFoundationPhase && !finalFont) {
        finalFont = 'font-patrick-hand';
    }

    try {
      const input: GenerateCAPSContentInput = {
        grade: grade as any,
        subject: finalSubject,
        topic: finalTopic,
        contentType: contentType,
        additionalInstructions,
        difficulty: difficulty || undefined,
        length: length || undefined,
        assessmentFormat: assessmentFormat as any || undefined,
        fontFamily: finalFont,
        customHeading,
        customSubject,
        teacherName: user?.displayName || 'Educator',
      };
      const result = await generateCAPSContent(input);
      setGeneratedContent(result);

      if (result && user) {
        try {
          const generatedContentCollection = collection(firestore, 'teachers', user.uid, 'generatedContent');
          await addDoc(generatedContentCollection, {
            ...result,
            teacherId: user.uid,
            grade,
            subject: finalSubject,
            topic: finalTopic,
            contentType,
            createdAt: serverTimestamp(),
          });
          toast({ title: 'Content saved to your history for future reference.' });
        } catch (e) {
          console.error('Failed to save content history:', e);
          toast({ title: 'Could not save content to history', variant: 'destructive'});
        }
      }

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
                // Ensure rubric is saved for autograding
                rubric: generatedContent.rubric || '' 
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
    let yPosition = margin;

    const addTextToPdf = (title: string, text: string) => {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        yPosition = margin; // Reset for new page
        doc.text(title, margin, yPosition);
        yPosition += 10;

        doc.setFontSize(12);
        doc.setFont('times', 'normal');
        
        const lines = doc.splitTextToSize(text, maxWidth);
        
        lines.forEach((line: string) => {
            if (yPosition > 280) { // Check if new page is needed
                doc.addPage();
                yPosition = margin;
            }
            doc.text(line, margin, yPosition);
            yPosition += 7; // Line height
        });
    };

    const convertHtmlToText = (html: string) => {
      let text = html;
      text = text.replace(/<br\s*\/?>/gi, '\n');
      text = text.replace(/<hr\s*\/?>/gi, '\n------------------------------------\n');
      text = text.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n\n');
      text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n');
      text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '  - $1\n');
      text = text.replace(/<[^>]+>/g, ''); // Strip remaining tags
      return text;
    }

    // --- Content Page ---
    addTextToPdf(`${finalTopic} (${contentType})`, convertHtmlToText(generatedContent.content));

    // --- Memo Page ---
    if (generatedContent.memo) {
      doc.addPage();
      addTextToPdf('Memo', convertHtmlToText(generatedContent.memo));
    }

    // --- Rubric Page ---
    if (generatedContent.rubric) {
      doc.addPage();
      addTextToPdf('Rubric', convertHtmlToText(generatedContent.rubric));
    }

    doc.save(`EduAI - ${finalTopic}.pdf`);
  };

  const handlePrint = () => {
    if (!generatedContent) return;
    const finalTopic = topic === 'manual' ? manualTopic : topic;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print - ${finalTopic}</title>
            <style>
              body { font-family: sans-serif; line-height: 1.5; padding: 2rem; }
              img { max-width: 100%; height: auto; border-radius: 0.5rem; display: block; margin: 1rem 0; }
              hr { border: 0; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
              h1, h2, h3, h4 { font-weight: 600; margin-top: 2rem; margin-bottom: 1rem; }
              h1 { font-size: 2em; }
              h2 { font-size: 1.5em; }
              h3 { font-size: 1.25em; }
              ol, ul { padding-left: 1.5rem; }
              em { font-style: italic; color: #555; font-size: 9px; }
              .font-patrick-hand { font-family: 'Patrick Hand', cursive; }
              .font-comic-neue { font-family: 'Comic Neue', cursive; }
              .font-schoolbell { font-family: 'Schoolbell', cursive; }
              .font-sans { font-family: sans-serif; }
            </style>
          </head>
          <body>
            ${generatedContent.content}
            ${generatedContent.memo ? `
              <hr style="margin-top: 3rem;" />
              <h2>Memo</h2>
              <div class="${isFoundationPhase ? (fontFamily || 'font-patrick-hand') : 'font-sans'}">
                ${generatedContent.memo}
              </div>
            ` : ''}
            ${generatedContent.rubric ? `
              <hr style="margin-top: 3rem;" />
              <h2>Rubric</h2>
              <div class="${isFoundationPhase ? (fontFamily || 'font-patrick-hand') : 'font-sans'}">
                ${generatedContent.rubric}
              </div>
            ` : ''}
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
              <div className="space-y-2">
                  <Label htmlFor="custom-heading">Custom Heading (Optional)</Label>
                  <Input id="custom-heading" placeholder="e.g., Mid-Term Assessment" value={customHeading} onChange={(e) => setCustomHeading(e.target.value)} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="custom-subject">Custom Subject/Sub-heading (Optional)</Label>
                  <Input id="custom-subject" placeholder="e.g., Term 2 - Algebraic Expressions" value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} />
              </div>

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

              {isFoundationPhase && (
                <div className="space-y-2">
                  <Label htmlFor="font-family">Font Style</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger id="font-family"><SelectValue placeholder="Default (Teacher's Pet)" /></SelectTrigger>
                    <SelectContent>
                      {fonts.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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

              {(contentType === 'exercise' || contentType === 'assessment') && (
                <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium text-sm">Assessment Options</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="difficulty">Difficulty</Label>
                            <Select value={difficulty} onValueChange={setDifficulty}>
                                <SelectTrigger id="difficulty"><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="assessmentFormat">Format</Label>
                            <Select value={assessmentFormat} onValueChange={setAssessmentFormat}>
                                <SelectTrigger id="assessmentFormat"><SelectValue placeholder="Select format" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="multiple choice">Multiple Choice</SelectItem>
                                    <SelectItem value="short answer">Short Answer</SelectItem>
                                    <SelectItem value="essay">Essay Questions</SelectItem>
                                    <SelectItem value="fill in the blanks">Fill in the Blanks</SelectItem>
                                    <SelectItem value="true or false">True / False</SelectItem>
                                    <SelectItem value="worksheet">Worksheet</SelectItem>
                                    <SelectItem value="mixed">Mixed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="length">Number of Questions (10-100)</Label>
                        <Input
                            id="length"
                            type="number"
                            placeholder="10-100"
                            value={length}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (e.target.value === '' || (val >= 10 && val <= 100)) {
                                    setLength(e.target.value);
                                }
                            }}
                            min="10"
                            max="100"
                        />
                    </div>
                </div>
              )}

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
                Generate & Save
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
            <CardContent className="flex-1 overflow-auto bg-muted/50 rounded-lg p-4">
              {isLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="Generating content" width={48} height={48} className="animate-pulse" />
                      <p className="mt-4">Generating content, please wait...</p>
                  </div>
              )}
              {generatedContent ? (
                  <>
                    <Tabs defaultValue="content" className="w-full">
                      <TabsList>
                        <TabsTrigger value="content">Content</TabsTrigger>
                        {generatedContent.memo && <TabsTrigger value="memo">Memo</TabsTrigger>}
                        {generatedContent.rubric && <TabsTrigger value="rubric">Rubric</TabsTrigger>}
                      </TabsList>
                      <TabsContent value="content" className="mt-4">
                          <div className={`prose dark:prose-invert max-w-none bg-card text-card-foreground p-4 rounded-md ${isFoundationPhase ? (fontFamily || 'font-patrick-hand') : 'font-sans'}`}>
                             <div dangerouslySetInnerHTML={{ __html: generatedContent.content }} />
                          </div>
                      </TabsContent>
                      {generatedContent.memo && <TabsContent value="memo" className="mt-4">
                          <div className={`prose dark:prose-invert max-w-none bg-card text-card-foreground p-4 rounded-md ${isFoundationPhase ? (fontFamily || 'font-patrick-hand') : 'font-sans'}`}>
                             <div dangerouslySetInnerHTML={{ __html: generatedContent.memo }} />
                          </div>
                      </TabsContent>}
                       {generatedContent.rubric && <TabsContent value="rubric" className="mt-4">
                           <div className={`prose dark:prose-invert max-w-none bg-card text-card-foreground p-4 rounded-md ${isFoundationPhase ? (fontFamily || 'font-patrick-hand') : 'font-sans'}`}>
                              <div dangerouslySetInnerHTML={{ __html: generatedContent.rubric }} />
                           </div>
                      </TabsContent>}
                    </Tabs>
                    {teacherData?.signatureUrl && (
                        <div className="mt-6 p-4 border-t">
                            <h4 className="text-sm font-semibold text-muted-foreground mb-2">Signature/Stamp</h4>
                            <img src={teacherData.signatureUrl} alt="Teacher's Signature" className="max-h-24 border rounded bg-white p-2" />
                        </div>
                    )}
                  </>
              ) : !isLoading && (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Sparkles className="h-12 w-12" />
                    <p className="mt-4 text-center">Your generated content will be displayed here.</p>
                </div>
              )}
            </CardContent>
             <CardFooter className="flex flex-col items-stretch gap-4 pt-4 border-t sm:flex-row sm:items-center">
                <div className="flex gap-2">
                    <Button onClick={handleExportPdf} variant="outline" disabled={!generatedContent || isLoading}>
                        <Download className="mr-2 h-4 w-4" />
                        Export PDF
                    </Button>
                     <Button onClick={handlePrint} variant="outline" disabled={!generatedContent || isLoading}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                </div>
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
