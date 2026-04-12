'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Loader2, PlusCircle } from 'lucide-react';
import { supabase } from '@/lib/content-storage';

export default function NewClassPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('1');
  const [subject, setSubject] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      name,
      title: name,
      grade,
      subject,
      teacher_name: teacherName,
      description,
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from('classes').insert([payload]);

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push('/my-classes');
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-300">New Class</p>
          <h1 className="text-3xl font-semibold tracking-tight">Create a class in Supabase</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            This form replaces the broken Firebase import chain and writes directly to your Supabase classes table.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl shadow-slate-950/30">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Class name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Grade 5 Natural Sciences"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Grade</span>
              <input
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                placeholder="5"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Subject</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Natural Sciences"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Teacher</span>
              <input
                value={teacherName}
                onChange={(event) => setTeacherName(event.target.value)}
                placeholder="Mr / Ms Example"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder="Optional class description or notes."
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500"
            />
          </label>

          {error ? <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div> : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading || name.trim().length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              {loading ? 'Saving...' : 'Create Class'}
            </button>

            <Link href="/my-classes" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
