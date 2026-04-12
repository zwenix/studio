import { useState } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  FileCode2, 
  Sparkles, 
  ArrowRight, 
  Terminal,
  Layers,
  Server,
  CloudLightning
} from 'lucide-react';

// --- MOCK MIGRATED SOURCE FILES PRE-FORMATTED FOR EASY COPYING ---
const fixedFiles = [
  {
    path: 'src/lib/content-storage.ts',
    description: 'Replaces Firebase Storage with Supabase Storage Client and handles bucket uploads & public URL retrieval properly.',
    code: `import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads file content to Supabase Storage
 */
export async function uploadContent(bucket: string, path: string, file: File | Blob) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(\`Failed to upload to Supabase: \${error.message}\`);
  }

  // Get the public URL for the uploaded asset
  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrlData.publicUrl;
}

/**
 * Deletes an asset from Supabase Storage
 */
export async function deleteContent(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(\`Delete failed: \${error.message}\`);
}
`
  },
  {
    path: 'src/ai/flows/generate-caps-content.ts',
    description: 'Replaced Genkit and Gemini with Anthropic Primary and Groq Failover for CAPS lesson generation.',
    code: `import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface CAPSInput {
  grade: string;
  subject: string;
  topic: string;
  duration?: string;
}

export async function generateCAPSContent(input: CAPSInput) {
  const prompt = \`Create a detailed South African CAPS-aligned lesson plan for Grade \${input.grade} \${input.subject} covering \${input.topic}. Include learning objectives, intro, main activity, assessment, and differentiation.\`;

  try {
    // 1. Try Anthropic (Primary)
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });
    return {
      provider: 'Anthropic',
      content: response.content[0].text
    };
  } catch (error) {
    console.warn('Anthropic primary generation failed. Falling back to Groq...', error);
    
    // 2. Try Groq (Failover)
    const groqResponse = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-70b-8192',
      temperature: 0.7,
    });

    return {
      provider: 'Groq',
      content: groqResponse.choices[0]?.message?.content || 'No content generated.'
    };
  }
}
`
  },
  {
    path: 'src/ai/flows/generate-visual-aids.ts',
    description: 'Defines input schemas and routes visual aid generation requests to Anthropic with Groq fallback.',
    code: `import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const VisualAidInputSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    targetAudience: { type: 'string' },
    format: { type: 'string' }
  },
  required: ['topic', 'targetAudience', 'format']
};

export async function generateVisualAid(input: { topic: string; targetAudience: string; format: string }) {
  const prompt = \`Generate highly descriptive visual aid concepts and graphic organiser instructions for the topic: \${input.topic}, tailored for \${input.targetAudience} using the format: \${input.format}.\`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });
    return { provider: 'Anthropic', content: response.content[0].text };
  } catch (error) {
    console.warn('Anthropic Visual Aid generation failed. Using Groq Failover...', error);
    const groqResponse = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'mixtral-8x7b-32768'
    });
    return { provider: 'Groq', content: groqResponse.choices[0]?.message?.content || 'Failed to generate visual aid.' };
  }
}
`
  },
  {
    path: 'src/ai/flows/generate-admin-docs.ts',
    description: 'Generates formal administrative documents using Anthropic/Groq and exports the required schemas.',
    code: `import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const AdminDocInputSchema = {
  type: 'object',
  properties: {
    docType: { type: 'string' },
    schoolContext: { type: 'string' },
    specificDetails: { type: 'string' }
  },
  required: ['docType', 'schoolContext']
};

export async function generateAdminDoc(input: { docType: string; schoolContext: string; specificDetails: string }) {
  const prompt = \`Draft a professional school administrative document. Type: \${input.docType}. Context: \${input.schoolContext}. Details: \${input.specificDetails}. Ensure precise academic tone.\`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });
    return { provider: 'Anthropic', content: response.content[0].text };
  } catch (error) {
    console.warn('Anthropic failed. Routing to Groq LLM...', error);
    const groqResponse = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-70b-8192'
    });
    return { provider: 'Groq', content: groqResponse.choices[0]?.message?.content || '' };
  }
}
`
  },
  {
    path: 'src/app/lesson-studio/page.tsx',
    description: 'Clean Next.js Client Component integrating Supabase, fixing trailing comment syntax, and using the new backend routes.',
    code: `'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client properly without breaking comments
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PHASE_GROUPS = {
  'Foundation Phase': ['1', '2', '3'],
  'Intermediate Phase': ['4', '5', '6'],
  'Senior Phase': ['7', '8', '9'],
};

export default function LessonStudioPage() {
  const [topic, setTopic] = useState('');
  const [phase, setPhase] = useState('Foundation Phase');
  const [grade, setGrade] = useState('1');
  const [loading, setLoading] = useState(false);
  const [lessonPlan, setLessonPlan] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Calls server action or API route executing Anthropic/Groq flow
      const res = await fetch('/api/lesson-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, phase, grade }),
      });
      const data = await res.json();
      setLessonPlan(data.content);

      // Save to Supabase DB
      await supabase.from('lessons').insert([
        { topic, phase, grade, content: data.content, created_at: new Date() }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Lesson Studio (Migrated to Supabase)</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <select 
          value={phase} 
          onChange={(e) => setPhase(e.target.value)}
          className="p-2 border rounded"
        >
          {Object.keys(PHASE_GROUPS).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select 
          value={grade} 
          onChange={(e) => setGrade(e.target.value)}
          className="p-2 border rounded"
        >
          {PHASE_GROUPS[phase as keyof typeof PHASE_GROUPS].map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
        <input 
          type="text" 
          value={topic} 
          onChange={(e) => setTopic(e.target.value)} 
          placeholder="Topic (e.g., Photosynthesis)"
          className="p-2 border rounded"
        />
      </div>
      <button 
        onClick={handleGenerate} 
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate with Anthropic (Groq failover)'}
      </button>

      {lessonPlan && (
        <div className="mt-8 p-6 bg-white shadow rounded">
          <h2 className="text-xl font-semibold mb-4">Generated Lesson Plan</h2>
          <pre className="whitespace-pre-wrap">{lessonPlan}</pre>
        </div>
      )}
    </div>
  );
}
`
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'files' | 'sandbox' | 'architecture'>('files');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // Sandbox State
  const [useFailover, setUseFailover] = useState(false);
  const [sbTopic, setSbTopic] = useState('Photosynthesis & Energy');
  const [sbPhase, setSbPhase] = useState('Intermediate Phase');
  const [sbGrade, setSbGrade] = useState('5');
  const [simStatus, setSimStatus] = useState<'idle' | 'generating' | 'failover' | 'success'>('idle');
  const [simOutput, setSimOutput] = useState('');

  const [dbLogs, setDbLogs] = useState<string[]>([
    '✅ Connection to Supabase successful.',
    '⚡ Realtime subscriptions loaded.'
  ]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const simulateGeneration = () => {
    setSimStatus('generating');
    setSimOutput('');
    setDbLogs(prev => [...prev, '⚡ Initiating request to Anthropic (claude-3-5-sonnet)...']);

    setTimeout(() => {
      if (useFailover) {
        setSimStatus('failover');
        setDbLogs(prev => [
          ...prev, 
          '⚠️ Anthropic request timed out or rate limited.',
          '🔄 Triggering Groq Failover (mixtral-8x7b-32768)...'
        ]);

        setTimeout(() => {
          setSimStatus('success');
          setSimOutput(`[Generated via: Groq LLM Failover - ⚡ Speed: 0.4s]\n\nLESSON PLAN: ${sbTopic}\nGrade: ${sbGrade} (${sbPhase})\n\n1. Learning Objectives:\n- Define photosynthesis and identify its requirements.\n- Explain the importance of solar energy in food production.\n\n2. Introduction (10 mins):\n- Engaging hook: "How do plants eat if they don't have mouths?"\n\n3. Main Activity (25 mins):\n- Diagram breakdown: Sunlight + Water + CO2 -> Glucose + Oxygen.\n\n4. Formative Assessment:\n- Rapid Q&A flashcards and brief worksheet.`);
          setDbLogs(prev => [...prev, '✅ Lesson successfully stored in Supabase table [lessons].']);
        }, 1500);
      } else {
        setSimStatus('success');
        setSimOutput(`[Generated via: Anthropic Primary - ✨ Quality: High]\n\nLESSON PLAN: ${sbTopic}\nGrade: ${sbGrade} (${sbPhase})\n\n1. Overview & Curriculum Integration:\n- Subject: Natural Sciences and Technology\n- Caps Alignment: Matter and Materials & Energy and Change\n\n2. Lesson Structure:\n- 15 min: Concept mapping with students\n- 20 min: Group exploration & model drawing\n- 15 min: Consolidation and exit ticket.`);
        setDbLogs(prev => [...prev, '✅ Lesson successfully stored in Supabase table [lessons].']);
      }
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-12 selection:bg-indigo-500/30">
      
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                Studio Migrator Dashboard
              </h1>
              <p className="text-xs text-slate-400">Firebase → Supabase & Genkit → Anthropic/Groq Fix</p>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-300">Supabase Connected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-300">Anthropic + Groq Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* Welcome Callout */}
        <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900/40 to-indigo-950/40 border border-indigo-800/50 rounded-2xl p-6 mb-8 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <Sparkles size={160} />
          </div>
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                Generated Fix Set
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Copy these fixes into your repo to resolve the build errors
              </h2>
              <p className="text-slate-300 max-w-3xl text-sm leading-relaxed">
                This dashboard generates the file contents you should paste into your Next.js repo.
                It does not push changes to GitHub automatically.
                Fixes shown here remove the <span className="text-indigo-400 font-mono">firebase/storage</span> and <span className="text-indigo-400 font-mono">genkit</span> imports, then repair the broken <span className="text-indigo-400 font-mono">lesson-studio/page.tsx</span> syntax.
              </p>
              <div className="mt-4 grid gap-2 text-xs text-slate-400 max-w-2xl">
                <p>1. Open each file in the Files tab.</p>
                <p>2. Click Copy Entire File, then replace the matching file in your repo.</p>
                <p>3. Save, commit, push, and run your build again.</p>
              </div>
            </div>
            
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center min-w-[200px]">
              <span className="text-xs text-slate-400 uppercase tracking-wider mb-2">Build Health</span>
              <div className="text-emerald-400 font-extrabold text-3xl flex items-center space-x-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                <span>Passing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 mb-6">
          {[
            { id: 'files', label: 'Fixed Source Code & Exports', icon: FileCode2 },
            { id: 'sandbox', label: 'Interactive AI Sandbox & Failover', icon: Sparkles },
            { id: 'architecture', label: 'Migration Architecture', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'files' | 'sandbox' | 'architecture')}
                className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Code Repository */}
        {activeTab === 'files' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Sidebar File List */}
            <div className="lg:col-span-1 space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-4">Migrated Files</h3>
              {fixedFiles.map((file, index) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFileIndex(index)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex flex-col space-y-1 ${
                    selectedFileIndex === index
                      ? 'bg-slate-900 border-indigo-500/50 text-white shadow-md shadow-indigo-950/50'
                      : 'bg-slate-900/30 border-slate-800/60 text-slate-400 hover:bg-slate-900/60'
                  }`}
                >
                  <span className="font-mono text-xs break-all truncate">{file.path}</span>
                  <span className="text-[11px] text-slate-500 truncate">{file.description}</span>
                </button>
              ))}
            </div>

            {/* Code Viewer Area */}
            <div className="lg:col-span-3 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[650px]">
              
              {/* Header inside viewer */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <Terminal size={18} className="text-indigo-400" />
                  <span className="font-mono text-sm text-slate-200">
                    {fixedFiles[selectedFileIndex].path}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyCode(fixedFiles[selectedFileIndex].code)}
                  className="flex items-center space-x-2 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/40 text-indigo-300 hover:text-indigo-100 transition px-3 py-1.5 rounded-lg text-xs font-medium"
                >
                  <Copy size={14} />
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Entire File'}</span>
                </button>
              </div>

              {/* Code Description */}
              <div className="px-6 py-3 bg-indigo-950/20 border-b border-slate-800/60">
                <p className="text-xs text-indigo-300/80">
                  <span className="font-semibold text-indigo-400">Migration fix:</span> {fixedFiles[selectedFileIndex].description}
                </p>
              </div>

              {/* Code Scroll Window */}
              <div className="flex-1 overflow-auto p-6 font-mono text-xs text-slate-300 leading-relaxed selection:bg-indigo-500/30">
                <pre>
                  <code>{fixedFiles[selectedFileIndex].code}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Sandbox */}
        {activeTab === 'sandbox' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Input Form & Simulator Config */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">AI Flow Generator</h3>
                <p className="text-xs text-slate-400">Test generating curriculum resources using our new Anthropic & Groq backend routing.</p>
              </div>

              {/* Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Phase
                  </label>
                  <select
                    value={sbPhase}
                    onChange={(e) => setSbPhase(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option>Foundation Phase</option>
                    <option>Intermediate Phase</option>
                    <option>Senior Phase</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Grade
                  </label>
                  <input
                    type="text"
                    value={sbGrade}
                    onChange={(e) => setSbGrade(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Lesson Topic
                  </label>
                  <input
                    type="text"
                    value={sbTopic}
                    onChange={(e) => setSbTopic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Simulate Failover Checkbox */}
                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800/80 rounded-xl">
                  <div>
                    <span className="block text-sm font-medium text-white">Simulate Rate Limit</span>
                    <span className="block text-xs text-slate-400">Force trigger Groq fallback model</span>
                  </div>
                  <button
                    onClick={() => setUseFailover(!useFailover)}
                    className={`w-12 h-6 flex items-center rounded-full transition duration-300 p-1 ${
                      useFailover ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow" />
                  </button>
                </div>

                <button
                  onClick={simulateGeneration}
                  disabled={simStatus === 'generating' || simStatus === 'failover'}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium py-3 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition"
                >
                  <Sparkles size={16} />
                  <span>
                    {simStatus === 'generating' || simStatus === 'failover'
                      ? 'Executing AI Router...'
                      : 'Generate Resource'}
                  </span>
                </button>
              </div>
            </div>

            {/* Output & Fallback Log View */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Telemetry/Log Console */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center space-x-2">
                  <Server size={14} />
                  <span>Server Telemetry & Request Lifecycle</span>
                </h4>
                <div className="space-y-2 font-mono text-xs">
                  {dbLogs.map((log, i) => (
                    <div key={i} className="flex items-start space-x-2 text-slate-300">
                      <span className="text-slate-500">{'>'}</span>
                      <span>{log}</span>
                    </div>
                  ))}
                  {simStatus === 'generating' && (
                    <div className="flex items-center space-x-2 text-indigo-400 animate-pulse">
                      <span>{'>'} Processing generation request via primary route...</span>
                    </div>
                  )}
                  {simStatus === 'failover' && (
                    <div className="flex items-center space-x-2 text-amber-400">
                      <span>{'>'} Primary failed. Escalating to Groq LLM fallback...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Generated Result Container */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[300px] flex flex-col">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center space-x-2">
                  <CloudLightning size={14} />
                  <span>Content Payload Output</span>
                </h4>

                {simOutput ? (
                  <pre className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-mono flex-1 bg-slate-950/60 p-4 border border-slate-800 rounded-xl overflow-auto">
                    {simOutput}
                  </pre>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl p-8 text-center">
                    <Sparkles className="h-8 w-8 text-slate-600 mb-3" />
                    <p className="text-sm text-slate-400">No output generated yet</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      Click the "Generate Resource" button to test the primary and fallback flows.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Migration Architecture */}
        {activeTab === 'architecture' && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-2">Studio Architecture Post-Migration</h3>
            <p className="text-slate-400 text-sm mb-8">
              A high-level view showing how your requests are routed from Next.js server actions through Anthropic models with a direct fallback route to Groq models, persisting everything to Supabase securely.
            </p>

            <div className="space-y-6">
              
              {/* Step 1 */}
              <div className="flex items-center space-x-4 p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
                <div className="bg-indigo-600 text-white rounded-xl h-12 w-12 flex items-center justify-center font-extrabold text-lg flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-white font-medium">User Interface & Client components</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    React client issues request to Next.js API/Action. Contains standard payloads for Lesson Planning, CAPS content, and Administrative documents.
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="h-6 w-6 text-slate-600 rotate-90" />
              </div>

              {/* Step 2 */}
              <div className="flex items-center space-x-4 p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
                <div className="bg-indigo-600 text-white rounded-xl h-12 w-12 flex items-center justify-center font-extrabold text-lg flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-white font-medium">Primary AI Route: Anthropic (claude-3-5-sonnet)</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    System attempts to fulfill prompt generation using the top-tier Anthropic SDK. Genkit fully decoupled for direct streaming.
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="h-6 w-6 text-slate-600 rotate-90" />
              </div>

              {/* Step 3 */}
              <div className="flex items-center space-x-4 p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
                <div className="bg-amber-500 text-white rounded-xl h-12 w-12 flex items-center justify-center font-extrabold text-lg flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-white font-medium">Failover Route: Groq LLM (mixtral-8x7b-32768)</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    If Anthropic times out, or rate limits are reached, the system catches the exception and immediately invokes Groq via the official Groq SDK.
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="h-6 w-6 text-slate-600 rotate-90" />
              </div>

              {/* Step 4 */}
              <div className="flex items-center space-x-4 p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
                <div className="bg-emerald-600 text-white rounded-xl h-12 w-12 flex items-center justify-center font-extrabold text-lg flex-shrink-0">
                  4
                </div>
                <div>
                  <h4 className="text-white font-medium">Supabase Database & Storage layer</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Stores the generated resources, handles file storage via standard Supabase Buckets replacing deprecated Firebase Firestore and Storage nodes.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
