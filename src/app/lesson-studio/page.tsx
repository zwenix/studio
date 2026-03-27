
'use client';

import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';
import {
  capsTopics,
  lessonTypes,
  subjectsByGrade,
  grades,
} from '@/lib/educational-data';

export default function LessonStudioPage() {
  const [grade, setGrade] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [lessonType, setLessonType] = useState<string>('');
  const [lessonPlan, setLessonPlan] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const subjects = useMemo(() => {
    return grade ? subjectsByGrade[grade as keyof typeof subjectsByGrade] : [];
  }, [grade]);

  const topics = useMemo(() => {
    if (grade && subject) {
      return capsTopics[grade as keyof typeof capsTopics]?.[subject as keyof typeof capsTopics[keyof typeof capsTopics]] || [];
    }
    return [];
  }, [grade, subject]);

  const handleGenerate = async () => {
    if (!grade || !subject || !topic || !lessonType) {
      toast({
        title: 'Missing Information',
        description: 'Please complete all fields to generate a lesson plan.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setLessonPlan(null);

    try {
      const response = await fetch('/api/lesson-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade, subject, topic, lessonType }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate lesson plan');
      }
      const result = await response.json();
      setLessonPlan(result);
    } catch (error) {
      console.error('Generation Failed:', error);
      toast({
        title: 'Generation Failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
              <BookOpen className="mr-3 h-8 w-8 text-primary" />
              AI Lesson Studio
            </h1>
            <p className="text-muted-foreground mt-2">
              Generate a comprehensive, CAPS-aligned lesson plan.
            </p>
          </div>
        </div>

        <Card className="rounded-[2.5rem] shadow-xl border-none">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="h-14 rounded-full text-lg">
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={subject} onValueChange={setSubject} disabled={!grade}>
                <SelectTrigger className="h-14 rounded-full text-lg">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={topic} onValueChange={setTopic} disabled={!subject}>
                <SelectTrigger className="h-14 rounded-full text-lg">
                  <SelectValue placeholder="Select Topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={lessonType} onValueChange={setLessonType}>
                <SelectTrigger className="h-14 rounded-full text-lg">
                  <SelectValue placeholder="Lesson Type" />
                </SelectTrigger>
                <SelectContent>
                  {lessonTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !grade || !subject || !topic || !lessonType}
              className="w-full h-14 px-8 rounded-full font-bold text-lg"
            >
              {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Generate'}
            </Button>
          </CardContent>
        </Card>

        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium text-muted-foreground">Crafting your lesson...</p>
          </div>
        )}

        {lessonPlan && (
          <Card className="rounded-[2.5rem] shadow-lg border-none mt-8">
            <CardHeader className="bg-primary/5 rounded-t-[2.5rem]">
              <CardTitle className="text-2xl font-patrick-hand flex items-center">
                <BookOpen className="mr-2 h-6 w-6" /> {lessonPlan.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 prose dark:prose-invert max-w-none font-body">
              <p className="lead">{lessonPlan.description}</p>
              {lessonPlan.sections.map((section: any, index: number) => (
                <div key={index} className="mt-6">
                  <ReactMarkdown>{`## ${section.title}`}</ReactMarkdown>
                  <ReactMarkdown>{section.content}</ReactMarkdown>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
