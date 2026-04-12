'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Loader2, Sparkles, Star } from 'lucide-react';
import { supabase } from '@/lib/content-storage';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from('profiles').upsert([
        {
          id: data.user.id,
          email,
          full_name: fullName,
          role: 'teacher',
          created_at: new Date().toISOString(),
        },
      ]);
    }

    setMessage('Account created. Continue by choosing your role.');
    router.push('/role-selection');
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="space-y-3 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-sm text-indigo-300">
            <Sparkles className="h-4 w-4" />
            <span>Create account</span>
            <Star className="h-4 w-4" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Create your Supabase account</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            This replaces the Firebase auth call with a direct Supabase sign-up flow and routes users to role selection.
          </p>
        </header>

        {error ? <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div> : null}
        {message ? <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 p-4 text-sm text-emerald-200">{message}</div> : null}

        <form onSubmit={handleSubmit} className="grid gap-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Full name</span>
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Confirm password</span>
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <Link href="/" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900">
              Back home
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
