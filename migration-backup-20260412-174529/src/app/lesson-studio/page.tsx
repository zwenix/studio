'use client';

import { FormEvent, useMemo, useState } from 'react';
import { supabase } from '@/lib/content-storage';

const PHASE_GROUPS = {
  'Foundation Phase': ['1', '2', '3'],
  'Intermediate Phase': ['4', '5', '6'],
  'Senior Phase': ['7', '8', '9'],
} as const;

type Phase = keyof typeof PHASE_GROUPS;

export default function LessonStudioPage() {
  const [phase, setPhase] = useState<Phase>('Foundation Phase');
  const [grade, setGrade] = useState('1');
  const [topic, setTopic] = useState('Photosynthesis');
  const [loading, setLoading] = useState(false);
  const [lessonPlan, setLessonPlan] = useState('');
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const availableGrades = useMemo(() => PHASE_GROUPS[phase], [phase]);

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSaveStatus('');

    try {
      const response = await fetch('/api/lesson-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, phase, grade }),
      });

      if (!response.ok) {
        throw new Error('Lesson generation failed with status ' + response.status + '.');
      }

      const data = (await response.json()) as { content?: string; provider?: string };
      const content = data.content ?? '';

      setLessonPlan(content);

      const { error: saveError } = await supabase.from('lessons').insert([
        {
          topic,
          phase,
          grade,
          content,
          provider: data.provider ?? 'unknown',
          created_at: new Date().toISOString(),
        },
      ]);

      if (saveError) {
        setSaveStatus('Generated content, but Supabase save failed: ' + saveError.message);
      } else {
        setSaveStatus('Generated and saved to Supabase successfully.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected lesson studio error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-300">Lesson Studio</p>
          <h1 className="text-3xl font-semibold tracking-tight">Generate lesson plans with Anthropic and Groq failover</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            This page submits lesson requests to your Next.js API route and stores successful generations in Supabase.
          </p>
        </header>

        <form onSubmit={handleGenerate} className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl shadow-slate-950/30">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Phase</span>
              <select
                value={phase}
                onChange={(event) => {
                  const nextPhase = event.target.value as Phase;
                  setPhase(nextPhase);
                  setGrade(PHASE_GROUPS[nextPhase][0]);
                }}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500"
              >
                {Object.keys(PHASE_GROUPS).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Grade</span>
              <select
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500"
              >
                {availableGrades.map((item) => (
                  <option key={item} value={item}>
                    Grade {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm md:col-span-1">
              <span className="text-slate-300">Topic</span>
              <input
                type="text"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Photosynthesis"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || topic.trim().length === 0}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Lesson Plan'}
          </button>
        </form>

        {error ? (
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div>
        ) : null}

        {saveStatus ? (
          <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 p-4 text-sm text-emerald-200">{saveStatus}</div>
        ) : null}

        {lessonPlan ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Generated Lesson Plan</h2>
            <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{lessonPlan}</pre>
          </section>
        ) : null}
      </div>
    </main>
  );
}
