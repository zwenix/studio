'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, ClipboardList, Loader2, Save, PlusCircle } from 'lucide-react';
import { supabase } from '@/lib/content-storage';

type ClassRecord = {
  id: string;
  name?: string;
  title?: string;
  grade?: string;
  subject?: string;
  teacher_name?: string;
  description?: string;
};

type AssignmentRecord = {
  id: string;
  title?: string;
  status?: string;
  due_date?: string;
  created_at?: string;
};

export default function ClassDetailPage() {
  const params = useParams<{ classId: string }>();
  const classId = useMemo(() => {
    const value = params?.classId;
    return Array.isArray(value) ? value[0] : value ?? '';
  }, [params]);

  const [classData, setClassData] = useState<ClassRecord | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState('');

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      setError('Missing class id.');
      return;
    }

    let active = true;

    async function loadClass() {
      setLoading(true);
      setError('');

      const [{ data: classRow, error: classError }, { data: assignmentRows, error: assignmentError }] = await Promise.all([
        supabase.from('classes').select('*').eq('id', classId).maybeSingle(),
        supabase.from('assignments').select('*').eq('class_id', classId).order('created_at', { ascending: false }),
      ]);

      if (!active) {
        return;
      }

      if (classError) {
        setError(classError.message);
      } else {
        const nextClass = (classRow ?? null) as ClassRecord | null;
        setClassData(nextClass);
        setName(nextClass?.name ?? nextClass?.title ?? '');
        setGrade(nextClass?.grade ?? '');
        setSubject(nextClass?.subject ?? '');
      }

      if (assignmentError) {
        setError((current) => current || assignmentError.message);
        setAssignments([]);
      } else {
        setAssignments((assignmentRows ?? []) as AssignmentRecord[]);
      }

      setLoading(false);
    }

    loadClass();

    return () => {
      active = false;
    };
  }, [classId]);

  const classLabel = classData?.name ?? classData?.title ?? 'Class details';

  const handleSaveClass = async () => {
    if (!classId) {
      return;
    }

    setSaving(true);
    setError('');

    const { error: updateError } = await supabase
      .from('classes')
      .update({ name, title: name, grade, subject })
      .eq('id', classId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setClassData((current) =>
        current
          ? {
              ...current,
              name,
              title: name,
              grade,
              subject,
            }
          : current
      );
    }

    setSaving(false);
  };

  const handleAddAssignment = async () => {
    if (!classId || assignmentTitle.trim().length === 0) {
      return;
    }

    setSaving(true);
    setError('');

    const { data, error: insertError } = await supabase.from('assignments').insert([
      {
        class_id: classId,
        title: assignmentTitle,
        due_date: assignmentDueDate || null,
        status: 'open',
        created_at: new Date().toISOString(),
      },
    ]).select('*');

    if (insertError) {
      setError(insertError.message);
    } else {
      setAssignments((current) => [
        ...((data ?? []) as AssignmentRecord[]),
        ...current,
      ]);
      setAssignmentTitle('');
      setAssignmentDueDate('');
    }

    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <Link href="/my-classes" className="inline-flex w-fit items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to classes
        </Link>

        <header className="space-y-3 border-b border-slate-800 pb-6">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-300">Class Detail</p>
          <h1 className="text-3xl font-semibold tracking-tight">{classLabel}</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            The broken Firebase import line has been removed and this page now loads and saves class data from Supabase.
          </p>
        </header>

        {error ? <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div> : null}

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading class details...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex items-center gap-3 text-slate-300">
                <BookOpen className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-[0.25em]">Class info</span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="text-slate-300">Name</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="text-slate-300">Grade</span>
                  <input value={grade} onChange={(event) => setGrade(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
                </label>

                <label className="grid gap-2 text-sm md:col-span-2">
                  <span className="text-slate-300">Subject</span>
                  <input value={subject} onChange={(event) => setSubject(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
                </label>
              </div>

              <button
                onClick={handleSaveClass}
                disabled={saving}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save class details'}
              </button>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex items-center gap-3 text-slate-300">
                <PlusCircle className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-[0.25em]">Add assignment</span>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm">
                  <span className="text-slate-300">Assignment title</span>
                  <input value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} placeholder="Reading task" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500" />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="text-slate-300">Due date</span>
                  <input type="date" value={assignmentDueDate} onChange={(event) => setAssignmentDueDate(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
                </label>

                <button
                  onClick={handleAddAssignment}
                  disabled={saving || assignmentTitle.trim().length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                  {saving ? 'Saving...' : 'Add assignment'}
                </button>
              </div>
            </section>
          </div>
        )}

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Assignments</h2>
          <div className="mt-4 grid gap-3">
            {assignments.length === 0 ? (
              <p className="text-sm text-slate-400">No assignments have been created for this class yet.</p>
            ) : (
              assignments.map((assignment) => (
                <div key={assignment.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-white">{assignment.title ?? 'Untitled assignment'}</h3>
                      <p className="text-sm text-slate-400">{assignment.status ?? 'open'}{assignment.due_date ? ' · due ' + assignment.due_date : ''}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{assignment.status ?? 'open'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
