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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Loader2, Star, Sparkles } from 'lucide-react';
import Image from 'next/image';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/role-selection');
    } catch (error: any) {
      toast({ title: 'Sign-up Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-500 p-6 relative overflow-hidden">
      <Star className="absolute top-10 left-10 w-8 h-8 text-yellow-300 animate-pulse opacity-20" />
      <Sparkles className="absolute bottom-10 right-10 w-8 h-8 text-yellow-200 animate-bounce opacity-20" />
      <Card className="w-full max-w-sm relative z-10 shadow-2xl rounded-[2.5rem] border border-white/10 backdrop-blur-md bg-indigo-950 text-white">
        <CardHeader className="text-center">
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
          <CardTitle className="text-3xl font-patrick-hand text-white">Join the Team!</CardTitle>
          <CardDescription className="text-indigo-200">Start your learning adventure today.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-indigo-100">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                required 
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
                autoComplete="new-password"
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-yellow-400"
              />
            </div>
            <Button type="submit" className="w-full rounded-full h-12 text-lg font-bold bg-yellow-400 text-indigo-950 hover:bg-yellow-300 shadow-lg" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-indigo-200">
            Already have an account? <Link href="/login" className="underline font-bold text-yellow-400 hover:text-yellow-300">Login</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
