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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, FlaskConical, FileCheck2, Printer } from 'lucide-react';
import { educationalData } from '@/lib/educational-data';
import { generateMockAssessment, GenerateMockAssessmentOutput } from '@/ai/flows/generate-mock-assessment';
import { autograde, AutogradeOutput } from '@/ai/flows/autograder-flow';
import type { GenerateMockAssessmentInput } from '@/ai/flows/generate-mock-assessment';
import { useToast } from '@/hooks/use-toast';

type AssessmentState = 'generate' | 'practice' | 'result';

export default function MockAssessmentPage() {
  const { toast } = useToast();

  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [assessmentFormat, setAssessmentFormat] = useState('');
  const [length, setLength] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  
  const [generatedAssessment, setGeneratedAssessment] = useState<GenerateMockAssessmentOutput | null>(null);
  const [gradingResult, setGradingResult] = useState<AutogradeOutput | null>(null);
  const [pageState, setPageState] = useState<AssessmentState>('generate');
  
  const [answers, setAnswers] = useState<string[]>([]);
  const [rawSubmission, setRawSubmission] = useState(''); // To store final formatted submission

  const subjects = grade ? educationalData[grade as keyof typeof educationalData]?.subjects : [];
  const topics = grade && subject ? educationalData[grade as keyof typeof educationalData]?.topics[subject] : [];

  const questionCount = useMemo(() => {
    if (!generatedAssessment?.content) return 0;
    const count = (generatedAssessment.content.match(/<h[2-6]>\s*Question \d+/gi) || []).length;
    if (count > 0 && answers.length !== count) {
      setAnswers(Array(count).fill(''));
    }
    return count;
  }, [generatedAssessment?.content, answers.length]);

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

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
    setAnswers([]);
    setRawSubmission('');

    try {
      const input: GenerateMockAssessmentInput = {
        grade: grade as any,
        subject,
        topic,
        difficulty: difficulty || undefined,
        assessmentFormat: assessmentFormat as any || undefined,
        length: length || undefined,
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
    const submissionContent = answers
        .map((ans, i) => `<h3>Answer for Question ${i + 1}:</h3><p>${ans || '(No answer provided)'}</p>`)
        .join('<hr>');

    if (answers.every(ans => ans.trim() === '') || !generatedAssessment?.rubric) {
      toast({
        title: "Missing Information",
        description: "Please enter your answer before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGrading(true);
    setGradingResult(null);
    setRawSubmission(submissionContent);

    try {
      const result = await autograde({
        assignmentContent: submissionContent,
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
    setAnswers([]);
    setRawSubmission('');
  };

  const handlePrint = () => {
    if (!generatedAssessment || !gradingResult || !rawSubmission) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print - Practice Assessment Result</title>
            <style>
              body { font-family: sans-serif; line-height: 1.5; padding: 2rem; }
              img { max-width: 100%; height: auto; border-radius: 0.5rem; display: block; margin: 1rem 0; }
              hr { border: 0; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
              h1, h2, h3, h4 { font-weight: 600; margin-top: 2rem; margin-bottom: 1rem; }
              h1 { font-size: 2em; }
              h2 { font-size: 1.5em; }
              pre { white-space: pre-wrap; font-family: sans-serif; }
              .submission { background-color: #f9f9f9; border: 1px solid #ddd; padding: 1rem; border-radius: 0.5rem; }
            </style>
          </head>
          <body>
            <h1>Practice Assessment: ${topic}</h1>
            <h2>Grade ${grade} - ${subject}</h2>
            <hr />
            ${generatedAssessment.content}

            <hr style="margin-top: 3rem;" />
            <h2>Your Submission</h2>
            <div class="submission">${rawSubmission}</div>
            
            <hr style="margin-top: 3rem;" />
            <h2>Grading Result</h2>
            <h3>Grade/Score</h3>
            <pre>${gradingResult.grade}</pre>
            <h3>Feedback</h3>
            <div>${gradingResult.feedback}</div>
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
                            <Select value={grade} onValueChange={setGrade} disabled={isGenerating || isGrading}>
                                <SelectTrigger id="grade"><SelectValue placeholder="Select a grade" /></SelectTrigger>
                                <SelectContent>
                                    {Object.keys(educationalData).map((g) => (
                                    <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="subject">Subject</Label>
                            <Select value={subject} onValueChange={setSubject} disabled={!grade || isGenerating || isGrading}>
                                <SelectTrigger id="subject"><SelectValue placeholder="Select a subject" /></SelectTrigger>
                                <SelectContent>
                                {subjects?.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="topic">Topic</Label>
                        <Select value={topic} onValueChange={setTopic} disabled={!subject || isGenerating || isGrading}>
                            <SelectTrigger id="topic"><SelectValue placeholder="Select a topic" /></SelectTrigger>
                            <SelectContent>
                            {topics?.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="difficulty">Difficulty (Optional)</Label>
                            <Select value={difficulty} onValueChange={setDifficulty} disabled={isGenerating || isGrading}>
                                <SelectTrigger id="difficulty"><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="assessmentFormat">Format (Optional)</Label>
                            <Select value={assessmentFormat} onValueChange={setAssessmentFormat} disabled={isGenerating || isGrading}>
                                <SelectTrigger id="assessmentFormat"><SelectValue placeholder="Select format" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="multiple choice">Multiple Choice</SelectItem>
                                    <SelectItem value="short answer">Short Answer</SelectItem>
                                    <SelectItem value="essay">Essay</SelectItem>
                                    <SelectItem value="fill in the blanks">Fill in the Blanks</SelectItem>
                                    <SelectItem value="true or false">True / False</SelectItem>
                                    <SelectItem value="worksheet">Worksheet</SelectItem>
                                    <SelectItem value="mixed">Mixed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="length">Number of Questions</Label>
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
                              disabled={isGenerating || isGrading}
                          />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleGenerate} disabled={isGenerating || isGrading} className="w-full">
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
                        <div dangerouslySetInnerHTML={{ __html: generatedAssessment.content }} />
                    )}

                    {!isGenerating && pageState === 'result' && gradingResult && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold">Your Grade</h3>
                                <pre className="whitespace-pre-wrap font-sans text-lg">{gradingResult.grade}</pre>
                            </div>
                             <div>
                                <h3 className="font-bold">Feedback & Remarks</h3>
                                 <div dangerouslySetInnerHTML={{ __html: gradingResult.feedback }} />
                            </div>
                            <div>
                                <h3 className="font-bold">Your Answer</h3>
                                <div className="whitespace-pre-wrap font-sans text-sm p-4 bg-white rounded-md border text-black prose">
                                    <div dangerouslySetInnerHTML={{ __html: rawSubmission }} />
                                </div>
                            </div>
                        </div>
                    )}

                </CardContent>
                
                {pageState === 'practice' && (
                    <CardFooter className="flex-col items-stretch gap-4 pt-4 border-t">
                        {questionCount > 0 ? (
                            [...Array(questionCount)].map((_, index) => (
                                <div key={index} className="space-y-2 w-full">
                                    <Label htmlFor={`submission-q-${index + 1}`}>Answer for Question {index + 1}</Label>
                                    <Textarea 
                                        id={`submission-q-${index + 1}`}
                                        value={answers[index] || ''}
                                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                                        rows={3}
                                        placeholder={`Type your answer for question ${index + 1}...`}
                                        disabled={isGrading}
                                    />
                                </div>
                            ))
                        ) : (
                             <Textarea 
                                placeholder="Type your answer here..." 
                                rows={6}
                                value={answers[0] || ''}
                                onChange={(e) => handleAnswerChange(0, e.target.value)}
                                disabled={isGrading}
                            />
                        )}
                        <Button onClick={handleGrade} disabled={isGrading || isGenerating} className="w-full">
                            {isGrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}
                            Submit & Grade
                        </Button>
                    </CardFooter>
                )}

                {pageState === 'result' && (
                    <CardFooter className="flex-col sm:flex-row items-stretch gap-2 pt-4 border-t">
                         <Button onClick={handleTryAnother} variant="outline" className="w-full">
                            Create Another Practice Test
                        </Button>
                        <Button onClick={handlePrint} variant="outline" className="w-full">
                            <Printer className="mr-2 h-4 w-4" />
                            Print Result
                        </Button>
                    </CardFooter>
                )}

            </Card>
        </div>
      </div>
    </AppLayout>
  );
}
