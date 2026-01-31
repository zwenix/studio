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
import { Loader2, Sparkles, FlaskConical, FileCheck2 } from 'lucide-react';
import Image from 'next/image';
import { educationalData } from '@/lib/educational-data';
import { generateMockAssessment, GenerateMockAssessmentOutput } from '@/ai/flows/generate-mock-assessment';
import { autograde, AutogradeOutput } from '@/ai/flows/autograder-flow';
import type { GenerateMockAssessmentInput } from '@/ai/flows/generate-mock-assessment';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

type AssessmentState = 'generate' | 'practice' | 'result';

export default function MockAssessmentPage() {
  const { toast } = useToast();

  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  
  const [generatedAssessment, setGeneratedAssessment] = useState<GenerateMockAssessmentOutput | null>(null);
  const [studentSubmission, setStudentSubmission] = useState('');
  const [gradingResult, setGradingResult] = useState<AutogradeOutput | null>(null);

  const [pageState, setPageState] = useState<AssessmentState>('generate');

  const subjects = grade ? educationalData[grade as keyof typeof educationalData]?.subjects : [];
  const topics = grade && subject ? educationalData[grade as keyof typeof educationalData]?.topics[subject] : [];

  const handleGenerate = async () => {
    if (!grade || !subject || !topic) {
      toast({
        title: "Missing Information",
        description: "Please select a grade, subject, and topic.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    setGeneratedAssessment(null);
    setGradingResult(null);
    setStudentSubmission('');

    try {
      const input: GenerateMockAssessmentInput = {
        grade: grade as any,
        subject,
        topic,
        difficulty: difficulty || undefined,
      };
      const result = await generateMockAssessment(input);
      setGeneratedAssessment(result);
      setPageState('practice');
    } catch (error) {
        console.error("Failed to generate assessment:", error);
        toast({
            title: "Generation Failed",
            description: "Could not generate a practice assessment. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleGrade = async () => {
    if (!studentSubmission || !generatedAssessment?.rubric) {
      toast({
        title: "Missing Information",
        description: "Please enter your answer before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGrading(true);
    setGradingResult(null);

    try {
      const result = await autograde({
        assignmentContent: studentSubmission,
        gradingInstructions: generatedAssessment.rubric,
        subject,
        grade,
      });
      setGradingResult(result);
      setPageState('result');
    } catch (error) {
        console.error("Failed to autograde:", error);
        toast({
            title: "Grading Failed",
            description: "Could not grade your assessment. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsGrading(false);
    }
  };

  const handleTryAnother = () => {
    setPageState('generate');
    setGeneratedAssessment(null);
    setGradingResult(null);
    setStudentSubmission('');
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
            <FlaskConical className="mr-3 h-8 w-8" />
            Practice Assessment
        </h1>
        
        <div className="grid gap-8 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Create Your Practice Test</CardTitle>
                    <CardDescription>
                    Select your grade, subject, and topic to generate a mock assessment.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="grade">Grade</Label>
                        <Select value={grade} onValueChange={setGrade} disabled={isGenerating}>
                        <SelectTrigger id="grade"><SelectValue placeholder="Select a grade" /></SelectTrigger>
                        <SelectContent>
                            {Object.keys(educationalData).map((g) => (
                            <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="difficulty">Difficulty (Optional)</Label>
                        <Select value={difficulty} onValueChange={setDifficulty} disabled={isGenerating}>
                            <SelectTrigger id="difficulty"><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    </div>

                    <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select value={subject} onValueChange={setSubject} disabled={!grade || isGenerating}>
                        <SelectTrigger id="subject"><SelectValue placeholder="Select a subject" /></SelectTrigger>
                        <SelectContent>
                        {subjects?.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </div>

                    <div className="space-y-2">
                    <Label htmlFor="topic">Topic</Label>
                    <Select value={topic} onValueChange={setTopic} disabled={!subject || isGenerating}>
                        <SelectTrigger id="topic"><SelectValue placeholder="Select a topic" /></SelectTrigger>
                        <SelectContent>
                        {topics?.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Generate Practice Test
                    </Button>
                </CardFooter>
            </Card>

            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>Your Assessment</CardTitle>
                    <CardDescription>
                       {pageState === 'generate' && "Your practice test will appear here."}
                       {pageState === 'practice' && "Complete the test below and submit for grading."}
                       {pageState === 'result' && "Here is your automated feedback."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto bg-muted/50 rounded-lg p-4 prose dark:prose-invert max-w-none">
                    {isGenerating && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Loader2 className="h-12 w-12 animate-spin" />
                            <p className="mt-4">Generating your test...</p>
                        </div>
                    )}
                    
                    {!isGenerating && pageState === 'generate' && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <FlaskConical className="h-12 w-12" />
                            <p className="mt-4 text-center">Generate a test to get started.</p>
                        </div>
                    )}
                    
                    {!isGenerating && pageState === 'practice' && generatedAssessment && (
                        <div>
                            <ReactMarkdown>{generatedAssessment.content}</ReactMarkdown>
                        </div>
                    )}

                    {!isGenerating && pageState === 'result' && gradingResult && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold">Your Grade</h3>
                                <pre className="whitespace-pre-wrap font-sans text-lg">{gradingResult.grade}</pre>
                            </div>
                             <div>
                                <h3 className="font-bold">Feedback & Remarks</h3>
                                <ReactMarkdown>{gradingResult.feedback}</ReactMarkdown>
                            </div>
                            <div>
                                <h3 className="font-bold">Your Answer</h3>
                                <pre className="whitespace-pre-wrap font-sans text-sm p-2 bg-white rounded-md text-gray-800">{studentSubmission}</pre>
                            </div>
                        </div>
                    )}

                </CardContent>
                
                {pageState === 'practice' && (
                    <CardFooter className="flex-col items-stretch gap-4 pt-4 border-t">
                        <Textarea 
                            placeholder="Type your answer here..." 
                            rows={6}
                            value={studentSubmission}
                            onChange={(e) => setStudentSubmission(e.target.value)}
                            disabled={isGrading}
                        />
                        <Button onClick={handleGrade} disabled={isGrading} className="w-full">
                            {isGrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}
                            Submit & Grade
                        </Button>
                    </CardFooter>
                )}

                {pageState === 'result' && (
                    <CardFooter className="pt-4 border-t">
                         <Button onClick={handleTryAnother} variant="outline" className="w-full">
                            Create Another Practice Test
                        </Button>
                    </CardFooter>
                )}

            </Card>
        </div>
      </div>
    </AppLayout>
  );
}
