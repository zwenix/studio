'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { useUser } from '@/lib/supabase';
import { getSupabaseClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
type ChatMessage = {
  role: 'user' | 'model';
  text: string;
  id?:  string;
};

// ─── Config ───────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { value: 'English',   label: 'English' },
  { value: 'Spanish',   label: 'Spanish' },
  { value: 'French',    label: 'French' },
  { value: 'German',    label: 'German' },
  { value: 'isiZulu',   label: 'isiZulu' },
  { value: 'isiXhosa',  label: 'isiXhosa' },
  { value: 'Afrikaans', label: 'Afrikaans' },
];

const VOICES = [
  { value: 'Algenib',  label: 'Algenib (Female)' },
  { value: 'Achernar', label: 'Achernar (Male)' },
  { value: 'Enif',     label: 'Enif (Female)' },
  { value: 'Canopus',  label: 'Canopus (Male)' },
  { value: 'Arcturus', label: 'Arcturus (Male)' },
  { value: 'Procyon',  label: 'Procyon (Male)' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AiTutorPage() {
  const { toast }                  = useToast();
  const { user }                   = useUser();

  const [input,           setInput]           = useState('');
  const [messages,        setMessages]        = useState<ChatMessage[]>([]);
  const [isLoading,       setIsLoading]       = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isTtsLoading,    setIsTtsLoading]    = useState<number | null>(null);
  const [isAudioPlaying,  setIsAudioPlaying]  = useState<number | null>(null);
  const [language,        setLanguage]        = useState('English');
  const [voice,           setVoice]           = useState('Algenib');
  const [isRecording,     setIsRecording]     = useState(false);

  const audioRef      = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Load history from Supabase (last 3 days) ───────────────────────────────
  useEffect(() => {
    if (!user) { setIsHistoryLoading(false); return; }

    const supabase    = getSupabaseClient();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('ai_chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', threeDaysAgo.toISOString())
          .order('created_at', { ascending: true })
          .limit(100);

        if (!error && data) {
          setMessages(data.map((row: any) => ({
            id:   row.id,
            role: row.role,
            text: row.text,
          })));
        }

        // Clean up messages older than 3 days
        await supabase
          .from('ai_chat_messages')
          .delete()
          .eq('user_id', user.id)
          .lt('created_at', threeDaysAgo.toISOString());

      } catch (e) {
        console.warn('[AI Tutor] History load failed (table may not exist yet):', e);
      } finally {
        setIsHistoryLoading(false);
      }
    })();
  }, [user]);

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Speech Recognition ────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec                = new SR();
    rec.continuous           = false;
    rec.interimResults       = false;
    rec.onresult             = (e: any) => { setInput(e.results[0][0].transcript); setIsRecording(false); };
    rec.onerror              = ()        => { setIsRecording(false); toast({ title: 'Voice Input Error', variant: 'destructive' }); };
    rec.onend                = ()        => setIsRecording(false);
    recognitionRef.current   = rec;
  }, [toast]);

  const handleMicClick = useCallback(() => {
    if (isRecording) { recognitionRef.current?.stop(); }
    else if (recognitionRef.current) {
      try { recognitionRef.current.start(); setIsRecording(true); }
      catch (e) { console.error('Mic error:', e); }
    } else {
      toast({ title: 'Voice recognition not supported in this browser.', variant: 'destructive' });
    }
  }, [isRecording, toast]);

  // ── Persist message to Supabase (best-effort) ─────────────────────────────
  const persistMessage = useCallback(async (role: 'user' | 'model', text: string) => {
    if (!user) return;
    try {
      const supabase = getSupabaseClient();
      await supabase.from('ai_chat_messages').insert({
        user_id:    user.id,
        role,
        text,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      // Non-fatal — table might not exist yet
      console.debug('[AI Tutor] Persist failed (non-fatal):', e);
    }
  }, [user]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!input.trim() || !user) return;

    const userText   = input.trim();
    const userMsg: ChatMessage = { role: 'user', text: userText };

    setInput('');
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Persist user message (non-blocking)
    void persistMessage('user', userText);

    try {
      // Build history for AI (convert role 'model' → 'model' — aiTutor accepts both)
      const history = messages.map(m => ({ role: m.role, content: m.text }));

      const result = await aiTutor({ query: userText, history, language });

      const modelMsg: ChatMessage = { role: 'model', text: result.response };
      setMessages(prev => [...prev, modelMsg]);
      void persistMessage('model', result.response);

    } catch (error) {
      console.error('[AI Tutor] send failed:', error);
      toast({ title: 'Failed to get response', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [input, user, messages, language, persistMessage, toast]);

  // ── TTS ───────────────────────────────────────────────────────────────────
  const handlePlayAudio = useCallback(async (text: string, index: number) => {
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
        audioRef.current.src     = result.audio;
        audioRef.current.onplay  = () => setIsAudioPlaying(index);
        audioRef.current.onended = () => setIsAudioPlaying(null);
        void audioRef.current.play();
      }
    } catch (err) {
      console.error('[AI Tutor] TTS failed:', err);
      toast({ title: 'Audio generation failed', variant: 'destructive' });
    } finally {
      setIsTtsLoading(null);
    }
  }, [isAudioPlaying, voice, toast]);

  const handleStopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setIsAudioPlaying(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="flex flex-col h-full p-4 sm:p-8 pt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
              <Sparkles className="mr-3 h-8 w-8 text-primary" /> AI Tutor
            </h1>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <HistoryIcon className="h-3 w-3 mr-1" /> Chats saved for 3 days
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 sm:mt-0">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Voice</Label>
              <Select value={voice} onValueChange={setVoice}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VOICES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Chat Window */}
        <Card className="flex-1 flex flex-col rounded-[2.5rem] overflow-hidden shadow-xl border-none bg-white/50 backdrop-blur-sm dark:bg-slate-800/50">
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
            {isHistoryLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Image src="/favicon.ico" alt="AI Tutor" width={48} height={72} className="opacity-50" />
                <p className="mt-4 text-center font-medium">Ask me anything about your school subjects! 🚀</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'model' && (
                    <Avatar className="h-8 w-8 border self-start shrink-0 bg-white">
                      <AvatarFallback className="bg-primary/10 p-1">
                        <Image src="/favicon.ico" alt="AI" width={16} height={24} className="object-contain" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`rounded-2xl px-4 py-2 max-w-[80%] shadow-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-white border rounded-bl-none dark:bg-slate-700 dark:text-white'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  {msg.role === 'model' && (
                    <Button
                      size="icon" variant="ghost"
                      className={cn('shrink-0 h-8 w-8 rounded-full', isAudioPlaying === i ? 'text-primary bg-primary/10' : 'text-muted-foreground')}
                      onClick={() => handlePlayAudio(msg.text, i)}
                      disabled={isTtsLoading === i}
                    >
                      {isTtsLoading === i ? <Loader2 className="h-4 w-4 animate-spin" /> : isAudioPlaying === i ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  )}
                  {msg.role === 'user' && (
                    <Avatar className="h-8 w-8 self-start shrink-0 border shadow-sm">
                      <AvatarFallback className="bg-secondary"><User className="h-4 w-4 text-secondary-foreground" /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback><Image src="/favicon.ico" alt="AI" width={16} height={24} className="object-contain" /></AvatarFallback>
                </Avatar>
                <div className="rounded-2xl px-4 py-2 bg-muted animate-pulse">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input Bar */}
          <div className="p-4 border-t bg-white dark:bg-slate-900">
            <div className="relative flex items-center gap-2 max-w-4xl mx-auto">
              <div className="relative flex-1">
                <Input
                  id="ai-tutor-input"
                  autoComplete="off"
                  placeholder="Type your question here..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !isLoading && handleSend()}
                  className="pr-12 h-12 rounded-full border-2 focus:ring-primary shadow-sm"
                  disabled={isLoading}
                />
                <Button
                  variant="ghost" size="icon"
                  className={cn('absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 transition-colors', isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary')}
                  onClick={handleMicClick}
                  disabled={isLoading}
                >
                  <Mic className="h-5 w-5" />
                </Button>
              </div>
              <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="rounded-full h-12 px-6 font-bold shadow-lg">
                Send
              </Button>
              {isAudioPlaying !== null && (
                <Button variant="destructive" size="icon" onClick={handleStopAudio} className="rounded-full h-12 w-12 shadow-lg shrink-0">
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
