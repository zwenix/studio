'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { autograde } from '@/ai/flows/autograder-flow';
import { Loader2, Sparkles, FileCheck2, ArrowLeft } from 'lucide-react';
import type { Assignment, Content } from '@/lib/types';

export default function AssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  const classId = params.classId as string;
  const assignmentId = params.assignmentId as string;
  
  const [isLoading, setIsLoading] = useState(false);
  
  // State for multiple answers
  const [answers, setAnswers] = useState<string[]>([]);
  
  const assignmentRef = useMemoFirebase(() => {
    if (!classId || !assignmentId) return null;
    return doc(firestore, 'classes', classId, 'assignments', assignmentId);
  }, [firestore, classId, assignmentId]);
  const { data: assignment, isLoading: isAssignmentLoading } = useDoc<Assignment>(assignmentRef);

  const contentRef = useMemoFirebase(() => {
    if (!assignment?.contentId) return null;
    return doc(firestore, 'content', assignment.contentId);
  }, [firestore, assignment?.contentId]);
  const { data: content, isLoading: isContentLoaded } = useDoc<Content>(contentRef);

  // Memoize question parsing and count
  const questionCount = useMemo(() => {
    if (!content?.content) return 0;
    // Match "<h2>Question X", "<h3>Question X" etc.
    const count = (content.content.match(/<h[2-6]>\s*Question \d+/gi) || []).length;
    if (count > 0 && answers.length !== count) {
        setAnswers(Array(count).fill(''));
    }
    return count;
  }, [content?.content, answers.length]);

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    const submissionContent = answers
        .map((ans, i) => `<h3>Answer for Question ${i + 1}:</h3><p>${ans || '(No answer provided)'}</p>`)
        .join('<hr>');

    if (answers.every(ans => ans.trim() === '')) {
      toast({ title: "Submission is empty", description: "Please answer at least one question.", variant: 'destructive' });
      return;
    }
    if (!assignmentRef || !content?.rubric) {
      toast({ title: 'Error', description: 'Cannot submit assignment right now.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);

    try {
      // 1. Autograde the submission
      const gradingResult = await autograde({
        assignmentContent: submissionContent,
        gradingInstructions: content.rubric,
        subject: content.subject,
        grade: content.grade,
      });

      // 2. Update the assignment document in Firestore
      await updateDoc(assignmentRef, {
        submissionContent: submissionContent,
        gradeReceived: gradingResult.grade,
        feedback: gradingResult.feedback,
        status: 'graded',
        submittedAt: serverTimestamp(),
      });

      toast({ title: 'Assignment Submitted & Graded!', description: 'Your results are now available.' });
      
    } catch (error: any) {
      console.error('Failed to submit or grade assignment:', error);
      toast({ title: 'Submission Failed', description: error.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const pageLoading = isAssignmentLoading || isContentLoaded;

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assignments
        </Button>

        {pageLoading && (
            <div className="flex justify-center items-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )}

        {!pageLoading && content && assignment && (
          <div className="grid gap-8 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>{content.topic}</CardTitle>
                <CardDescription>
                  Due by: {assignment.dueDate.toDate().toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none p-6">
                 <div dangerouslySetInnerHTML={{ __html: content.content }} />
              </CardContent>
            </Card>

            {assignment.status === 'assigned' && (
                <Card>
                    <CardHeader>
                        <CardTitle>My Submission</CardTitle>
                        <CardDescription>
                            {questionCount > 0 
                                ? "Enter your response for each question in the fields below."
                                : "Enter your response below and submit for grading."
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {questionCount > 0 ? (
                           [...Array(questionCount)].map((_, index) => (
                                <div key={index} className="space-y-2">
                                    <Label htmlFor={`submission-q-${index + 1}`}>Answer for Question {index + 1}</Label>
                                    <Textarea 
                                        id={`submission-q-${index + 1}`}
                                        value={answers[index] || ''}
                                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                                        rows={4}
                                        placeholder={`Type your answer for question ${index + 1} here...`}
                                        disabled={isLoading}
                                    />
                                </div>
                            ))
                        ) : (
                             <div className="space-y-2">
                                <Label htmlFor="submission-content">Your Answer</Label>
                                <Textarea 
                                    id="submission-content" 
                                    value={answers[0] || ''}
                                    onChange={(e) => handleAnswerChange(0, e.target.value)}
                                    rows={12}
                                    placeholder="Type your answer here..."
                                    disabled={isLoading}
                                />
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                         <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Submit & Autograde
                         </Button>
                    </CardFooter>
                </Card>
            )}
            
            {assignment.status === 'graded' && (
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center"><FileCheck2 className="mr-2 text-green-500" />Grading Result</CardTitle>
                        <CardDescription>Here is the automated feedback for your submission.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto bg-muted/50 rounded-lg p-4 prose prose-sm max-w-none">
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold">Your Submission</h3>
                                <div className="whitespace-pre-wrap font-sans text-sm p-4 bg-white rounded-md border text-black prose">
                                    <div dangerouslySetInnerHTML={{ __html: assignment.submissionContent || '' }} />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold">Grade/Score</h3>
                                <pre className="whitespace-pre-wrap font-sans text-lg">{assignment.gradeReceived}</pre>
                            </div>
                            <div>
                                <h3 className="font-bold">Feedback</h3>
                                <div className="whitespace-pre-wrap font-sans text-sm prose">
                                  <div dangerouslySetInnerHTML={{ __html: assignment.feedback || '' }} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

          </div>
        )}
      </div>
    </AppLayout>
  );
}
