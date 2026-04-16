'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link          from 'next/link';
import { Loader2 }   from 'lucide-react';
import { Button }    from '@/components/ui/button';
import { Input }     from '@/components/ui/input';
import { Label }     from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getSupabaseClient } from '@/lib/supabase/client';

type Role = 'teacher' | 'student' | 'parent';

export default function RegisterPage() {
  const router   = useRouter();
  const supabase = getSupabaseClient();

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [role,      setRole]      = useState<Role>('student');
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // 1. Create Supabase Auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { firstName, lastName, role },
      },
    });

    if (signUpError || !authData.user) {
      setError(signUpError?.message ?? 'Registration failed. Please try again.');
      setLoading(false);
      return;
    }

    // 2. Insert profile row into public.users
    const { error: profileError } = await supabase.from('users').insert({
      id:         authData.user.id,
      email:      email.trim(),
      first_name: firstName,
      last_name:  lastName,
      role,
    });

    if (profileError) {
      // Non-fatal — user was created in Auth but profile insert failed.
      // Log & continue; they can still sign in and fix profile later.
      console.error('[EduAI] Profile insert failed:', profileError.message);
    }

    router.push('/dashboard');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold text-white font-headline">Create Account</h1>
          <p className="text-blue-300 mt-1 text-sm">Join EduAI Companion today</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-white/80">First name</Label>
                <Input id="firstName" required value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-white/80">Last name</Label>
                <Input id="lastName" required value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regEmail" className="text-white/80">Email</Label>
              <Input id="regEmail" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="regPassword" className="text-white/80">Password</Label>
              <Input id="regPassword" type="password" required minLength={8} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">I am a…</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div role="alert" className="text-sm text-red-300 bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl h-11 font-semibold">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…</> : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-white/60">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-300 hover:text-blue-200 hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
