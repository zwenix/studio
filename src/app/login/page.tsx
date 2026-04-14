'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Loader2, Star } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogle,  setIsGoogle]  = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const supabase = getSupabaseClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    // router.replace + router.refresh forces middleware to re-evaluate
    // the new auth cookie set by createBrowserClient
    router.replace('/dashboard');
    router.refresh();
  };

  const handleGoogle = async () => {
    setIsGoogle(true);
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast({ title: 'Google Login Failed', description: error.message, variant: 'destructive' });
      setIsGoogle(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-500 p-6 relative overflow-hidden">
      <Star className="absolute top-10 left-10 w-8 h-8 text-yellow-300 animate-pulse opacity-20" />
      <Card className="w-full max-w-sm relative z-10 shadow-2xl rounded-[2.5rem] border border-white/10 bg-indigo-950 text-white">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <Image src="https://i.ibb.co/tTc5gG5k/eduai-company-logo2-preview-1772467621580-2-preview-1772473153046.png"
              alt="EduAI" width={48} height={72} priority style={{ width: 'auto', height: '72px' }} />
          </div>
          <CardTitle className="text-3xl font-patrick-hand text-white">Welcome Back!</CardTitle>
          <CardDescription className="text-indigo-200">Login to continue your adventure.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-indigo-100">Email</Label>
              <Input id="email" type="email" autoComplete="username" required
                value={email} onChange={e => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-indigo-100">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
            </div>
            <Button type="submit" disabled={isLoading || isGoogle}
              className="w-full rounded-full h-12 font-bold bg-yellow-400 text-indigo-950 hover:bg-yellow-300">
              {isLoading ? <Loader2 className="animate-spin" /> : 'Login'}
            </Button>
          </form>
          <Button variant="outline" onClick={handleGoogle} disabled={isLoading || isGoogle}
            className="w-full rounded-full h-12 font-bold border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
            {isGoogle ? <Loader2 className="animate-spin mr-2" /> : null}
            Sign in with Google
          </Button>
          <div className="text-center text-sm text-indigo-200">
            No account? <Link href="/signup" className="underline font-bold text-yellow-400">Sign up</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
