#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

async function writeFile(relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  try {
    const existing = await fs.readFile(absolutePath, 'utf8');
    await fs.writeFile(`${absolutePath}.bak`, existing, 'utf8');
  } catch {
    // No existing file to back up.
  }

  await fs.writeFile(absolutePath, content.trimEnd() + '\n', 'utf8');
  console.log(`Wrote ${relativePath}`);
}

const files = [
  {
    path: 'src/lib/content-storage.ts',
    content: `import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

type UploadOptions = {
  cacheControl?: string;
  upsert?: boolean;
  contentType?: string;
};

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

function createLazyProxy<T extends object>(getTarget: () => T): T {
  const handler: ProxyHandler<T> = {
    get(_target, prop, receiver) {
      const target = getTarget();
      const value = Reflect.get(target as object, prop, receiver);

      if (typeof value === 'function') {
        return value.bind(target);
      }

      return value;
    },
  };

  return new Proxy({} as T, handler);
}

export const supabase = createLazyProxy(getSupabaseClient) as SupabaseClient;
export const storage = createLazyProxy(() => getSupabaseClient().storage) as SupabaseClient['storage'];

export async function uploadContent(
  bucket: string,
  path: string,
  file: File | Blob,
  options: UploadOptions = {}
): Promise<string> {
  const client = getSupabaseClient();
  const { error } = await client.storage.from(bucket).upload(path, file, {
    cacheControl: options.cacheControl ?? '3600',
    upsert: options.upsert ?? true,
    contentType: options.contentType,
  });

  if (error) {
    throw new Error('Failed to upload to Supabase Storage: ' + error.message);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function getContentUrl(bucket: string, path: string): string {
  const client = getSupabaseClient();
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export const getPublicUrl = getContentUrl;

export async function deleteContent(bucket: string, pathOrPaths: string | string[]): Promise<void> {
  const client = getSupabaseClient();
  const paths = Array.isArray(pathOrPaths) ? pathOrPaths : [pathOrPaths];
  const { error } = await client.storage.from(bucket).remove(paths);

  if (error) {
    throw new Error('Delete failed: ' + error.message);
  }
}

export default supabase;
`
  },
  {
    path: 'src/ai/flows/generate-caps-content.ts',
    content: `import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

export interface CAPSInput {
  grade: string;
  subject: string;
  topic: string;
  duration?: string;
}

export const CAPSInputSchema = {
  type: 'object',
  properties: {
    grade: { type: 'string' },
    subject: { type: 'string' },
    topic: { type: 'string' },
    duration: { type: 'string' },
  },
  required: ['grade', 'subject', 'topic'],
  additionalProperties: false,
};

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY.');
  }

  return new Anthropic({ apiKey });
}

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY.');
  }

  return new Groq({ apiKey });
}

function buildPrompt(input: CAPSInput) {
  const durationText = input.duration ? ' for ' + input.duration : '';

  return 'Create a detailed South African CAPS-aligned lesson plan for Grade ' +
    input.grade +
    ' ' +
    input.subject +
    ' covering ' +
    input.topic +
    durationText +
    '. Include learning objectives, introduction, main activity, assessment, and differentiation.';
}

function extractAnthropicText(content: Array<{ type: string; text?: string }>) {
  const textBlock = content.find((block) => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text ?? 'No content generated.' : 'No content generated.';
}

async function runAnthropic(prompt: string) {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  return extractAnthropicText(response.content as Array<{ type: string; text?: string }>);
}

async function runGroq(prompt: string) {
  const client = getGroqClient();
  const response = await client.chat.completions.create({
    model: 'llama3-70b-8192',
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.choices[0]?.message?.content;
  return typeof content === 'string' && content.length > 0 ? content : 'No content generated.';
}

export async function generateCAPSContent(input: CAPSInput) {
  const prompt = buildPrompt(input);

  try {
    return {
      provider: 'Anthropic',
      content: await runAnthropic(prompt),
    };
  } catch (error) {
    console.warn('Anthropic primary generation failed. Falling back to Groq.', error);

    return {
      provider: 'Groq',
      content: await runGroq(prompt),
    };
  }
}

export const generateCapsContent = generateCAPSContent;
export default generateCAPSContent;
`
  },
  {
    path: 'src/ai/flows/generate-visual-aids.ts',
    content: `import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

export const VisualAidInputSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    targetAudience: { type: 'string' },
    format: { type: 'string' },
  },
  required: ['topic', 'targetAudience', 'format'],
  additionalProperties: false,
};

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY.');
  }

  return new Anthropic({ apiKey });
}

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY.');
  }

  return new Groq({ apiKey });
}

function buildPrompt(input: { topic: string; targetAudience: string; format: string }) {
  return 'Generate highly descriptive visual aid concepts and graphic organiser instructions for the topic: ' +
    input.topic +
    ', tailored for ' +
    input.targetAudience +
    ' using the format: ' +
    input.format +
    '.';
}

function extractAnthropicText(content: Array<{ type: string; text?: string }>) {
  const textBlock = content.find((block) => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text ?? 'Failed to generate visual aid.' : 'Failed to generate visual aid.';
}

export async function generateVisualAid(input: { topic: string; targetAudience: string; format: string }) {
  const prompt = buildPrompt(input);

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      provider: 'Anthropic',
      content: extractAnthropicText(response.content as Array<{ type: string; text?: string }>),
    };
  } catch (error) {
    console.warn('Anthropic Visual Aid generation failed. Using Groq fallback.', error);

    const client = getGroqClient();
    const response = await client.chat.completions.create({
      model: 'mixtral-8x7b-32768',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message?.content;
    return {
      provider: 'Groq',
      content: typeof content === 'string' && content.length > 0 ? content : 'Failed to generate visual aid.',
    };
  }
}

export const generateVisualAids = generateVisualAid;
export default generateVisualAid;
`
  },
  {
    path: 'src/ai/flows/generate-admin-docs.ts',
    content: `import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

export const AdminDocInputSchema = {
  type: 'object',
  properties: {
    docType: { type: 'string' },
    schoolContext: { type: 'string' },
    specificDetails: { type: 'string' },
  },
  required: ['docType', 'schoolContext'],
  additionalProperties: false,
};

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY.');
  }

  return new Anthropic({ apiKey });
}

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY.');
  }

  return new Groq({ apiKey });
}

function buildPrompt(input: { docType: string; schoolContext: string; specificDetails: string }) {
  return 'Draft a professional school administrative document. Type: ' +
    input.docType +
    '. Context: ' +
    input.schoolContext +
    '. Details: ' +
    input.specificDetails +
    '. Ensure precise academic tone.';
}

function extractAnthropicText(content: Array<{ type: string; text?: string }>) {
  const textBlock = content.find((block) => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text ?? '' : '';
}

export async function generateAdminDoc(input: { docType: string; schoolContext: string; specificDetails: string }) {
  const prompt = buildPrompt(input);

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      provider: 'Anthropic',
      content: extractAnthropicText(response.content as Array<{ type: string; text?: string }>),
    };
  } catch (error) {
    console.warn('Anthropic failed. Routing to Groq LLM.', error);

    const client = getGroqClient();
    const response = await client.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message?.content;
    return {
      provider: 'Groq',
      content: typeof content === 'string' && content.length > 0 ? content : '',
    };
  }
}

export const generateAdminDocs = generateAdminDoc;
export default generateAdminDoc;
`
  },
  {
    path: 'src/ai/flows/generate-lesson-studio.ts',
    content: `import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

export interface LessonStudioInput {
  topic: string;
  phase: string;
  grade: string;
}

export const LessonStudioInputSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    phase: { type: 'string' },
    grade: { type: 'string' },
  },
  required: ['topic', 'phase', 'grade'],
  additionalProperties: false,
};

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY.');
  }

  return new Anthropic({ apiKey });
}

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY.');
  }

  return new Groq({ apiKey });
}

function buildPrompt(input: LessonStudioInput) {
  return 'Create a CAPS-aligned lesson plan for ' +
    input.phase +
    ' Grade ' +
    input.grade +
    ' on the topic ' +
    input.topic +
    '. Include overview, objectives, materials, activities, assessment, and differentiation.';
}

function extractAnthropicText(content: Array<{ type: string; text?: string }>) {
  const textBlock = content.find((block) => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text ?? 'No lesson content generated.' : 'No lesson content generated.';
}

export async function generateLessonStudio(input: LessonStudioInput) {
  const prompt = buildPrompt(input);

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      provider: 'Anthropic',
      content: extractAnthropicText(response.content as Array<{ type: string; text?: string }>),
    };
  } catch (error) {
    console.warn('Anthropic lesson generation failed. Falling back to Groq.', error);

    const client = getGroqClient();
    const response = await client.chat.completions.create({
      model: 'llama3-70b-8192',
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message?.content;
    return {
      provider: 'Groq',
      content: typeof content === 'string' && content.length > 0 ? content : 'No lesson content generated.',
    };
  }
}

export const generateLessonStudioContent = generateLessonStudio;
export default generateLessonStudio;
`
  },
  {
    path: 'src/app/lesson-studio/page.tsx',
    content: `'use client';

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
`
  },
];

for (const file of files) {
  await writeFile(file.path, file.content);
}

console.log('Migration fixes written successfully.');