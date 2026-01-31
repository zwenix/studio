'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { autograde, AutogradeOutput } from '@/ai/flows/autograder-flow';
import { Loader2, Sparkles, FileCheck2, ArrowLeft } from 'lucide-react';
import type { Assignment, Content } from '@/lib/types';
import ReactMarkdown from 'react-markdown';

export default function AssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  const classId = params.classId as string;
  const assignmentId = params.assignmentId as string;

  const [submission, setSubmission] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubmit = async () => {
    if (!submission) {
      toast({ title: "Submission is empty", variant: 'destructive' });
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
        assignmentContent: submission,
        gradingInstructions: content.rubric,
        subject: content.subject,
        grade: content.grade,
      });

      // 2. Update the assignment document in Firestore
      await updateDoc(assignmentRef, {
        submissionContent: submission,
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
          <div className="grid gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{content.topic}</CardTitle>
                <CardDescription>
                  Due by: {assignment.dueDate.toDate().toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none p-6">
                 <ReactMarkdown>{content.content}</ReactMarkdown>
              </CardContent>
            </Card>

            {assignment.status === 'assigned' && (
                <Card>
                    <CardHeader>
                        <CardTitle>My Submission</CardTitle>
                        <CardDescription>Enter your response below and submit for grading.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="submission-content">Your Answer</Label>
                            <Textarea 
                                id="submission-content" 
                                value={submission}
                                onChange={(e) => setSubmission(e.target.value)}
                                rows={12}
                                placeholder="Type your answer here..."
                                disabled={isLoading}
                            />
                        </div>
                         <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Submit & Autograde
                         </Button>
                    </CardContent>
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
                                <pre className="whitespace-pre-wrap font-sans text-sm p-2 bg-white rounded-md">{assignment.submissionContent}</pre>
                            </div>
                            <div>
                                <h3 className="font-bold">Grade/Score</h3>
                                <pre className="whitespace-pre-wrap font-sans text-lg">{assignment.gradeReceived}</pre>
                            </div>
                            <div>
                                <h3 className="font-bold">Feedback</h3>
                                <pre className="whitespace-pre-wrap font-sans text-sm">{assignment.feedback}</pre>
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
