'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen, Loader2, PlusCircle, Users } from 'lucide-react';
import { supabase } from '@/lib/content-storage';

type ClassRecord = {
  id: string;
  name?: string;
  title?: string;
  grade?: string;
  subject?: string;
  teacher_name?: string;
  learner_count?: number;
  created_at?: string;
};

export default function MyClassesPage() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadClasses() {
      setLoading(true);
      setError('');

      const { data, error: loadError } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!active) {
        return;
      }

      if (loadError) {
        setError(loadError.message);
        setClasses([]);
      } else {
        setClasses((data ?? []) as ClassRecord[]);
      }

      setLoading(false);
    }

    loadClasses();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-300">My Classes</p>
            <h1 className="text-3xl font-semibold tracking-tight">Manage your Supabase-backed classes</h1>
            <p className="max-w-2xl text-sm text-slate-400">
              This page now loads classes from Supabase instead of Firebase and links through to your class detail view.
            </p>
          </div>
          <Link href="/my-classes/new" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500">
            <PlusCircle className="h-4 w-4" />
            New Class
          </Link>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading classes...
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
            <BookOpen className="mx-auto mb-4 h-10 w-10 text-slate-500" />
            <h2 className="text-lg font-semibold text-white">No classes yet</h2>
            <p className="mt-2 text-sm text-slate-400">Create your first class to start tracking learners, assignments, and progress reports.</p>
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classes.map((item) => {
              const label = item.name ?? item.title ?? 'Untitled Class';

              return (
                <Link
                  key={item.id}
                  href={'/my-classes/' + item.id}
                  className="group rounded-3xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-indigo-500/50 hover:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white transition group-hover:text-indigo-200">{label}</h2>
                      <p className="mt-1 text-sm text-slate-400">{item.subject ?? 'No subject set'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-950 px-3 py-2 text-xs text-slate-300">{item.grade ?? 'Grade N/A'}</div>
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-sm text-slate-400">
                    <Users className="h-4 w-4" />
                    <span>{item.learner_count ?? 0} learners</span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
