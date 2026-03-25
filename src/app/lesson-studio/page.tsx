'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, BookOpen, Image as ImageIcon } from 'lucide-react';
import { generateLessonStudio } from '@/ai/flows/generate-lesson-studio';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function LessonStudioPage() {
  const [topic, setTopic] = useState('');
  const [lessonPlan, setLessonPlan] = useState('');
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    setLessonPlan('');
    setPosterUrl(null);

    try {
      const result = await generateLessonStudio({ topic });
      setLessonPlan(result.lessonPlan);
      setPosterUrl(result.posterUrl);
    } catch (error) {
      console.error('Generation Failed:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate educational content. Please try again.',
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
              AI Lesson & Poster Studio
            </h1>
            <p className="text-muted-foreground mt-2">Generate a comprehensive lesson plan and an engaging classroom poster simultaneously.</p>
          </div>
        </div>

        <Card className="rounded-[2.5rem] shadow-xl border-none">
          <CardContent className="p-6 space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter a topic (e.g., The Water Cycle, Long Division)..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                disabled={isGenerating}
                className="h-14 rounded-full text-lg"
              />
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !topic.trim()}
                className="h-14 px-8 rounded-full font-bold text-lg"
              >
                {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Generate'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isGenerating && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                 <Loader2 className="h-12 w-12 animate-spin text-primary" />
                 <p className="text-lg font-medium text-muted-foreground">Crafting your lesson and poster...</p>
            </div>
        )}

        {!isGenerating && (lessonPlan || posterUrl) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <Card className="rounded-[2.5rem] shadow-lg border-none">
              <CardHeader className="bg-primary/5 rounded-t-[2.5rem]">
                <CardTitle className="text-2xl font-patrick-hand flex items-center">
                   <BookOpen className="mr-2 h-6 w-6" /> Lesson Plan & Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 prose dark:prose-invert max-w-none font-body">
                <ReactMarkdown>{lessonPlan}</ReactMarkdown>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] shadow-lg border-none overflow-hidden flex flex-col">
               <CardHeader className="bg-secondary/10">
                <CardTitle className="text-2xl font-patrick-hand flex items-center">
                   <ImageIcon className="mr-2 h-6 w-6" /> Generated Poster
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 relative min-h-[400px]">
                {posterUrl ? (
                    <Image
                        src={posterUrl}
                        alt={`Poster for ${topic}`}
                        fill
                        className="object-cover"
                        unoptimized // Important for external API images like Pexels/Pixabay
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-50 bg-slate-100 dark:bg-slate-800">
                        <ImageIcon className="h-20 w-20 mb-4" />
                        <p>No image could be found for this topic.</p>
                    </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
