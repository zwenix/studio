'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Edit2, GraduationCap, Loader2, Mail, UserPlus, Users } from 'lucide-react';
import { supabase } from '@/lib/content-storage';

type StudentRecord = {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  grade?: string;
  guardian_name?: string;
  created_at?: string;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [grade, setGrade] = useState('');
  const [guardianName, setGuardianName] = useState('');

  useEffect(() => {
    let active = true;

    async function loadStudents() {
      const { data, error: loadError } = await supabase.from('learners').select('*').order('created_at', { ascending: false });

      if (!active) {
        return;
      }

      if (loadError) {
        setError(loadError.message);
        setStudents([]);
      } else {
        setStudents((data ?? []) as StudentRecord[]);
      }

      setLoading(false);
    }

    loadStudents();

    return () => {
      active = false;
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter((student) => {
      const haystack = [student.first_name, student.last_name, student.full_name, student.email, student.grade, student.guardian_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [search, students]);

  const clearForm = () => {
    setEditingId(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setGrade('');
    setGuardianName('');
  };

  const startEdit = (student: StudentRecord) => {
    setEditingId(student.id);
    setFirstName(student.first_name ?? '');
    setLastName(student.last_name ?? '');
    setEmail(student.email ?? '');
    setGrade(student.grade ?? '');
    setGuardianName(student.guardian_name ?? '');
  };

  const refreshStudents = async () => {
    const { data, error: loadError } = await supabase.from('learners').select('*').order('created_at', { ascending: false });

    if (loadError) {
      setError(loadError.message);
      return;
    }

    setStudents((data ?? []) as StudentRecord[]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const fullName = (firstName + ' ' + lastName).trim();
    const payload = {
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      email,
      grade,
      guardian_name: guardianName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const request = editingId
      ? supabase.from('learners').update(payload).eq('id', editingId)
      : supabase.from('learners').insert([payload]);

    const { error: saveError } = await request;

    if (saveError) {
      setError(saveError.message);
    } else {
      clearForm();
      await refreshStudents();
    }

    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-3 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-sm text-indigo-300">
            <GraduationCap className="h-4 w-4" />
            <span>Students</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Manage learners in Supabase</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            This page removes the broken Firebase import fragment and gives you a simple learner directory with add and edit support.
          </p>
        </header>

        {error ? <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div> : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <form onSubmit={handleSubmit} className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center gap-3 text-slate-300">
              <UserPlus className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-[0.25em]">{editingId ? 'Edit learner' : 'Add learner'}</span>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">First name</span>
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Last name</span>
              <input value={lastName} onChange={(event) => setLastName(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Grade</span>
              <input value={grade} onChange={(event) => setGrade(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Guardian name</span>
              <input value={guardianName} onChange={(event) => setGuardianName(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving || firstName.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {saving ? 'Saving...' : editingId ? 'Update learner' : 'Add learner'}
              </button>

              {editingId ? (
                <button
                  type="button"
                  onClick={clearForm}
                  className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-slate-300">
                <Users className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-[0.25em]">Learner list</span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300">
                <Mail className="h-4 w-4" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search learners" className="bg-transparent outline-none placeholder:text-slate-500" />
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {loading ? (
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading learners...
                </div>
              ) : filteredStudents.length === 0 ? (
                <p className="text-sm text-slate-400">No learners found.</p>
              ) : (
                filteredStudents.map((student) => (
                  <article key={student.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      {(() => {
                        const displayName = student.full_name ?? (((student.first_name ?? '') + ' ' + (student.last_name ?? '')).trim() || 'Unnamed learner');

                        return (
                          <>
                            <h3 className="font-medium text-white">{displayName}</h3>
                            <p className="text-sm text-slate-400">Grade {student.grade ?? 'N/A'}</p>
                            {student.email ? <p className="mt-2 text-sm text-slate-400">{student.email}</p> : null}
                            {student.guardian_name ? <p className="text-sm text-slate-500">Guardian: {student.guardian_name}</p> : null}
                          </>
                        );
                      })()}
                      </div>

                      <button
                        type="button"
                        onClick={() => startEdit(student)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-indigo-500 hover:bg-slate-900"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <Link href="/my-classes" className="mt-5 inline-flex text-sm text-indigo-300 transition hover:text-indigo-200">
              Back to classes
            </Link>
          </section>
        </section>
      </div>
    </main>
  );
}
