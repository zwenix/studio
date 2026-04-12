# ============================================================
#  QUICK FIX — Paste this ENTIRE block into PowerShell
#  at C:\studio\  (run as Administrator if possible)
#
#  It will:
#    1. Back up files to .\migration-backup\
#    2. Fix all 5 broken files
#    3. Delete src\genkit.ts
#    4. Create the missing API route
# ============================================================

$ErrorActionPreference = "Stop"
Set-Location "C:\studio"

# ── Backup ──
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$bk = ".\migration-backup-$ts"
@(
  "src\lib\content-storage.ts",
  "src\ai\flows\generate-admin-docs.ts",
  "src\ai\flows\generate-visual-aids.ts",
  "src\ai\flows\generate-lesson-studio.ts",
  "src\app\lesson-studio\page.tsx",
  "src\genkit.ts"
) | ForEach-Object {
  if (Test-Path $_) {
    $d = Join-Path $bk $_
    New-Item -ItemType Directory -Path (Split-Path $d -Parent) -Force | Out-Null
    Copy-Item $_ $d
    Write-Host "  backed up  $_" -ForegroundColor DarkGray
  }
}

# ── FIX 1: content-storage.ts ──
Write-Host "`n[1/6] Fixing src/lib/content-storage.ts" -ForegroundColor Cyan
@'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'generated-content';
const INLINE_THRESHOLD_BYTES = 700 * 1024;

export interface SaveResult {
  inlineContent: string;
  contentStorageUrl: string | undefined;
  usedStorage: boolean;
  byteSize: number;
}

export async function saveContentSafely(
  html: string,
  storagePath: string,
): Promise<SaveResult> {
  const encoder = new TextEncoder();
  const byteSize = encoder.encode(html).length;

  if (byteSize <= INLINE_THRESHOLD_BYTES) {
    return { inlineContent: html, contentStorageUrl: undefined, usedStorage: false, byteSize };
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, html, { contentType: 'text/html; charset=utf-8', upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);
  return { inlineContent: '', contentStorageUrl: urlData.publicUrl, usedStorage: true, byteSize };
}

export async function resolveContent(
  inlineContent: string,
  contentStorageUrl: string | undefined,
): Promise<string> {
  if (!contentStorageUrl) return inlineContent;
  try {
    const res = await fetch(contentStorageUrl);
    if (!res.ok) throw new Error(`Storage fetch failed: ${res.status}`);
    return await res.text();
  } catch {
    return inlineContent || '<p style="color:red;">Content temporarily unavailable.</p>';
  }
}
'@ | Set-Content "src\lib\content-storage.ts" -Encoding UTF8

# ── FIX 2: generate-admin-docs.ts ──
Write-Host "[2/6] Fixing src/ai/flows/generate-admin-docs.ts" -ForegroundColor Cyan
@'
'use server';

import { generateJSON } from '@/lib/ai';
import { z } from 'zod';

export const AdminDocInputSchema = z.object({
  documentType: z.string().describe('e.g. "Letter to Parents", "Permission Slip", "General Notice"'),
  schoolName: z.string().optional(),
  principalName: z.string().optional(),
  teacherName: z.string().optional(),
  grade: z.string().optional(),
  subject: z.string().optional(),
  date: z.string().optional(),
  language: z.string().optional().default('English'),
  recipientType: z.string().optional().describe('e.g. "Parents", "Learners", "Staff"'),
  purpose: z.string().describe('What this document is for'),
  keyPoints: z.string().optional(),
  tone: z.string().optional().default('formal'),
  includeSignatureLine: z.boolean().optional().default(true),
  includeReplySlip: z.boolean().optional().default(false),
  additionalInstructions: z.string().optional(),
});

export type AdminDocInput = z.infer<typeof AdminDocInputSchema>;
export type AdminDocOutput = { content: string; documentType: string; notes: string };

const ADMIN_SYSTEM_PROMPT = `You are Thandile Yawa, a highly experienced South African school secretary.
Return ONLY valid JSON: { "content": "<HTML with inline styles>", "notes": "brief notes" }
No code fences, no markdown. HTML must use ONLY inline styles.`;

export async function generateAdminDoc(input: AdminDocInput): Promise<AdminDocOutput> {
  const userPrompt = `Create a ${input.documentType}:
School: ${input.schoolName || '[School Name]'}
Principal: ${input.principalName || '[Principal Name]'}
Teacher: ${input.teacherName || '[Teacher Name]'}
Grade: ${input.grade || 'All grades'}
Subject: ${input.subject || 'N/A'}
Date: ${input.date || '[Date]'}
Language: ${input.language}
Recipients: ${input.recipientType || 'Parents/Guardians'}
Purpose: ${input.purpose}
Key Points: ${input.keyPoints || 'Standard points'}
Tone: ${input.tone}
Signature Line: ${input.includeSignatureLine ? 'Yes' : 'No'}
Reply Slip: ${input.includeReplySlip ? 'Yes' : 'No'}
Additional: ${input.additionalInstructions || 'None'}

Return ONLY JSON: { "content": "<complete HTML>", "notes": "brief notes" }`;

  const output = await generateJSON<{ content: string; notes: string }>(
    userPrompt, ADMIN_SYSTEM_PROMPT, { maxTokens: 8192, temperature: 0.65 },
  );

  return {
    content: output.content || '<p>Document generation returned empty.</p>',
    documentType: input.documentType,
    notes: output.notes || 'Review before printing.',
  };
}
'@ | Set-Content "src\ai\flows\generate-admin-docs.ts" -Encoding UTF8

# ── FIX 3: generate-visual-aids.ts ──
Write-Host "[3/6] Fixing src/ai/flows/generate-visual-aids.ts" -ForegroundColor Cyan
@'
'use server';

import { generateJSON } from '@/lib/ai';
import { z } from 'zod';

export const VisualAidInputSchema = z.object({
  visualType: z.string(),
  grade: z.string(),
  subject: z.string(),
  topic: z.string(),
  language: z.string().optional().default('English'),
  colorScheme: z.string().optional(),
  style: z.string().optional(),
  specificContent: z.string().optional(),
  quantity: z.string().optional(),
  size: z.string().optional(),
  additionalInstructions: z.string().optional(),
  generateImage: z.boolean().optional().default(false),
});

export type VisualAidInput = z.infer<typeof VisualAidInputSchema>;
export type VisualAidOutput = {
  content: string;
  printInstructions: string;
  imageDataUri?: string;
  description: string;
};

const VISUAL_SYSTEM = `You create stunning educational visual aids using pure HTML with inline styles.
Return ONLY valid JSON: { "content": "<HTML>", "printInstructions": "...", "description": "..." }
No code fences, no markdown. Inline styles only.`;

export async function generateVisualAid(input: VisualAidInput): Promise<VisualAidOutput> {
  const userPrompt = `Create a ${input.visualType}:
Grade: ${input.grade} | Subject: ${input.subject} | Topic: ${input.topic}
Language: ${input.language} | Colors: ${input.colorScheme || 'vibrant'}
Style: ${input.style || 'modern educational'} | Size: ${input.size || 'A4'}
Content: ${input.specificContent || 'All key concepts'}
Quantity: ${input.quantity || 'appropriate'}
Additional: ${input.additionalInstructions || 'None'}

Return ONLY JSON: { "content": "<HTML>", "printInstructions": "...", "description": "..." }`;

  const output = await generateJSON<{ content: string; printInstructions: string; description: string }>(
    userPrompt, VISUAL_SYSTEM, { maxTokens: 8192, temperature: 0.8 },
  );

  return {
    content: output.content || '<p>Visual aid returned empty.</p>',
    printInstructions: output.printInstructions || 'Print on A4.',
    description: output.description || 'Educational visual aid.',
  };
}
'@ | Set-Content "src\ai\flows\generate-visual-aids.ts" -Encoding UTF8

# ── FIX 4: generate-lesson-studio.ts ──
Write-Host "[4/6] Fixing src/ai/flows/generate-lesson-studio.ts" -ForegroundColor Cyan
@'
import { generateJSON } from '@/lib/ai';
import { buildLessonStudioPrompt } from '@/ai/prompts';
import { z } from 'zod';

export const LessonPlanSchema = z.object({
  title: z.string(),
  description: z.string(),
  sections: z.array(z.object({ title: z.string(), content: z.string() })),
});

export type LessonPlan = z.infer<typeof LessonPlanSchema>;
export type LessonStudioInput = { grade: string; subject: string; topic: string; lessonType: string };

export async function generateLessonStudioFlow(input: LessonStudioInput): Promise<LessonPlan> {
  const { grade, subject, topic, lessonType } = input;
  const promptParams = buildLessonStudioPrompt({
    grade, subject, topic, notes: `Lesson Type: ${lessonType}`,
  });

  const output = await generateJSON<LessonPlan>(
    promptParams.userPrompt, promptParams.systemInstruction,
    { maxTokens: 8192, temperature: 0.7 },
  );

  if (!output || !output.sections) {
    throw new Error('Failed to generate lesson plan.');
  }
  return output;
}
'@ | Set-Content "src\ai\flows\generate-lesson-studio.ts" -Encoding UTF8

# ── FIX 5: lesson-studio/page.tsx ──
Write-Host "[5/6] Patching src/app/lesson-studio/page.tsx" -ForegroundColor Cyan
$page = "src\app\lesson-studio\page.tsx"
if (Test-Path $page) {
  $c = Get-Content $page -Raw -Encoding UTF8
  # Remove broken import
  $c = $c -replace "import \{ collection, addDoc, serverTimestamp \}.*", "// Firebase imports removed — migrated to Supabase"
  # Remove useFirestore
  $c = $c -replace "const firestore = useFirestore\(\);", "// Firebase removed — using Supabase"
  # Replace user.uid with user.id
  $c = $c -replace "user\.uid", "user.id"
  Set-Content $page -Value $c -Encoding UTF8 -NoNewline
  Write-Host "  Patched page.tsx — check the save-to-archive function manually" -ForegroundColor Yellow
} else {
  Write-Host "  WARNING: $page not found!" -ForegroundColor Red
}

# ── FIX 6: Delete genkit.ts ──
Write-Host "[6/6] Deleting src/genkit.ts" -ForegroundColor Cyan
if (Test-Path "src\genkit.ts") {
  Remove-Item "src\genkit.ts" -Force
  Write-Host "  Deleted." -ForegroundColor Green
} else {
  Write-Host "  Already gone." -ForegroundColor DarkGray
}

# ── Create API route ──
Write-Host "`n[+] Creating src/app/api/lesson-studio/save/route.ts" -ForegroundColor Cyan
New-Item -ItemType Directory -Path "src\app\api\lesson-studio\save" -Force | Out-Null
@'
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error } = await supabase.from('generated_content').insert({
      teacher_id: body.teacherId,
      grade: body.grade,
      subject: body.subject,
      topic: body.topic,
      content_type: body.contentType,
      content: body.content,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
'@ | Set-Content "src\app\api\lesson-studio\save\route.ts" -Encoding UTF8

# ── Done ──
Write-Host "`n══════════════════════════════════════════════════" -ForegroundColor White
Write-Host "  ALL FIXES APPLIED!" -ForegroundColor Green
Write-Host "══════════════════════════════════════════════════" -ForegroundColor White
Write-Host "`n  Backups: $bk"
Write-Host "`n  Next steps:" -ForegroundColor Yellow
Write-Host "    1. npm uninstall genkit @genkit-ai/google-genai genkitx-groq firebase"
Write-Host "    2. npm install @supabase/supabase-js @anthropic-ai/sdk groq-sdk"
Write-Host "    3. npm run build"
Write-Host "    4. git add -A && git commit -m 'fix: resolve build errors' && git push"
Write-Host ""
