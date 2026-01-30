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
import { Bot, Loader2, Sparkles } from 'lucide-react';
import { educationalData } from '@/lib/educational-data';
import { generateCAPSContent, GenerateCAPSContentInput } from '@/ai/flows/generate-caps-content';
import { useToast } from '@/hooks/use-toast';

type ContentType = "lesson plan" | "exercise" | "assessment" | "class planner" | "educational poster";

export default function ContentGeneratorPage() {
  const { toast } = useToast();
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState<ContentType | ''>('');
  const [manualSubject, setManualSubject] = useState('');
  const [manualTopic, setManualTopic] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');

  const subjects = grade ? educationalData[grade as keyof typeof educationalData]?.subjects : [];
  const topics = grade && subject ? educationalData[grade as keyof typeof educationalData]?.topics[subject] : [];

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
    setGeneratedContent('');

    try {
      const input: GenerateCAPSContentInput = {
        grade: grade as any,
        subject: finalSubject,
        topic: finalTopic,
        contentType: contentType,
        additionalInstructions,
      };
      const result = await generateCAPSContent(input);
      setGeneratedContent(result.content);
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

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
            <Bot className="mr-3 h-8 w-8" />
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
                The AI-generated content will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto bg-muted/50 rounded-lg p-4 prose prose-sm max-w-none">
              {isLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Bot className="h-12 w-12 animate-pulse" />
                      <p className="mt-4">Generating content, please wait...</p>
                  </div>
              )}
              {generatedContent ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm">{generatedContent}</pre>
              ) : !isLoading && (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Sparkles className="h-12 w-12" />
                    <p className="mt-4 text-center">Your generated content will be displayed here.</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-4">
              <Button variant="outline" className="w-full" disabled={!generatedContent}>Assign to Students</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
