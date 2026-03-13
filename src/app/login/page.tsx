
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Loader2, Star } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsLoadingGoogle] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error: any) {
      toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Google Auth Error:', error);
      if (error.code === 'auth/popup-blocked') {
        toast({ 
          title: 'Popup Blocked', 
          description: 'Please enable popups for this site or try logging in again.', 
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Google Login Failed', description: error.message, variant: 'destructive' });
      }
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-500 p-6 relative overflow-hidden">
      <Star className="absolute top-10 left-10 w-8 h-8 text-yellow-300 animate-pulse opacity-20" />
      <Card className="w-full max-w-sm relative z-10 shadow-2xl rounded-[2.5rem] border border-white/10 bg-indigo-950 text-white">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4 bg-transparent p-2">
            <Image 
              src="https://i.ibb.co/tTc5gG5k/eduaicompanion-logo2-preview-1772467621580-2-preview-1772473153046.png" 
              alt="EduAI" 
              width={48} 
              height={72} 
              priority
              style={{ width: 'auto', height: '72px' }}
              className="drop-shadow-glow" 
            />
          </div>
          <CardTitle className="text-3xl font-patrick-hand text-white">Welcome Back!</CardTitle>
          <CardDescription className="text-indigo-200">Login to continue your adventure.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-indigo-100">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                required 
                autoComplete="username"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-yellow-400"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" title="password" className="text-indigo-100">Password</Label>
              <Input 
                id="password" 
                type="password" 
                autoComplete="current-password"
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-yellow-400"
              />
            </div>
            <Button type="submit" className="w-full rounded-full h-12 text-lg font-bold shadow-lg bg-yellow-400 text-indigo-950 hover:bg-yellow-300" disabled={isLoading || isGoogleLoading}>
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Login'}
            </Button>
          </form>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-indigo-950 px-2 text-indigo-300">Or continue with</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            type="button" 
            className="w-full rounded-full h-12 font-bold border-2 border-yellow-400/20 bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20" 
            onClick={handleGoogleLogin} 
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
            )}
            Sign in with Google
          </Button>

          <div className="text-center text-sm text-indigo-200 mt-2">
            Don't have an account? <Link href="/signup" className="underline font-bold text-yellow-400 hover:text-yellow-300">Sign up</Link>
          </div>
        </CardContent>
      </Card>
      <div className="mt-8 text-white/40 text-[10px] sm:text-xs text-center z-10">
        <p>© 2026 EduAI Companion. All rights reserved by Zwelakhe Msuthu - Owner & Developer</p>
      </div>
    </div>
  );
}
