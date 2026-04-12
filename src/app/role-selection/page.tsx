'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Loader2, School, Shield, Sparkles, Star, Users, type LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/content-storage';

type Role = 'teacher' | 'student' | 'parent' | 'admin';

type RoleOption = {
  value: Role;
  title: string;
  description: string;
  icon: LucideIcon;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'teacher',
    title: 'Teacher',
    description: 'Create lessons, manage classes, and track learner progress.',
    icon: GraduationCap,
  },
  {
    value: 'student',
    title: 'Student',
    description: 'View class material, assignments, and class updates.',
    icon: School,
  },
  {
    value: 'parent',
    title: 'Parent',
    description: 'Follow learner progress and school communication.',
    icon: Users,
  },
  {
    value: 'admin',
    title: 'Admin',
    description: 'Oversee settings, approvals, and the school workspace.',
    icon: Shield,
  },
];

export default function RoleSelectionPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>('teacher');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const { data, error: userError } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (userError) {
        setError(userError.message);
      }

      setEmail(data.user?.email ?? '');
      setCheckingUser(false);
    }

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  const handleContinue = async () => {
    setLoading(true);
    setError('');

    const { data, error: userError } = await supabase.auth.getUser();

    if (userError || !data.user) {
      setError('Please sign in before choosing a role.');
      setLoading(false);
      return;
    }

    const payload = {
      id: data.user.id,
      email: data.user.email ?? email,
      role: selectedRole,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase.from('profiles').upsert([payload]);

    if (upsertError) {
      setError(upsertError.message);
    } else {
      router.push('/');
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="space-y-3 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-sm text-indigo-300">
            <Sparkles className="h-4 w-4" />
            <span>Role setup</span>
            <Star className="h-4 w-4" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Choose your workspace role</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            This replaces the broken Firebase write path and saves the selected role directly to Supabase.
          </p>
          {email ? <p className="text-sm text-slate-300">Signed in as {email}</p> : null}
        </header>

        {error ? <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div> : null}

        <section className="grid gap-3 md:grid-cols-2">
          {ROLE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = selectedRole === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedRole(option.value)}
                className={
                  'rounded-3xl border p-5 text-left transition ' +
                  (active
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-600')
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-indigo-300" />
                  <div>
                    <h2 className="font-semibold text-white">{option.title}</h2>
                    <p className="text-sm text-slate-400">{option.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={loading || checkingUser}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {checkingUser ? 'Checking sign in...' : 'Save role'}
          </button>

          <Link href="/signup" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900">
            Back to sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
