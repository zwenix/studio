'use client';

import React, { useState, useCallback } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ClipboardCheck, Loader2, Sparkles, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { extractTextFromImage } from '@/ai/flows/extract-text-from-images';
import { autograde, AutogradeOutput } from '@/ai/flows/autograder-flow';

export default function AutogradingPage() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [assignmentContent, setAssignmentContent] = useState('');
  const [gradingInstructions, setGradingInstructions] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AutogradeOutput | null>(null);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const currentFile = acceptedFiles[0];
      setFile(currentFile);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUri = reader.result as string;
        setPreview(dataUri);
        // auto-extract text
        try {
          const extracted = await extractTextFromImage({ photoDataUri: dataUri });
          setAssignmentContent(extracted.extractedText);
          toast({ title: 'Text extracted successfully!' });
        } catch (error) {
           toast({ title: 'Text extraction failed', variant: 'destructive' });
        }
      };
      reader.readAsDataURL(currentFile);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'], 'text/plain': ['.txt'], 'application/pdf': ['.pdf'] },
    multiple: false,
  });


  const handleAutograde = async () => {
    if (!assignmentContent || !gradingInstructions) {
      toast({
        title: "Missing Information",
        description: "Please provide assignment content and grading instructions.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setResult(null);

    try {
      const gradingResult = await autograde({
        assignmentContent,
        gradingInstructions,
        subject,
        grade,
      });
      setResult(gradingResult);
    } catch (error) {
        console.error("Failed to autograde:", error);
        toast({
            title: "Autograding Failed",
            description: "Could not grade the assignment. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
          <ClipboardCheck className="mr-3 h-8 w-8" />
          AI Autograding
        </h1>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
              <CardDescription>
                Upload an assignment and provide grading instructions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileUp className="h-10 w-10" />
                    {isDragActive ? <p>Drop file here...</p> : <p>Drag & drop file, or click to select</p>}
                </div>
              </div>
              {preview && <img src={preview} alt="Preview" className="max-h-40 w-auto rounded-md border mt-2" />}

              <div className="space-y-2">
                <Label htmlFor="assignment-content">Assignment Content</Label>
                <Textarea id="assignment-content" placeholder="Text from the assignment will appear here after upload, or you can paste it directly." value={assignmentContent} onChange={(e) => setAssignmentContent(e.target.value)} rows={6} />
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="subject">Subject (Optional)</Label>
                    <Input id="subject" placeholder="e.g., Mathematics" value={subject} onChange={(e) => setSubject(e.target.value)} />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="grade">Grade (Optional)</Label>
                    <Input id="grade" placeholder="e.g., Grade 10" value={grade} onChange={(e) => setGrade(e.target.value)} />
                 </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Grading Instructions / Rubric</Label>
                <Textarea id="instructions" placeholder="e.g., 10 points for correct formula, 5 points for calculation..." value={gradingInstructions} onChange={(e) => setGradingInstructions(e.target.value)} rows={4}/>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAutograde} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Autograde
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Grading Result</CardTitle>
              <CardDescription>
                The AI-generated grade and feedback will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto bg-muted/50 rounded-lg p-4 prose prose-sm max-w-none">
              {isLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Loader2 className="h-12 w-12 animate-spin" />
                      <p className="mt-4">Grading in progress...</p>
                  </div>
              )}
              {result ? (
                  <div className="space-y-4">
                      <div>
                          <h3 className="font-bold">Grade/Score</h3>
                          <pre className="whitespace-pre-wrap font-sans text-sm">{result.grade}</pre>
                      </div>
                      <div>
                          <h3 className="font-bold">Feedback</h3>
                          <pre className="whitespace-pre-wrap font-sans text-sm">{result.feedback}</pre>
                      </div>
                      <div>
                          <h3 className="font-bold">Rubric Applied</h3>
                           <pre className="whitespace-pre-wrap font-sans text-sm">{result.rubric}</pre>
                      </div>
                  </div>
              ) : !isLoading && (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <ClipboardCheck className="h-12 w-12" />
                    <p className="mt-4 text-center">Your grading results will be displayed here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
