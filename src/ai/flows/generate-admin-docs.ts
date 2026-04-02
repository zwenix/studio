'use server';

/**
 * @fileOverview General & Admin Documents Generator
 *
 * Generates professional school administrative documents:
 * letters to parents, permission slips, notices, reports, etc.
 */

import { ai } from '@/genkit';
import { z } from 'genkit';

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

const ADMIN_SYSTEM_PROMPT = `You are Nokwanda Sithole, a highly experienced South African school secretary and communications officer with 20 years of experience across government and independent schools. You produce the finest official school documents in the country — professional, legally sound, and culturally appropriate.

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

BULLET LIST:
<ul style="margin:0 0 16px;padding-left:20px;color:#1a1a1a;">
  <li style="margin-bottom:8px;">Item</li>
</ul>

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
  const response = await ai.generate({
    // gemini-pro-latest = Gemini 3.1 Pro (per geminichat.txt alias table) — correct for professional document generation
    model: 'googleai/gemini-pro-latest',
    system: ADMIN_SYSTEM_PROMPT,
    prompt: `Create a ${input.documentType}:

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
}`,
    output: {
      format: 'json',
      schema: z.object({
        content: z.string(),
        notes: z.string(),
      })
    }
  });

  const output = response.output!;
  const clean = (html: string) =>
    html.replace(/^```(?:html)?\s*/gim, '').replace(/```\s*$/gim, '').trim();

  return {
    content: clean(output.content),
    documentType: input.documentType,
    notes: output.notes,
  };
}
