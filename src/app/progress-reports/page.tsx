'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BarChart, GraduationCap, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/content-storage';

type ClassRecord = {
  id: string;
  name?: string;
  title?: string;
  grade?: string;
  subject?: string;
};

type ProgressReportRecord = {
  id: string;
  class_id?: string;
  summary?: string;
  progress_percent?: number;
  updated_at?: string;
  created_at?: string;
};

export default function ProgressReportsPage() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [reports, setReports] = useState<ProgressReportRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadReports() {
      setLoading(true);
      setError('');

      const [{ data: classRows, error: classError }, { data: reportRows, error: reportError }] = await Promise.all([
        supabase.from('classes').select('*').order('created_at', { ascending: false }),
        supabase.from('progress_reports').select('*').order('updated_at', { ascending: false }),
      ]);

      if (!active) {
        return;
      }

      if (classError) {
        setError(classError.message);
      } else {
        const nextClasses = (classRows ?? []) as ClassRecord[];
        setClasses(nextClasses);
        setSelectedClassId((current) => current || nextClasses[0]?.id || '');
      }

      if (reportError) {
        setError((current) => current || reportError.message);
        setReports([]);
      } else {
        setReports((reportRows ?? []) as ProgressReportRecord[]);
      }

      setLoading(false);
    }

    loadReports();

    return () => {
      active = false;
    };
  }, []);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId]
  );

  const selectedReports = useMemo(
    () => reports.filter((item) => item.class_id === selectedClassId),
    [reports, selectedClassId]
  );

  const averageProgress = useMemo(() => {
    if (selectedReports.length === 0) {
      return 0;
    }

    const total = selectedReports.reduce((sum, item) => sum + (item.progress_percent ?? 0), 0);
    return Math.round(total / selectedReports.length);
  }, [selectedReports]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-3 border-b border-slate-800 pb-6">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-300">Progress Reports</p>
          <h1 className="text-3xl font-semibold tracking-tight">Review class progress with Supabase data</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            This page keeps the original reporting surface but removes the malformed import line that was stopping your Next.js build.
          </p>
        </header>

        {error ? <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div> : null}

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading progress reports...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex items-center gap-3 text-slate-300">
                <GraduationCap className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-[0.25em]">Classes</span>
              </div>

              <div className="mt-4 grid gap-2">
                {classes.length === 0 ? (
                  <p className="text-sm text-slate-400">No classes are available yet.</p>
                ) : (
                  classes.map((item) => {
                    const label = item.name ?? item.title ?? 'Untitled class';

                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedClassId(item.id)}
                        className={
                          'rounded-2xl border px-4 py-3 text-left transition ' +
                          (selectedClassId === item.id
                            ? 'border-indigo-500 bg-indigo-500/10 text-white'
                            : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600 hover:bg-slate-900')
                        }
                      >
                        <div className="font-medium">{label}</div>
                        <div className="text-sm text-slate-400">{item.grade ?? 'Grade N/A'}{item.subject ? ' · ' + item.subject : ''}</div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <BarChart className="h-4 w-4" />
                    <span className="text-sm font-semibold uppercase tracking-[0.25em]">Report summary</span>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{selectedClass ? selectedClass.name ?? selectedClass.title ?? 'Selected class' : 'Select a class'}</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    {selectedClass ? 'Average progress across stored reports: ' + averageProgress + '%' : 'Choose a class to inspect its latest reports.'}
                  </p>
                </div>

                {selectedClass ? (
                  <Link href={'/my-classes/' + selectedClass.id} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-indigo-500 hover:bg-slate-900">
                    Open class
                  </Link>
                ) : null}
              </div>

              <div className="mt-6 grid gap-3">
                {selectedReports.length === 0 ? (
                  <p className="text-sm text-slate-400">No progress reports found for this class yet.</p>
                ) : (
                  selectedReports.map((report) => (
                    <article key={report.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-medium text-white">Progress {report.progress_percent ?? 0}%</h3>
                          <p className="text-sm text-slate-400">{report.updated_at ?? report.created_at ?? 'Recently updated'}</p>
                        </div>
                        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{report.progress_percent ?? 0}%</span>
                      </div>
                      {report.summary ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{report.summary}</p> : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
