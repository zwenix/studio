'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, User, Mic, Loader2, Play } from 'lucide-react';
import { aiTutor } from '@/ai/flows/ai-tutor-flow';
import { textToSpeech } from '@/ai/flows/tts-flow';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Message = {
  role: 'user' | 'model';
  content: string;
};

const languages = [
    { value: 'English', label: 'English' },
    { value: 'Spanish', label: 'Spanish' },
    { value: 'French', label: 'French' },
    { value: 'German', label: 'German' },
    { value: 'isiZulu', label: 'isiZulu' },
    { value: 'isiXhosa', label: 'isiXhosa' },
    { value: 'Afrikaans', label: 'Afrikaans' },
  ];
  
  const voices = [
    { value: 'Algenib', label: 'Algenib (Female)' },
    { value: 'Achernar', label: 'Achernar (Male)' },
    { value: 'Enif', label: 'Enif (Female)' },
    { value: 'Canopus', label: 'Canopus (Male)' },
    { value: 'Arcturus', label: 'Arcturus (Male)' },
    { value: 'Procyon', label: 'Procyon (Male)' },
  ];

export default function AiTutorPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState<number | null>(null);
  const [language, setLanguage] = useState('English');
  const [voice, setVoice] = useState('Algenib');
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await aiTutor({ query: input, history: messages, language });
      const modelMessage: Message = { role: 'model', content: result.response };
      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error('AI Tutor failed:', error);
      toast({
        title: 'An error occurred',
        description: 'Failed to get a response from the AI tutor.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAudio = async (text: string, index: number) => {
    setIsTtsLoading(index);
    try {
        const result = await textToSpeech({ text, voice });
        if (audioRef.current) {
            audioRef.current.src = result.audio;
            audioRef.current.play();
        }
    } catch (error) {
        console.error('TTS failed:', error);
        toast({
            title: 'An error occurred',
            description: 'Failed to generate audio.',
            variant: 'destructive',
        });
    } finally {
        setIsTtsLoading(null);
    }
  };


  return (
    <AppLayout>
      <div className="flex flex-col h-full p-4 sm:p-8 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center mb-4 sm:mb-0">
                <Sparkles className="mr-3 h-8 w-8" />
                AI Tutor
            </h1>
            <div className='grid grid-cols-2 gap-4'>
                 <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger id="language"><SelectValue placeholder="Language" /></SelectTrigger>
                        <SelectContent>
                        {languages.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="voice">Voice</Label>
                    <Select value={voice} onValueChange={setVoice}>
                        <SelectTrigger id="voice"><SelectValue placeholder="Voice" /></SelectTrigger>
                        <SelectContent>
                        {voices.map((v) => (
                            <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                 </div>
            </div>
        </div>


        <Card className="flex-1 flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="AI Tutor" width={48} height={48} />
                <p className="mt-4 text-center">Ask me anything about your school subjects!</p>
              </div>
            )}
            {messages.map((message, index) => (
              <div key={index} className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'model' && (
                  <Avatar className="h-8 w-8 border self-start shrink-0">
                    <AvatarFallback><Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="AI Tutor" width={16} height={16} /></AvatarFallback>
                  </Avatar>
                )}
                <div className={`rounded-lg px-4 py-2 max-w-[80%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                 {message.role === 'model' && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => handlePlayAudio(message.content, index)}
                        disabled={isTtsLoading === index}
                        aria-label="Play audio response"
                    >
                        {isTtsLoading === index ? <Loader2 className="h-5 w-5 animate-spin"/> : <Play className="h-5 w-5" />}
                    </Button>
                 )}
                 {message.role === 'user' && (
                  <Avatar className="h-8 w-8 self-start shrink-0">
                     <AvatarFallback><User className="h-4 w-4"/></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
             {isLoading && (
                 <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 border">
                        <AvatarFallback><Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="AI Tutor" width={16} height={16} /></AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg px-4 py-2 bg-muted">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                 </div>
             )}
          </CardContent>
          <div className="p-4 border-t">
            <div className="relative">
              <Label htmlFor="ai-tutor-input" className="sr-only">Type your question here</Label>
              <Input
                id="ai-tutor-input"
                name="ai-tutor-input"
                autoComplete='off'
                placeholder="Type your question here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="pr-20"
                disabled={isLoading}
              />
              <div className="absolute top-1/2 right-2 transform -translate-y-1/2 flex gap-2">
                 <Button variant="ghost" size="icon" disabled={isLoading}>
                    <Mic className="h-4 w-4"/>
                </Button>
                <Button onClick={handleSend} disabled={isLoading}>Send</Button>
              </div>
            </div>
          </div>
        </Card>
        <audio ref={audioRef} className="hidden" />
      </div>
    </AppLayout>
  );
}
