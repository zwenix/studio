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
      <Card className="w-full max-w-sm relative z-10 shadow-2xl rounded-[2rem] border-none backdrop-blur-md bg-white/95">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4 bg-transparent p-2">
            <Image src="https://i.ibb.co/tTc5gG5k/eduaicompanion-logo2-preview-1772467621580-2-preview-1772473153046.png" alt="EduAI" width={48} height={72} />
          </div>
          <CardTitle className="text-3xl font-patrick-hand">Join the Team!</CardTitle>
          <CardDescription>Start your learning adventure today.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full rounded-full h-12 text-lg font-bold" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account? <Link href="/login" className="underline font-bold text-primary">Login</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}