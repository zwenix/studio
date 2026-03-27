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
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';
import {
  ALL_GRADES,
  Grade,
  educationalData,
  lessonTypes,
} from '@/lib/educational-data';

const PHASE_GROUPS = {
  'Foundation Phase': ['1', '2', '3'],
  'Intermediate Phase': ['4', '5', '6'],
  'Senior Phase': ['7', '8', '9'],
  'FET Phase': ['10', '11', '12'],
};

export default function LessonStudioPage() {
  const [grade, setGrade] = useState<string>('');
  const [customGrade, setCustomGrade] = useState<string>('');
  
  const [subject, setSubject] = useState<string>('');
  const [customSubject, setCustomSubject] = useState<string>('');
  
  const [topic, setTopic] = useState<string>('');
  const [customTopic, setCustomTopic] = useState<string>('');
  
  const [lessonType, setLessonType] = useState<string>('');
  const [customLessonType, setCustomLessonType] = useState<string>('');

  const [lessonPlan, setLessonPlan] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const subjects = useMemo(() => {
    if (grade && grade !== 'Other') {
      return Object.keys(educationalData[grade as Grade] || {});
    }
    return [];
  }, [grade]);

  const topics = useMemo(() => {
    if (grade && subject && grade !== 'Other' && subject !== 'Other') {
      return educationalData[grade as Grade]?.[subject] || [];
    }
    return [];
  }, [grade, subject]);

  const handleGenerate = async () => {
    const finalGrade = grade === 'Other' ? customGrade : grade;
    const finalSubject = subject === 'Other' ? customSubject : subject;
    const finalTopic = topic === 'Other' ? customTopic : topic;
    const finalLessonType = lessonType === 'Other' ? customLessonType : lessonType;

    if (!finalGrade || !finalSubject || !finalTopic || !finalLessonType) {
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
        body: JSON.stringify({
          grade: finalGrade,
          subject: finalSubject,
          topic: finalTopic,
          lessonType: finalLessonType
        }),
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
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GRADE SELECTION */}
              <div className="space-y-3">
                <Select value={grade} onValueChange={(val) => { setGrade(val); setSubject(''); setTopic(''); }}>
                  <SelectTrigger className="h-14 rounded-full text-lg bg-secondary/20 border-none">
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PHASE_GROUPS).map(([phase, grades]) => (
                      <SelectGroup key={phase}>
                        <SelectLabel className="font-bold text-primary">{phase}</SelectLabel>
                        {grades.map((g) => (
                          <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                    <SelectItem value="Other">Other...</SelectItem>
                  </SelectContent>
                </Select>
                {grade === 'Other' && (
                  <Input 
                    placeholder="Enter custom grade..." 
                    value={customGrade} 
                    onChange={e => setCustomGrade(e.target.value)} 
                    className="h-14 rounded-full text-lg" 
                  />
                )}
              </div>

              {/* SUBJECT SELECTION */}
              <div className="space-y-3">
                <Select value={subject} onValueChange={(val) => { setSubject(val); setTopic(''); }} disabled={!grade}>
                  <SelectTrigger className="h-14 rounded-full text-lg bg-secondary/20 border-none">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                    <SelectItem value="Other">Other...</SelectItem>
                  </SelectContent>
                </Select>
                {subject === 'Other' && (
                  <Input 
                    placeholder="Enter custom subject..." 
                    value={customSubject} 
                    onChange={e => setCustomSubject(e.target.value)} 
                    className="h-14 rounded-full text-lg" 
                  />
                )}
              </div>

              {/* TOPIC SELECTION */}
              <div className="space-y-3">
                <Select value={topic} onValueChange={setTopic} disabled={!subject}>
                  <SelectTrigger className="h-14 rounded-full text-lg bg-secondary/20 border-none">
                    <SelectValue placeholder="Select Topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                    <SelectItem value="Other">Other...</SelectItem>
                  </SelectContent>
                </Select>
                {topic === 'Other' && (
                  <Input 
                    placeholder="Enter custom topic..." 
                    value={customTopic} 
                    onChange={e => setCustomTopic(e.target.value)} 
                    className="h-14 rounded-full text-lg" 
                  />
                )}
              </div>

              {/* LESSON TYPE SELECTION */}
              <div className="space-y-3">
                <Select value={lessonType} onValueChange={setLessonType}>
                  <SelectTrigger className="h-14 rounded-full text-lg bg-secondary/20 border-none">
                    <SelectValue placeholder="Lesson Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {lessonTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                    <SelectItem value="Other">Other...</SelectItem>
                  </SelectContent>
                </Select>
                {lessonType === 'Other' && (
                  <Input 
                    placeholder="Enter custom lesson type..." 
                    value={customLessonType} 
                    onChange={e => setCustomLessonType(e.target.value)} 
                    className="h-14 rounded-full text-lg" 
                  />
                )}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={
                isGenerating || 
                !grade || (grade === 'Other' && !customGrade) || 
                !subject || (subject === 'Other' && !customSubject) || 
                !topic || (topic === 'Other' && !customTopic) || 
                !lessonType || (lessonType === 'Other' && !customLessonType)
              }
              className="w-full h-14 px-8 rounded-full font-bold text-lg"
            >
              {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Generate Lesson Plan'}
            </Button>
          </CardContent>
        </Card>

        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium text-muted-foreground">Crafting your lesson...</p>
          </div>
        )}

        {lessonPlan && !isGenerating && (
          <Card className="rounded-[2.5rem] shadow-lg border-none mt-8">
            <CardHeader className="bg-primary/5 rounded-t-[2.5rem]">
              <CardTitle className="text-2xl font-patrick-hand flex items-center">
                <BookOpen className="mr-2 h-6 w-6" /> {lessonPlan.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 prose dark:prose-invert max-w-none font-body">
              <p className="lead">{lessonPlan.description}</p>
              {lessonPlan.sections?.map((section: any, index: number) => (
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
