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

const auditRules = [
  { label: 'firebase/storage', regex: /firebase\/storage/ },
  { label: 'firebase/auth', regex: /firebase\/auth/ },
  { label: 'firebase/firestore', regex: /firebase\/firestore/ },
  { label: 'genkit', regex: /\bgenkit\b/ },
  { label: 'broken firebase comment', regex: /\/\/\s*firebase\/(storage|auth|firestore) removed - migrated to Supabase;/ },
];

async function walkSourceFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await walkSourceFiles(absolutePath)));
      continue;
    }

    if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      results.push(absolutePath);
    }
  }

  return results;
}

async function auditSourceTree() {
  const srcRoot = path.join(root, 'src');

  try {
    await fs.access(srcRoot);
  } catch {
    return [];
  }

  const files = await walkSourceFiles(srcRoot);
  const findings = [];

  for (const absolutePath of files) {
    const content = await fs.readFile(absolutePath, 'utf8');
    const matches = auditRules.filter((rule) => rule.regex.test(content)).map((rule) => rule.label);

    if (matches.length > 0) {
      findings.push({
        path: path.relative(root, absolutePath),
        matches,
      });
    }
  }

  return findings;
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

type UploadInput = File | Blob | ArrayBuffer | string;

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

function toBlob(file: UploadInput): Blob {
  if (typeof file === 'string') {
    return new Blob([file], { type: 'text/plain' });
  }

  if (file instanceof Blob) {
    return file;
  }

  return new Blob([file]);
}

export const supabase = createLazyProxy(getSupabaseClient) as SupabaseClient;
export const storage = createLazyProxy(() => getSupabaseClient().storage) as SupabaseClient['storage'];

export async function uploadContent(
  bucket: string,
  path: string,
  file: UploadInput,
  options: UploadOptions = {}
): Promise<string> {
  const client = getSupabaseClient();
  const blob = toBlob(file);
  const { error } = await client.storage.from(bucket).upload(path, blob, {
    cacheControl: options.cacheControl ?? '3600',
    upsert: options.upsert ?? true,
    contentType: options.contentType || blob.type || undefined,
  });

  if (error) {
    throw new Error('Failed to upload to Supabase Storage: ' + error.message);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function saveContentSafely(
  bucket: string,
  path: string,
  file: UploadInput,
  options: UploadOptions = {}
): Promise<string> {
  return uploadContent(bucket, path, file, options);
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
    path: 'src/lib/supabase/client.ts',
    content: `import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let supabaseInstance: SupabaseClient | null = null;

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

export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

export const supabase = createLazyProxy(getSupabaseClient) as SupabaseClient;
export default supabase;
`
  },
  {
    path: 'src/lib/supabase/index.ts',
    content: `'use client';

import { useEffect, useMemo, useState, type DependencyList } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { deleteContent, getContentUrl, saveContentSafely, uploadContent } from '@/lib/content-storage';
import { getSupabaseClient, supabase } from './client';

type AsyncResource<T> = {
  data: T;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

type AuthState = {
  client: ReturnType<typeof getSupabaseClient>;
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
};

function buildStaticResource<T>(data: T): AsyncResource<T> {
  return {
    data,
    loading: false,
    error: null,
    refetch: async () => {},
  };
}

export function useAuth(): AuthState {
  const client = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    client.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) {
          return;
        }

        if (sessionError) {
          setError(sessionError);
        }

        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);
      })
      .catch((thrown) => {
        if (!active) {
          return;
        }

        setError(thrown instanceof Error ? thrown : new Error('Unable to load auth session.'));
        setLoading(false);
      });

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  return {
    client,
    session,
    user,
    loading,
    error,
  };
}

export function useUser(): AuthState {
  return useAuth();
}

export function useFirestore() {
  return getSupabaseClient();
}

export function useStorage() {
  const client = getSupabaseClient();

  return {
    storage: client.storage,
    uploadContent,
    saveContentSafely,
    deleteContent,
    getContentUrl,
  };
}

export function useCollection<T = unknown>(..._args: unknown[]): AsyncResource<T[]> {
  return useMemo(() => buildStaticResource<T[]>([]), []);
}

export function useDoc<T = unknown>(..._args: unknown[]): AsyncResource<T | null> {
  return useMemo(() => buildStaticResource<T | null>(null), []);
}

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  return useMemo(factory, deps);
}

export { getSupabaseClient, supabase };
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
export const generateLessonStudioFlow = generateLessonStudio;
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
  {
    path: 'src/app/my-classes/page.tsx',
    content: `'use client';

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
`,
  },
  {
    path: 'src/app/my-classes/new/page.tsx',
    content: `'use client';

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
`,
  },
  {
    path: 'src/app/my-classes/[classId]/page.tsx',
    content: `'use client';

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
`,
  },
  {
    path: 'src/app/ocr/page.tsx',
    content: `'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FileText, Loader2, ScanSearch, Upload } from 'lucide-react';
import { supabase } from '@/lib/content-storage';

type OcrRecord = {
  id: string;
  file_name?: string;
  extracted_text?: string;
  status?: string;
  created_at?: string;
};

export default function OcrPage() {
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [notes, setNotes] = useState('');
  const [uploads, setUploads] = useState<OcrRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadUploads() {
      const { data, error: loadError } = await supabase
        .from('ocr_uploads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!active) {
        return;
      }

      if (loadError) {
        setError(loadError.message);
        setUploads([]);
      } else {
        setUploads((data ?? []) as OcrRecord[]);
      }

      setLoading(false);
    }

    loadUploads();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError('Please choose a file to process.');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentName', documentName);
    formData.append('notes', notes);

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('OCR request failed with status ' + response.status + '.');
      }

      const payload = (await response.json()) as { extractedText?: string; status?: string };

      const record = {
        file_name: documentName || file.name,
        extracted_text: payload.extractedText ?? '',
        status: payload.status ?? 'processed',
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from('ocr_uploads').insert([record]);

      if (insertError) {
        setError(insertError.message);
      } else {
        setSuccess('OCR upload processed successfully.');
        setUploads((current) => [record as OcrRecord, ...current]);
        setFile(null);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'OCR upload failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-3 border-b border-slate-800 pb-6">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-300">OCR</p>
          <h1 className="text-3xl font-semibold tracking-tight">Upload images and store OCR output in Supabase</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            The syntax error is gone and this page now uses a clean upload flow instead of the broken Firebase-specific imports.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Document name</span>
              <input value={documentName} onChange={(event) => setDocumentName(event.target.value)} placeholder="Grade 4 worksheet" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500" />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">File</span>
              <input type="file" accept="image/*,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500" />
            </label>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Notes</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Optional notes for the OCR request." className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500" />
          </label>

          {error ? <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div> : null}
          {success ? <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 p-4 text-sm text-emerald-200">{success}</div> : null}

          <button type="submit" disabled={processing || !file} className="inline-flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            {processing ? 'Processing...' : 'Run OCR'}
          </button>
        </form>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center gap-3 text-slate-300">
            <Upload className="h-4 w-4" />
            <h2 className="text-lg font-semibold text-white">Recent uploads</h2>
          </div>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading OCR history...
              </div>
            ) : uploads.length === 0 ? (
              <p className="text-sm text-slate-400">No OCR uploads found yet.</p>
            ) : (
              uploads.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-white">{item.file_name ?? 'Untitled upload'}</h3>
                      <p className="text-sm text-slate-400">{item.status ?? 'processed'}</p>
                    </div>
                    <FileText className="h-4 w-4 text-slate-500" />
                  </div>
                  {item.extracted_text ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.extracted_text}</p> : null}
                </article>
              ))
            )}
          </div>

          <Link href="/my-classes" className="mt-5 inline-flex text-sm text-indigo-300 transition hover:text-indigo-200">
            View classes
          </Link>
        </section>
      </div>
    </main>
  );
}
`,
  },
  {
    path: 'src/app/progress-reports/page.tsx',
    content: `'use client';

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
`,
  },
  {
    path: 'src/app/role-selection/page.tsx',
    content: `'use client';

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
`,
  },
  {
    path: 'src/app/settings/page.tsx',
    content: `'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Bot, Camera, Cog, Loader2, Save, User, Building } from 'lucide-react';
import { supabase } from '@/lib/content-storage';

type ProfileRecord = {
  id: string;
  full_name?: string;
  school_name?: string;
  bio?: string;
  role?: string;
  avatar_url?: string;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [bio, setBio] = useState('');
  const [role, setRole] = useState('teacher');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (authError || !authData.user) {
        setError('Please sign in to manage settings.');
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
      } else if (profileData) {
        const profile = profileData as ProfileRecord;
        setFullName(profile.full_name ?? authData.user.user_metadata?.full_name ?? '');
        setSchoolName(profile.school_name ?? '');
        setBio(profile.bio ?? '');
        setRole(profile.role ?? 'teacher');
        setAvatarUrl(profile.avatar_url ?? '');
      } else {
        setFullName(authData.user.user_metadata?.full_name ?? '');
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setError('You must be signed in to save settings.');
      setSaving(false);
      return;
    }

    let nextAvatarUrl = avatarUrl;

    try {
      if (avatarFile) {
        const filePath = 'avatars/' + authData.user.id + '/' + Date.now() + '-' + avatarFile.name;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        nextAvatarUrl = data.publicUrl;
      }

      const { error: profileError } = await supabase.from('profiles').upsert([
        {
          id: authData.user.id,
          full_name: fullName,
          school_name: schoolName,
          bio,
          role,
          avatar_url: nextAvatarUrl,
          updated_at: new Date().toISOString(),
        },
      ]);

      if (profileError) {
        throw new Error(profileError.message);
      }

      const { error: updateUserError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          school_name: schoolName,
          bio,
          role,
          avatar_url: nextAvatarUrl,
        },
      });

      if (updateUserError) {
        throw new Error(updateUserError.message);
      }

      setAvatarUrl(nextAvatarUrl);
      setMessage('Settings saved successfully.');
      setAvatarFile(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="space-y-3 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-sm text-indigo-300">
            <Cog className="h-4 w-4" />
            <span>Settings</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Profile and workspace settings</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            This page replaces the broken Firebase profile update path with direct Supabase auth and storage updates.
          </p>
        </header>

        {error ? <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div> : null}
        {message ? <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 p-4 text-sm text-emerald-200">{message}</div> : null}

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading profile...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Avatar</p>
                    <p className="text-sm text-white">Upload a new profile image</p>
                  </div>
                </div>

                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile avatar" className="h-40 w-full rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-sm text-slate-500">
                    No avatar uploaded yet
                  </div>
                )}

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-200 transition hover:border-indigo-500 hover:bg-slate-900">
                  <Camera className="h-4 w-4" />
                  <span>{avatarFile ? avatarFile.name : 'Choose avatar file'}</span>
                  <input type="file" accept="image/*" onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)} className="hidden" />
                </label>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Bot className="h-4 w-4" />
                  Supabase Storage bucket: avatars
                </div>
              </div>

              <div className="grid gap-4">
                <label className="grid gap-2 text-sm">
                  <span className="text-slate-300">Full name</span>
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
                </label>

            <label className="grid gap-2 text-sm">
              <span className="flex items-center gap-2 text-slate-300"><Building className="h-4 w-4" />School name</span>
                  <input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="text-slate-300">Role</span>
                  <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500">
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="text-slate-300">Bio</span>
                  <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={5} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save settings'}
              </button>

              <Link href="/" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
`,
  },
  {
    path: 'src/app/signup/page.tsx',
    content: `'use client';

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
`,
  },
  {
    path: 'src/app/students/page.tsx',
    content: `'use client';

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
`,
  },
];

for (const file of files) {
  await writeFile(file.path, file.content);
}

const findings = await auditSourceTree();

if (findings.length > 0) {
  console.warn('Residual migration markers were found in source files:');

  for (const finding of findings) {
    console.warn(`- ${finding.path}: ${finding.matches.join(', ')}`);
  }
} else {
  console.log('Audit passed: no leftover Firebase or Genkit markers found in src/.');
}

console.log('Migration fixes written successfully.');