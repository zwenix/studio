'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles, User, Mic, Loader2, Play, Square, History as HistoryIcon } from 'lucide-react';
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
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, addDoc, serverTimestamp, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

type Message = {
  role: 'user' | 'model';
  content: { text: string }[];
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
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState<number | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<number | null>(null);
  const [language, setLanguage] = useState('English');
  const [voice, setVoice] = useState('Algenib');
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Chat History Management (Last 3 Days)
  const threeDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return Timestamp.fromDate(d);
  }, []);

  const historyQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'aiChatMessages'),
      where('createdAt', '>=', threeDaysAgo),
      orderBy('createdAt', 'asc')
    );
  }, [user, firestore, threeDaysAgo]);

  const { data: savedMessages, isLoading: isHistoryLoading } = useCollection<any>(historyQuery);

  const messages: Message[] = useMemo(() => {
    return (savedMessages || []).map(m => ({ 
        role: m.role, 
        content: [{ text: m.text }] 
    }));
  }, [savedMessages]);

  // Cleanup old messages
  useEffect(() => {
    if (!user) return;
    const cleanupOldMessages = async () => {
      try {
        const q = query(
          collection(firestore, 'users', user.uid, 'aiChatMessages'),
          where('createdAt', '<', threeDaysAgo)
        );
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map(d =>
          deleteDoc(doc(firestore, 'users', user.uid, 'aiChatMessages', d.id))
        ));
      } catch (e) {
        console.warn('Failed to clean up old chat messages:', e);
      }
    };
    cleanupOldMessages();
  }, [user, firestore, threeDaysAgo]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsRecording(false);
        toast({ title: 'Voice Input Error', variant: 'destructive' });
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, [toast]);

  const handleMicClick = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Mic start failed:', e);
      }
    } else {
      toast({ title: 'Voice Recognition not supported in this browser.', variant: 'destructive' });
    }
  };

  const saveMessage = async (role: 'user' | 'model', text: string) => {
    if (!user) return;
    await addDoc(collection(firestore, 'users', user.uid, 'aiChatMessages'), {
      role,
      text,
      createdAt: serverTimestamp(),
    });
  };

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const userInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // 1. Save user message
      await saveMessage('user', userInput);

      // 2. Call AI
      const result = await aiTutor({ 
        query: userInput, 
        history: messages, 
        language 
      });

      // 3. Save model response
      await saveMessage('model', result.response);
    } catch (error) {
      console.error('AI Tutor failed:', error);
      toast({
        title: 'An error occurred',
        description: 'Failed to get a response from the AI tutor. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAudio = async (text: string, index: number) => {
    if (isAudioPlaying === index) {
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
        setIsAudioPlaying(null);
        return;
    }

    setIsTtsLoading(index);
    try {
        const result = await textToSpeech({ text, voice });
        if (audioRef.current) {
            audioRef.current.src = result.audio;
            audioRef.current.onplay = () => setIsAudioPlaying(index);
            audioRef.current.onended = () => setIsAudioPlaying(null);
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

  const handleStopAudio = () => {
    if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
    }
    setIsAudioPlaying(null);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full p-4 sm:p-8 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
                    <Sparkles className="mr-3 h-8 w-8 text-primary" />
                    AI Tutor
                </h1>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <HistoryIcon className="h-3 w-3 mr-1" /> Chats saved for 3 days
                </p>
            </div>
            <div className='grid grid-cols-2 gap-4 mt-4 sm:mt-0'>
                 <div className="space-y-2">
                    <Label htmlFor="language" className="text-[10px] uppercase font-bold text-muted-foreground">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger id="language" className="h-9"><SelectValue placeholder="Language" /></SelectTrigger>
                        <SelectContent>
                        {languages.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="voice" className="text-[10px] uppercase font-bold text-muted-foreground">Voice</Label>
                    <Select value={voice} onValueChange={setVoice}>
                        <SelectTrigger id="voice" className="h-9"><SelectValue placeholder="Voice" /></SelectTrigger>
                        <SelectContent>
                        {voices.map((v) => (
                            <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                 </div>
            </div>
        </div>

        <Card className="flex-1 flex flex-col rounded-[2.5rem] overflow-hidden shadow-xl border-none bg-white/50 backdrop-blur-sm dark:bg-slate-800/50">
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
            {isHistoryLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
            ) : savedMessages?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Image src="/favicon.ico" alt="AI Tutor" width={48} height={72} className="opacity-50" />
                <p className="mt-4 text-center font-medium">Ask me anything about your school subjects!</p>
              </div>
            ) : (
                savedMessages?.map((message, index) => (
                    <div key={index} className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
                      {message.role === 'model' && (
                        <Avatar className="h-8 w-8 border self-start shrink-0 bg-white">
                          <AvatarFallback className="bg-primary/10 p-1"><Image src="/favicon.ico" alt="AI Tutor" width={16} height={24} className="object-contain" /></AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`rounded-2xl px-4 py-2 max-w-[80%] shadow-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-white border rounded-bl-none dark:bg-slate-700 dark:text-white'}`}>
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      </div>
                       {message.role === 'model' && (
                          <div className="flex gap-1">
                            <Button
                                size="icon"
                                variant="ghost"
                                className={cn("shrink-0 h-8 w-8 rounded-full", isAudioPlaying === index ? "text-primary bg-primary/10" : "text-muted-foreground")}
                                onClick={() => handlePlayAudio(message.text, index)}
                                disabled={isTtsLoading === index}
                            >
                                {isTtsLoading === index ? <Loader2 className="h-4 w-4 animate-spin"/> : isAudioPlaying === index ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                          </div>
                       )}
                       {message.role === 'user' && (
                        <Avatar className="h-8 w-8 self-start shrink-0 border shadow-sm">
                           <AvatarFallback className="bg-secondary"><User className="h-4 w-4 text-secondary-foreground"/></AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                ))
            )}
             {isLoading && (
                 <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 border">
                        <AvatarFallback><Image src="/favicon.ico" alt="AI Tutor" width={16} height={24} className="object-contain" /></AvatarFallback>
                    </Avatar>
                    <div className="rounded-2xl px-4 py-2 bg-muted animate-pulse">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                 </div>
             )}
          </CardContent>
          <div className="p-4 border-t bg-white dark:bg-slate-900">
            <div className="relative flex items-center gap-2 max-w-4xl mx-auto">
              <Label htmlFor="ai-tutor-input" className="sr-only">Type your question here</Label>
              <div className="relative flex-1">
                <Input
                    id="ai-tutor-input"
                    name="ai-tutor-input"
                    autoComplete='off'
                    placeholder="Type your question here..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    className="pr-12 h-12 rounded-full border-2 focus:ring-primary shadow-sm"
                    disabled={isLoading}
                />
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 transition-colors", isRecording ? "bg-red-100 text-red-600 animate-pulse" : "text-muted-foreground hover:bg-primary/10 hover:text-primary")}
                    onClick={handleMicClick} 
                    disabled={isLoading}
                >
                    <Mic className="h-5 w-5"/>
                </Button>
              </div>
              <Button 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()} 
                className="rounded-full h-12 px-6 font-bold shadow-lg transition-transform active:scale-95"
              >
                Send
              </Button>
              {isAudioPlaying !== null && (
                <Button 
                    variant="destructive" 
                    size="icon" 
                    onClick={handleStopAudio} 
                    className="rounded-full h-12 w-12 shadow-lg shrink-0"
                    title="Stop Audio"
                >
                    <Square className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </Card>
        <audio ref={audioRef} className="hidden" />
      </div>
    </AppLayout>
  );
}
