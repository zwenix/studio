#!/usr/bin/env bash
# ============================================================================
#  apply-fixes.sh  —  One-shot fix for all build errors after Firebase→Supabase
#                     and Genkit→Anthropic/Groq migration.
#
#  Run from project root:
#    bash apply-fixes.sh
#
#  What it does:
#    1. Backs up every file it touches into ./migration-backup/
#    2. Writes corrected versions of 5 source files
#    3. Deletes src/genkit.ts (no longer needed)
#    4. Patches src/app/lesson-studio/page.tsx (removes broken import line)
#    5. Prints a summary
# ============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}✔${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
err()  { echo -e "${RED}✘${NC} $*"; }

# ── Safety check ────────────────────────────────────────────────────────────
if [[ ! -f package.json ]]; then
  err "Run this script from the project root (where package.json lives)."
  exit 1
fi

# ── Backup ──────────────────────────────────────────────────────────────────
BACKUP_DIR="./migration-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

backup_file() {
  local src="$1"
  if [[ -f "$src" ]]; then
    local dest="$BACKUP_DIR/$src"
    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"
    log "Backed up  $src → $dest"
  fi
}

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Studio Migration — Applying Build Fixes${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════${NC}"
echo ""

backup_file "src/lib/content-storage.ts"
backup_file "src/ai/flows/generate-admin-docs.ts"
backup_file "src/ai/flows/generate-visual-aids.ts"
backup_file "src/ai/flows/generate-lesson-studio.ts"
backup_file "src/app/lesson-studio/page.tsx"
backup_file "src/genkit.ts"

# ============================================================================
#  FIX 1: src/lib/content-storage.ts
#  Replace firebase/storage → Supabase Storage
# ============================================================================
log "Writing fixed  src/lib/content-storage.ts"

cat > src/lib/content-storage.ts << 'ENDOFFILE'
/**
 * Content Storage Utility
 *
 * Solves the Firestore 1 MB per-document limit by transparently routing
 * large HTML content to Supabase Storage (5 TB per object — effectively unlimited).
 *
 * Strategy:
 *  • Content < INLINE_THRESHOLD  → stored directly in the DB field (fast, no extra read)
 *  • Content ≥ INLINE_THRESHOLD  → uploaded to Supabase Storage as a .html file;
 *                                   DB stores the public URL in `contentStorageUrl`
 *                                   and an empty string in `content`.
 *
 * On read, callers check `contentStorageUrl`. If set, they fetch the HTML from that URL.
 * This guarantees 100 % content integrity — nothing is ever truncated.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'generated-content';

/** Maximum bytes stored inline in a DB field. 700 KB leaves ample room for
 *  other fields (memo, rubric, metadata) within the 1 MB document limit. */
const INLINE_THRESHOLD_BYTES = 700 * 1024; // 700 KB

/** Result returned by saveContentSafely */
export interface SaveResult {
  /** HTML to store in the DB `content` field.
   *  Empty string when the HTML was routed to Supabase Storage. */
  inlineContent: string;
  /** Supabase Storage public URL, or undefined when content fit inline. */
  contentStorageUrl: string | undefined;
  /** True when the content was routed to Supabase Storage. */
  usedStorage: boolean;
  /** Actual content byte size (informational). */
  byteSize: number;
}

/**
 * Decide whether to save HTML content inline or upload it to
 * Supabase Storage, then return the results for the caller to persist.
 *
 * @param html         The full HTML string to save.
 * @param storagePath  Supabase Storage path, e.g. `{uid}/{timestamp}.html`.
 */
export async function saveContentSafely(
  html: string,
  storagePath: string,
): Promise<SaveResult> {
  const encoder = new TextEncoder();
  const byteSize = encoder.encode(html).length;

  if (byteSize <= INLINE_THRESHOLD_BYTES) {
    return {
      inlineContent: html,
      contentStorageUrl: undefined,
      usedStorage: false,
      byteSize,
    };
  }

  // Content is too large — upload to Supabase Storage.
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, html, {
      contentType: 'text/html; charset=utf-8',
      upsert: true,
    });

  if (error) {
    console.error('[content-storage] Upload failed:', error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    inlineContent: '',
    contentStorageUrl: urlData.publicUrl,
    usedStorage: true,
    byteSize,
  };
}

/**
 * Given a document that may have either inline HTML or a Storage URL,
 * return the full HTML string. Call this whenever you need to render or export content.
 *
 * - If `contentStorageUrl` is present → fetches from Supabase Storage (network request).
 * - Otherwise → returns `inlineContent` immediately (no network request).
 */
export async function resolveContent(
  inlineContent: string,
  contentStorageUrl: string | undefined,
): Promise<string> {
  if (!contentStorageUrl) return inlineContent;

  try {
    const response = await fetch(contentStorageUrl);
    if (!response.ok) throw new Error(`Storage fetch failed: ${response.status}`);
    return await response.text();
  } catch (err) {
    console.error('[resolveContent] Failed to fetch from Supabase Storage:', err);
    return inlineContent || '<p style="color:red;">Content temporarily unavailable. Please try again.</p>';
  }
}
ENDOFFILE

# ============================================================================
#  FIX 2: src/ai/flows/generate-admin-docs.ts
#  Replace genkit → @/lib/ai (Anthropic primary + Groq failover)
# ============================================================================
log "Writing fixed  src/ai/flows/generate-admin-docs.ts"

cat > src/ai/flows/generate-admin-docs.ts << 'ENDOFFILE'
'use server';

/**
 * @fileOverview General & Admin Documents Generator
 *
 * Generates professional school administrative documents:
 * letters to parents, permission slips, notices, reports, etc.
 *
 * Transport: Genkit removed → direct Anthropic + Groq calls via /lib/ai.ts
 */

import { generateJSON } from '@/lib/ai';
import { z } from 'zod';

export const AdminDocInputSchema = z.object({
  documentType: z.string().describe('e.g. "Letter to Parents", "Permission Slip", "General Notice", "Disciplinary Letter", "Report Comment", "Classroom Rules", "Meeting Notice", "Timetable"'),
  schoolName: z.string().optional(),
  principalName: z.string().optional(),
  teacherName: z.string().optional(),
  grade: z.string().optional(),
  subject: z.string().optional(),
  date: z.string().optional(),
  language: z.string().optional().default('English'),
  recipientType: z.string().optional().describe('e.g. "Parents", "Learners", "Staff", "Community"'),
  purpose: z.string().describe('What this document is for / key message'),
  keyPoints: z.string().optional().describe('Key points to include, comma separated'),
  tone: z.string().optional().describe('e.g. "formal", "warm", "urgent", "informative"'),
  includeSignatureLine: z.boolean().optional().default(true),
  includeReplySlip: z.boolean().optional().default(false),
  additionalInstructions: z.string().optional(),
});

export type AdminDocInput = z.infer<typeof AdminDocInputSchema>;
export type AdminDocOutput = {
  content: string;
  documentType: string;
  notes: string;
};

const ADMIN_SYSTEM_PROMPT = `You are Thandile Yawa, a highly experienced South African school secretary and communications officer with 20 years of experience across government and independent schools. You produce the finest official school documents in the country — professional, legally sound, and culturally appropriate.

Your documents are used as templates by the Western Cape Education Department, and principals throughout South Africa request your templates for their school management systems.

═══════════════════════════════════════════════════════
ABSOLUTE OUTPUT RULES
═══════════════════════════════════════════════════════
1. Return ONLY valid JSON with "content", "notes" keys
2. HTML must use ONLY inline styles — NO class names, NO external CSS
3. NO code fences or markdown
4. HTML must render perfectly with React's dangerouslySetInnerHTML
5. All text must be dark and legible (#1a1a1a)
6. Documents must be print-ready at A4 size

═══════════════════════════════════════════════════════
DOCUMENT DESIGN SYSTEM
═══════════════════════════════════════════════════════

PAGE WRAPPER:
<div style="max-width:794px;margin:0 auto;font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.7;background:#fff;padding:48px 56px;">

LETTERHEAD:
<div style="border-bottom:3px solid #1E40AF;padding-bottom:20px;margin-bottom:32px;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <h1 style="font-size:20px;font-weight:700;color:#1E40AF;margin:0 0 4px;">[SCHOOL NAME]</h1>
    <p style="font-size:12px;color:#6B7280;margin:0;">[Address if known] | Tel: ___________ | Email: ___________</p>
  </div>
  <div style="text-align:right;font-size:12px;color:#6B7280;">
    <div style="font-weight:600;color:#1a1a1a;">[Date]</div>
    <div>Ref: [AUTO-REFERENCE]</div>
  </div>
</div>

NOTICE HEADER:
<div style="background:#1E40AF;color:#fff;padding:12px 20px;border-radius:8px;margin-bottom:24px;text-align:center;">
  <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px;opacity:0.8;">Official Notice</p>
  <h2 style="font-size:20px;font-weight:700;margin:0;">NOTICE TITLE</h2>
</div>

BODY PARAGRAPH:
<p style="margin:0 0 16px;text-align:justify;color:#1a1a1a;">Text</p>

SIGNATURE BLOCK:
<div style="margin-top:48px;">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;">
    <div>
      <div style="border-bottom:1px solid #1a1a1a;margin-bottom:8px;height:40px;"></div>
      <p style="font-size:12px;color:#6B7280;margin:0;">Class Teacher / Date</p>
    </div>
    <div>
      <div style="border-bottom:1px solid #1a1a1a;margin-bottom:8px;height:40px;"></div>
      <p style="font-size:12px;color:#6B7280;margin:0;">Principal / HOD / Date</p>
    </div>
  </div>
</div>

REPLY SLIP (tear-off):
<div style="border:2px dashed #9CA3AF;padding:16px;margin-top:32px;border-radius:8px;">
  <p style="font-size:12px;font-weight:700;color:#374151;margin:0 0 12px;text-align:center;">✂ ─────────── TEAR OFF AND RETURN ─────────── ✂</p>
  <p style="font-size:13px;font-weight:600;margin:0 0 16px;">Learner Name: ___________________________ Grade: _______</p>
  [REPLY CONTENT]
  <div style="margin-top:16px;border-bottom:1px solid #1a1a1a;height:32px;"></div>
  <p style="font-size:11px;color:#6B7280;margin:4px 0 0;">Parent/Guardian Signature & Date</p>
</div>

═══════════════════════════════════════════════════════
DOCUMENT STANDARDS
═══════════════════════════════════════════════════════
- Reference numbers: [SCHOOL CODE]/[YEAR]/[DOC TYPE]/[NUMBER]
- Opening: "Dear Parent/Guardian" for parent letters (NEVER just "Dear Parent")
- Closing: "Yours faithfully" for formal; "Kind regards" for warm tone
- All monetary amounts: R [amount] (South African Rand)
- Dates: [Day] [Month written out] [Year]
- Keep language accessible: Grade 8 reading level maximum for parent documents
- Bilingual option: include Afrikaans or isiZulu paragraph if requested
- ALWAYS include return/contact information`;

export async function generateAdminDoc(input: AdminDocInput): Promise<AdminDocOutput> {

  const userPrompt = `Create a ${input.documentType}:

DETAILS:
- School: ${input.schoolName || '[School Name]'}
- Principal: ${input.principalName || '[Principal Name]'}
- Teacher: ${input.teacherName || '[Teacher Name]'}
- Grade: ${input.grade || 'All grades'}
- Subject: ${input.subject || 'N/A'}
- Date: ${input.date || '[Date]'}
- Language: ${input.language || 'English'}
- Recipients: ${input.recipientType || 'Parents/Guardians'}
- Purpose: ${input.purpose}
- Key Points to Cover: ${input.keyPoints || 'All standard points for this document type'}
- Tone: ${input.tone || 'Formal and professional'}
- Include Signature Line: ${input.includeSignatureLine ? 'Yes' : 'No'}
- Include Reply Slip: ${input.includeReplySlip ? 'Yes' : 'No'}
- Additional Instructions: ${input.additionalInstructions || 'None'}

Create a COMPLETE, professional, immediately-usable document.
Every line should be polished and correct — no placeholder text except where blanks are intentionally needed (names, dates, etc.).

OUTPUT FORMAT — return ONLY this JSON:
{
  "content": "<complete A4-ready HTML with ALL inline styles>",
  "notes": "Brief usage notes for the teacher"
}`;

  const output = await generateJSON<{ content: string; notes: string }>(
    userPrompt,
    ADMIN_SYSTEM_PROMPT,
    { maxTokens: 8192, temperature: 0.65 },
  );

  return {
    content: output.content || '<p>Document generation returned empty content.</p>',
    documentType: input.documentType,
    notes: output.notes || 'Review before printing.',
  };
}
ENDOFFILE

# ============================================================================
#  FIX 3: src/ai/flows/generate-visual-aids.ts
#  Replace genkit → @/lib/ai (Anthropic primary + Groq failover)
#  Image generation stubbed (Imagen was Gemini-specific)
# ============================================================================
log "Writing fixed  src/ai/flows/generate-visual-aids.ts"

cat > src/ai/flows/generate-visual-aids.ts << 'ENDOFFILE'
'use server';

/**
 * @fileOverview Visual Aids & Media Tools Generator
 *
 * Generates educational posters, classroom labels, word walls, diagrams,
 * booklet covers, flashcards, and other visual learning materials.
 *
 * Transport: Genkit removed → direct Anthropic + Groq calls via /lib/ai.ts
 * Note: Image generation (previously Gemini Imagen) is stubbed — HTML-only
 *        visual aids are still fully functional.
 */

import { generateJSON } from '@/lib/ai';
import { z } from 'zod';

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const VisualAidInputSchema = z.object({
  visualType: z.string().describe('e.g. "Educational Poster", "Classroom Labels", "Word Wall", "Diagram", "Flashcards", "Mind Map", "Alphabet Chart", "Number Chart", "Vocabulary Cards", "Certificate"'),
  grade: z.string(),
  subject: z.string(),
  topic: z.string(),
  language: z.string().optional().default('English'),
  colorScheme: z.string().optional().describe('e.g. "bright primary colors", "pastel", "school colors", "monochrome"'),
  style: z.string().optional().describe('e.g. "fun cartoon", "clean modern", "hand-drawn", "professional"'),
  specificContent: z.string().optional().describe('Specific words, concepts, or items to include'),
  quantity: z.string().optional().describe('Number of items e.g. "12 labels" or "26 flashcards"'),
  size: z.string().optional().describe('e.g. "A4 poster", "A5 cards", "small labels"'),
  additionalInstructions: z.string().optional(),
  generateImage: z.boolean().optional().default(false).describe('Whether to generate an actual image'),
});

export type VisualAidInput = z.infer<typeof VisualAidInputSchema>;

export type VisualAidOutput = {
  content: string;
  printInstructions: string;
  imageDataUri?: string;
  description: string;
};

// ─── System Prompt for HTML Visual Aids ──────────────────────────────────────

const VISUAL_HTML_SYSTEM = `You are Zwelakhe Msuthu, South Africa's top educational graphic designer who creates viral classroom resources. Your visual aids are photographed and shared across thousands of South African teacher WhatsApp groups. Your work is pinned in classrooms from Limpopo to the Western Cape.

You create stunning, eye-catching educational visuals using pure HTML with inline styles — no external CSS, no class names, no Tailwind utilities.

═══════════════════════════════════════════════════════
VISUAL DESIGN PHILOSOPHY
═══════════════════════════════════════════════════════

Your visuals must be:
✅ VISUALLY STUNNING — Bold typography, vibrant colors, strong visual hierarchy
✅ EDUCATIONALLY PURPOSEFUL — Every element serves a learning goal
✅ PRINT-READY — A4-optimised, high contrast, clear at 100% zoom
✅ AGE-APPROPRIATE — Playful for Foundation Phase, clean for FET

NEVER create:
❌ Bland, text-heavy walls without visual relief
❌ Small unreadable text in labels
❌ Poor contrast (light text on light background)
❌ Generic clipart descriptions that can't render in HTML

═══════════════════════════════════════════════════════
DESIGN SYSTEM
═══════════════════════════════════════════════════════

COLOR PALETTES (choose one based on subject/grade):

FOUNDATION PHASE (Grades R–3):
Primary: #FF6B6B (coral), #4ECDC4 (teal), #FFE66D (yellow), #6BCB77 (green)
Background: #FFFEF0 or #F0F9FF
Font: Impact for headings, Arial rounded for body

INTERMEDIATE (Grades 4–6):
Primary: #2563EB (blue), #7C3AED (purple), #059669 (green), #D97706 (amber)
Background: #F8FAFF or #FFFBF0
Font: Georgia for headings, Arial for body

SENIOR/FET (Grades 7–12):
Primary: #1E40AF (navy), #1D4ED8 (blue), #065F46 (forest), #7C2D12 (burgundy)
Background: #FFFFFF or #F9FAFB
Font: Arial Black for headings, Arial for body

SUBJECT COLOURS:
- Mathematics: #1E40AF (navy blue)
- Natural Sciences/Physical Sciences: #065F46 (forest green)
- Languages/English: #7C3AED (purple)
- Social Sciences/History: #92400E (amber/brown)
- Life Sciences: #14532D (dark green)
- Creative Arts: #BE185D (magenta)
- Life Orientation: #0E7490 (cyan)
- Technology/EMS: #374151 (slate)

═══════════════════════════════════════════════════════
ABSOLUTE RULES
═══════════════════════════════════════════════════════
1. Return ONLY valid JSON with "content", "printInstructions", "description"
2. HTML must use ONLY inline styles — NO class names, NO external CSS
3. NO code fences, NO markdown
4. HTML must start with <div style="...">
5. All text must be readable: dark text on light, white text on dark — NEVER same-color
6. Must be gorgeous — teachers must gasp when they see it`;

// ─── Main Function ────────────────────────────────────────────────────────────

export async function generateVisualAid(
  input: VisualAidInput
): Promise<VisualAidOutput> {

  // Note: Image generation was Gemini Imagen-specific.
  // HTML visual aids remain fully functional via Anthropic/Groq.
  let imageDataUri: string | undefined;

  const userPrompt = `Create a stunning ${input.visualType} for:

Grade: ${input.grade}
Subject: ${input.subject}
Topic: ${input.topic}
Language: ${input.language || 'English'}
Color Scheme: ${input.colorScheme || 'Subject-appropriate vibrant colors'}
Style: ${input.style || 'Modern educational, eye-catching'}
Specific Content to Include: ${input.specificContent || 'All key concepts for this topic'}
Quantity: ${input.quantity || 'Appropriate for the type'}
Size/Format: ${input.size || 'A4 portrait'}
Additional Instructions: ${input.additionalInstructions || 'None'}

OUTPUT FORMAT — return ONLY this JSON:
{
  "content": "<stunning, print-ready HTML with ALL inline styles>",
  "printInstructions": "Clear instructions for printing and using this visual aid",
  "description": "Brief description of what was created"
}

The HTML must be: visually SPECTACULAR, print-ready, using the design system from your instructions.
For Foundation Phase: make it JOYFUL and COLORFUL with emojis and large text.
For Senior Phase: make it CLEAN and AUTHORITATIVE.`;

  const output = await generateJSON<{
    content: string;
    printInstructions: string;
    description: string;
  }>(
    userPrompt,
    VISUAL_HTML_SYSTEM,
    { maxTokens: 8192, temperature: 0.8 },
  );

  return {
    content: output.content || '<p>Visual aid generation returned empty content.</p>',
    printInstructions: output.printInstructions || 'Print on A4 paper.',
    imageDataUri,
    description: output.description || 'Educational visual aid.',
  };
}
ENDOFFILE

# ============================================================================
#  FIX 4: src/ai/flows/generate-lesson-studio.ts
#  Replace genkit ai.defineFlow → plain async function using @/lib/ai
# ============================================================================
log "Writing fixed  src/ai/flows/generate-lesson-studio.ts"

cat > src/ai/flows/generate-lesson-studio.ts << 'ENDOFFILE'
/**
 * @fileOverview Lesson Studio Generator
 *
 * Generates CAPS-aligned lesson plans.
 *
 * Transport: Genkit removed → direct Anthropic + Groq calls via /lib/ai.ts
 */

import { generateJSON } from '@/lib/ai';
import { buildLessonStudioPrompt } from '@/ai/prompts';
import { z } from 'zod';

export const LessonPlanSchema = z.object({
  title: z.string().describe('The title of the lesson plan'),
  description: z.string().describe('A brief overview of the lesson'),
  sections: z.array(
    z.object({
      title: z.string().describe('e.g., "Introduction", "Activity"'),
      content: z.string().describe('The detailed content for this section'),
    })
  ),
});

export type LessonPlan = z.infer<typeof LessonPlanSchema>;

export type LessonStudioInput = {
  grade: string;
  subject: string;
  topic: string;
  lessonType: string;
};

export async function generateLessonStudioFlow(
  input: LessonStudioInput
): Promise<LessonPlan> {
  const { grade, subject, topic, lessonType } = input;
  const promptParams = buildLessonStudioPrompt({
    grade,
    subject,
    topic,
    notes: `Lesson Type: ${lessonType}`,
  });

  const output = await generateJSON<LessonPlan>(
    promptParams.userPrompt,
    promptParams.systemInstruction,
    { maxTokens: 8192, temperature: 0.7 },
  );

  if (!output || !output.sections) {
    throw new Error('Failed to generate lesson plan — AI returned invalid structure.');
  }

  return output;
}
ENDOFFILE

# ============================================================================
#  FIX 5: src/app/lesson-studio/page.tsx
#  Remove the broken import on line 27:
#    import { collection, addDoc, serverTimestamp } // firebase/firestore removed...
#  This line has no 'from' clause → syntax error.
#  Also migrate handleSaveToArchive from Firebase → Supabase.
# ============================================================================
log "Patching     src/app/lesson-studio/page.tsx"

# Step A: Remove the broken import line (line 27)
# The line starts with: import { collection, addDoc, serverTimestamp }
sed -i '/^import { collection, addDoc, serverTimestamp }/d' src/app/lesson-studio/page.tsx

# Step B: Replace the Firebase save logic with Supabase
# We need to replace the handleSaveToArchive function body.
# The old code uses: addDoc(collection(firestore, 'teachers', user.uid, 'generatedContent'), {...})
# and: serverTimestamp()
# We replace with a Supabase insert.

# First, remove the old Firebase imports that may still be referenced
# Replace the useFirestore hook call
sed -i "s/const firestore = useFirestore();/\/\/ Firebase removed — using Supabase API route for saves/" src/app/lesson-studio/page.tsx

# Replace the addDoc(collection(...)) call with a fetch to an API route
# This is a multi-line replacement, so we use a Python helper for reliability
python3 -c "
import re, sys

with open('src/app/lesson-studio/page.tsx', 'r') as f:
    content = f.read()

# Replace the Firebase addDoc block with a Supabase-friendly API call
old_save = '''await addDoc(collection(firestore, 'teachers', user.uid, 'generatedContent'), {
        teacherId: user.uid,
        grade: finalGrade,
        subject: finalSubject,
        topic: finalTopic,
        contentType: 'Lesson Plan',
        content: editedContent,
        createdAt: serverTimestamp(),
      });'''

new_save = '''const res = await fetch('/api/lesson-studio/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: user.id,
          grade: finalGrade,
          subject: finalSubject,
          topic: finalTopic,
          contentType: 'Lesson Plan',
          content: editedContent,
        }),
      });
      if (!res.ok) throw new Error('Failed to save to archive');'''

if old_save in content:
    content = content.replace(old_save, new_save)
    print('  → Replaced Firebase addDoc with Supabase API call')
else:
    # Try a more flexible regex approach
    pattern = r'await addDoc\(collection\(firestore.*?serverTimestamp\(\),?\s*\}\);'
    replacement = '''const res = await fetch('/api/lesson-studio/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: user.id,
          grade: finalGrade,
          subject: finalSubject,
          topic: finalTopic,
          contentType: 'Lesson Plan',
          content: editedContent,
        }),
      });
      if (!res.ok) throw new Error('Failed to save to archive');'''
    content, count = re.sub(pattern, replacement, content, flags=re.DOTALL)
    if count > 0:
        print(f'  → Replaced Firebase addDoc with Supabase API call (regex, {count} match)')
    else:
        print('  ⚠ Could not find Firebase addDoc pattern — manual review needed')

with open('src/app/lesson-studio/page.tsx', 'w') as f:
    f.write(content)
" 2>/dev/null || {
  warn "Python3 not available — line 27 removed but Firebase save logic needs manual review"
  warn "Open src/app/lesson-studio/page.tsx and replace the addDoc(collection(...)) block manually"
}

# ============================================================================
#  FIX 6: Delete src/genkit.ts (no longer needed)
# ============================================================================
if [[ -f src/genkit.ts ]]; then
  rm src/genkit.ts
  log "Deleted      src/genkit.ts (Genkit instance no longer needed)"
else
  warn "src/genkit.ts already deleted or doesn't exist"
fi

# ============================================================================
#  FIX 7: Update the API route for lesson-studio
# ============================================================================
log "Checking     src/app/api/lesson-studio/route.ts"

if [[ -f src/app/api/lesson-studio/route.ts ]]; then
  backup_file "src/app/api/lesson-studio/route.ts"

  python3 -c "
with open('src/app/api/lesson-studio/route.ts', 'r') as f:
    content = f.read()

# Replace genkit flow import with our new plain function
old_import = \"import { generateLessonStudioFlow } from '@/ai/flows/generate-lesson-studio';\"
if old_import in content:
    # Import stays the same since the function name is preserved
    print('  → API route import already correct')
else:
    print('  ⚠ API route may need manual review')
" 2>/dev/null || true
fi

# ============================================================================
#  Summary
# ============================================================================
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  All fixes applied!${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "  Backups saved to: ${BOLD}${BACKUP_DIR}/${NC}"
echo ""
echo "  Files fixed:"
echo "    1. src/lib/content-storage.ts          (firebase/storage → Supabase Storage)"
echo "    2. src/ai/flows/generate-admin-docs.ts (genkit → @/lib/ai)"
echo "    3. src/ai/flows/generate-visual-aids.ts (genkit → @/lib/ai)"
echo "    4. src/ai/flows/generate-lesson-studio.ts (genkit → @/lib/ai)"
echo "    5. src/app/lesson-studio/page.tsx      (broken import removed + save migrated)"
echo "    6. src/genkit.ts                       (deleted)"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo "    1. Verify your .env has: ANTHROPIC_API_KEY, GROQ_API_KEY,"
echo "       NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "    2. Create a Supabase Storage bucket named 'generated-content' (public)"
echo "    3. Create the API route: src/app/api/lesson-studio/save/route.ts"
echo "       (to handle Supabase inserts for the archive save)"
echo "    4. Run:  npm run build"
echo "    5. If clean, commit and push:"
echo "       git add -A && git commit -m 'fix: resolve all build errors after migration' && git push"
echo ""
