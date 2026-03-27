'use client';

import React, { useState, useMemo, useRef } from 'react';
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
import { Loader2, BookOpen, Save, Edit3, Printer, Square, Volume2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';
import {
  ALL_GRADES,
  Grade,
  educationalData,
  lessonTypes,
} from '@/lib/educational-data';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const PHASE_GROUPS = {
  'Foundation Phase': ['1', '2', '3'],
  'Intermediate Phase': ['4', '5', '6'],
  'Senior Phase': ['7', '8', '9'],
  'FET Phase': ['10', '11', '12'],
};

export default function LessonStudioPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const printableRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

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
    setIsEditMode(false);

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
      
      // Combine sections into a single markdown string for easy editing
      const combinedMarkdown = `## ${result.title}\n\n${result.description}\n\n` + 
        result.sections.map((s: any) => `### ${s.title}\n\n${s.content}`).join('\n\n');
      setEditedContent(combinedMarkdown);

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

  const handleSaveToArchive = async () => {
    if (!user || !lessonPlan) return;
    setIsSaving(true);
    
    const finalGrade = grade === 'Other' ? customGrade : grade;
    const finalSubject = subject === 'Other' ? customSubject : subject;
    const finalTopic = topic === 'Other' ? customTopic : topic;

    try {
      await addDoc(collection(firestore, 'teachers', user.uid, 'generatedContent'), {
        teacherId: user.uid,
        grade: finalGrade,
        subject: finalSubject,
        topic: finalTopic,
        contentType: 'Lesson Plan',
        content: editedContent,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Saved to Archive!' });
    } catch (e) {
      console.error("Save error:", e);
      toast({ title: 'Save Failed', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsAudioPlaying(false);
    }
  };

  const handleReadAloud = async () => {
    if (isAudioPlaying) {
      handleStopAudio();
      return;
    }

    if (!editedContent) return;
    
    setIsTtsLoading(true);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editedContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const { audio } = await response.json();
      const player = new Audio(audio);
      audioRef.current = player;
      audioRef.current.onplay = () => setIsAudioPlaying(true);
      audioRef.current.onended = () => setIsAudioPlaying(false);
      audioRef.current.play();

    } catch (error) {
      toast({ title: 'Read Aloud Failed', variant: 'destructive' });
    } finally {
      setIsTtsLoading(false);
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
          {lessonPlan && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint} className="no-print rounded-full">
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
              <Button className="rounded-full bg-green-600 hover:bg-green-700 no-print" onClick={handleSaveToArchive} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
              </Button>
            </div>
          )}
        </div>

        <Card className="rounded-[2.5rem] shadow-xl border-none no-print">
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
          <div className="flex flex-col items-center justify-center py-20 space-y-4 no-print">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium text-muted-foreground">Crafting your lesson...</p>
          </div>
        )}

        {lessonPlan && !isGenerating && (
          <Card className="rounded-[2.5rem] shadow-lg border-none mt-8 flex flex-col h-[600px] print:h-auto">
            <CardHeader className="bg-primary/5 rounded-t-[2.5rem] no-print">
              <div className="flex justify-between items-center">
                <CardTitle className="font-patrick-hand text-2xl">Workspace</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditMode(!isEditMode)} className="rounded-full">
                    <Edit3 className="mr-2 h-4 w-4" /> {isEditMode ? 'View' : 'Edit'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReadAloud} disabled={isTtsLoading} className="rounded-full">
                    {isTtsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isAudioPlaying ? <Square className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />)}
                    {isAudioPlaying ? 'Stop' : 'Read Aloud'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-8 print:p-0 print:overflow-visible" ref={printableRef}>
              {isEditMode ? (
                <textarea 
                  className="w-full h-full min-h-[400px] p-4 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary no-print"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none print:text-black font-body">
                  <ReactMarkdown>{editedContent}</ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <audio ref={audioRef} className="hidden" />
    </AppLayout>
  );
}
