'use server';

/**
 * @fileOverview Teaching Content Generator — Assessments & Teaching Tools Lab
 *
 * Generates CAPS-aligned educational content as clean, self-contained HTML
 * with inline styles only. No Tailwind classes. No code fences. Print-ready.
 */

import { ai } from '@/genkit';
import { z } from 'genkit';

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const TeachingContentInputSchema = z.object({
  contentCategory: z.string().describe('High-level category e.g. "Assessment" or "Teaching Tool"'),
  contentType: z.string().describe('Specific type e.g. "Controlled Test", "Lesson Plan", "Worksheet"'),
  grade: z.string().describe('CAPS grade: R, 1–12'),
  subject: z.string(),
  topic: z.string(),
  term: z.string().optional().describe('Term 1–4'),
  language: z.string().optional().default('English'),
  difficulty: z.string().optional().describe('Easy / Medium / Challenging / Mixed'),
  duration: z.string().optional().describe('e.g. "45 minutes" or "15 questions"'),
  numberOfItems: z.string().optional().describe('Number of questions/activities'),
  objective: z.string().optional().describe('Learning objective'),
  learnerProfile: z.string().optional().describe('Learner needs, barriers, differentiation'),
  differentiation: z.string().optional().describe('Extension/support activities needed'),
  includeAnswerMemo: z.boolean().optional().default(true),
  includeRubric: z.boolean().optional().default(true),
  teacherName: z.string().optional(),
  schoolName: z.string().optional(),
  signatureUrl: z.string().optional(),
  additionalInstructions: z.string().optional(),
});

export type TeachingContentInput = z.infer<typeof TeachingContentInputSchema>;

export type TeachingContentOutput = {
  content: string;   // Self-contained inline-styled HTML
  memo: string;      // Self-contained inline-styled HTML memo/answers
  rubric: string;    // Self-contained inline-styled HTML rubric
  contentType: string;
  estimatedMarks: string;
  estimatedDuration: string;
};

// ─── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Dr. Thembi Dlamini, South Africa's foremost curriculum design expert and master educator with 25 years of classroom experience across township schools and top-performing institutions. You have deep mastery of the CAPS (Curriculum and Assessment Policy Statement) curriculum for Grades R–12.

Your content is used in published textbooks, DBE resources, and winning national award entries. You set the standard that other educational platforms aspire to reach.

═══════════════════════════════════════════════════════
ABSOLUTE OUTPUT RULES — NEVER VIOLATE THESE
═══════════════════════════════════════════════════════

1. Return a JSON object with these exact keys: content, memo, rubric, estimatedMarks, estimatedDuration
2. Every value must be a valid HTML string with ALL styles applied INLINE using the style="" attribute
3. NEVER use class names, Tailwind utilities, or external CSS references
4. NEVER wrap output in markdown code fences (\`\`\`html or \`\`\`)
5. NEVER include <html>, <head>, <body>, or <style> tags — start directly with <div>
6. ALL text must be visible — use explicit color: #1a1a1a on white backgrounds
7. All content must be A4-width-aware and print-ready

═══════════════════════════════════════════════════════
HTML & STYLE STANDARDS
═══════════════════════════════════════════════════════

Use this design system consistently:

PAGE WRAPPER:
<div style="max-width:794px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6;background:#fff;padding:40px;">

DOCUMENT HEADER (always include):
<div style="border-bottom:3px solid #1a56db;padding-bottom:16px;margin-bottom:28px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <h1 style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 4px;">DOCUMENT TITLE</h1>
      <p style="color:#6b7280;font-size:13px;margin:0;">Grade X | Subject | Term X | [Year]</p>
    </div>
    <div style="text-align:right;font-size:12px;color:#6b7280;">
      <div>Teacher: ___________</div>
      <div>Date: ___________</div>
      <div style="margin-top:4px;">Total: ___ / [marks]</div>
    </div>
  </div>
</div>

SECTION HEADERS:
<h2 style="font-size:16px;font-weight:700;color:#1a56db;margin:24px 0 12px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">Section X: Title</h2>

QUESTION NUMBERS:
<div style="margin:16px 0;">
  <p style="font-weight:600;color:#1a1a1a;margin:0 0 8px;"><span style="background:#1a56db;color:#fff;padding:2px 8px;border-radius:4px;font-size:13px;margin-right:8px;">1.</span> Question text here</p>
  <p style="color:#6b7280;font-size:12px;margin:4px 0 0 36px;">(X marks)</p>
</div>

ANSWER LINES (for written responses):
<div style="margin:8px 0 8px 36px;">
  <div style="border-bottom:1px solid #d1d5db;height:24px;margin:8px 0;"></div>
  <div style="border-bottom:1px solid #d1d5db;height:24px;margin:8px 0;"></div>
  <div style="border-bottom:1px solid #d1d5db;height:24px;margin:8px 0;"></div>
</div>

MULTIPLE CHOICE OPTIONS:
<div style="margin:8px 0 8px 36px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
  <label style="display:flex;align-items:center;gap:8px;"><span style="width:18px;height:18px;border:2px solid #6b7280;border-radius:50%;display:inline-block;flex-shrink:0;"></span> A. Option text</label>
  <label style="display:flex;align-items:center;gap:8px;"><span style="width:18px;height:18px;border:2px solid #6b7280;border-radius:50%;display:inline-block;flex-shrink:0;"></span> B. Option text</label>
</div>

TABLE STYLE:
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <thead><tr style="background:#1a56db;color:#fff;">
    <th style="padding:10px 12px;text-align:left;font-size:13px;">Header</th>
  </tr></thead>
  <tbody>
    <tr style="background:#f9fafb;"><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">Cell</td></tr>
    <tr><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">Cell</td></tr>
  </tbody>
</table>

CALLOUT BOX (for instructions/notes):
<div style="background:#eff6ff;border-left:4px solid #1a56db;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;">
  <p style="font-weight:600;color:#1e40af;margin:0 0 4px;font-size:13px;">📌 Instructions</p>
  <p style="color:#1e40af;margin:0;font-size:13px;">Text here</p>
</div>

FOUNDATION PHASE SPECIAL ELEMENTS (Grades R–3):
- Use larger fonts: font-size:16px minimum for questions
- Add fun emoji to headings 🌟 ✏️ 🎉
- Use dotted writing lines: border-bottom: 2px dotted #94a3b8
- Add spacing boxes: <span style="display:inline-block;width:80px;height:28px;border-bottom:2px dotted #94a3b8;margin:0 4px;"></span>
- Use colorful section headers: background:#fef3c7 or #dcfce7

SENIOR/FET PHASE SPECIAL ELEMENTS (Grades 7–12):
- Include mark allocations prominently with brackets: [3]
- Use formal question numbering: 1.1, 1.2, 1.3
- Include formula sheets or reference tables where relevant
- Add: "Show all working" instructions for Mathematics/Sciences

═══════════════════════════════════════════════════════
CAPS CURRICULUM STANDARDS
═══════════════════════════════════════════════════════

Every piece of content must:
- Reference the correct CAPS topic, strand, and term expectations
- Use Bloom's Taxonomy: remember → understand → apply → analyse → evaluate → create
- Match cognitive demand to grade level
- Use South African English spelling (colour, recognise, learner, etc.)
- Use South African contexts: Rands (R), local names, SA geography
- Never reference concepts beyond the CAPS scope for that grade/term

GRADE-SPECIFIC LANGUAGE CALIBRATION:
- Grade R–1: Concrete, pictorial, 3–5 word sentences, action words
- Grade 2–3: Short sentences, scaffolded, semi-concrete
- Grade 4–6: Clear accessible language, application-focused
- Grade 7–9: Academic register, multi-step reasoning
- Grade 10–12: Formal, technical language, higher-order demands

═══════════════════════════════════════════════════════
CONTENT QUALITY STANDARDS
═══════════════════════════════════════════════════════

Your content must:
1. Be BETTER than DBE exemplar papers
2. Have zero factual errors — check all facts, formulae, and spelling
3. Include cognitive variation: not all recall — mix of application and analysis
4. Provide SPECIFIC, ACTIONABLE feedback hooks in the memo
5. Be immediately classroom-usable with zero editing needed
6. Set the trend — other app developers will screenshot your output as their target`;

// ─── Content Type Specifications ─────────────────────────────────────────────

function getContentTypeSpec(contentType: string, grade: string): string {
  const gradeNum = parseInt(grade);
  const isFoundation = grade === 'R' || gradeNum <= 3;
  const isFET = gradeNum >= 10;

  const specs: Record<string, string> = {
    'Lesson Plan': `
LESSON PLAN STRUCTURE (strictly follow this):
1. LESSON OVERVIEW TABLE: Grade, Subject, Topic, Duration, Date, Teacher
2. PRIOR KNOWLEDGE: What learners already know
3. LEARNING OBJECTIVES: 3–5 SMART objectives using CAPS verbs
4. RESOURCES NEEDED: Materials list
5. LESSON PHASES:
   - Introduction/Set Induction (10% of time): Hook activity, prior knowledge activation
   - Development/Presentation (60% of time): Step-by-step teaching sequence with teacher talk and learner activities
   - Consolidation (20% of time): Summary, key concepts review
   - Assessment for Learning (10% of time): Quick formative check
6. DIFFERENTIATION: Extension tasks + support strategies
7. HOMEWORK: Meaningful, achievable task
8. REFLECTION SPACE: (blank box for teacher notes after lesson)`,

    'Worksheet': `
WORKSHEET STRUCTURE:
1. Header with learner name, grade, date, total marks
2. Clear topic heading and CAPS alignment note
3. ${isFoundation ? 'Fun, visually spaced activities with large font and drawing spaces' : 'Progressive difficulty: starter → core → extension'}
4. Mix of question types: ${isFoundation ? 'matching, circling, tracing, drawing, simple writing' : 'short answer, structured, application, extended response'}
5. Total mark allocation per section
6. ${isFoundation ? 'Encouraging footer: "Well done! ⭐"' : 'Examiner note with mark allocation breakdown'}`,

    'Controlled Test': `
CONTROLLED TEST STRUCTURE:
1. Professional DBE-style header with school line, learner name, class, total marks, time
2. General instructions box (no calculators note, pen/pencil requirement, etc.)
3. SECTION A: Multiple choice / True-False / Matching (${isFET ? '20–30%' : '30–40%'} of marks)
4. SECTION B: Short/structured questions (${isFET ? '40–50%' : '40–50%'} of marks)
5. SECTION C: Extended/open-ended (${isFET ? '30%' : '20%'} of marks)
6. Questions progress from easy → medium → challenging
7. Mark allocations in brackets [3] after every question
8. Answer spaces proportional to marks`,

    'Examination': `
EXAMINATION STRUCTURE — NSC/CAPS EXAMINATION PAPER FORMAT:
1. Official-style cover page with subject, grade, duration, total marks, instructions
2. SECTION A: Objective questions (multiple choice, true/false) — 30 marks
3. SECTION B: Structured questions — 40 marks
4. SECTION C: Extended writing / problem solving — 30 marks
5. Full mark allocation throughout
6. Reading time instruction: "15 minutes reading time"
7. Number of pages indicated`,

    'Homework': `
HOMEWORK TASK STRUCTURE:
1. Brief, achievable — 20–30 minutes max
2. Directly linked to today's lesson concept
3. Clear step-by-step instructions
4. ${isFoundation ? 'Parent note: what to do with their child' : ''}
5. Due date line
6. Self-assessment: "Rate your confidence: 😕 🙂 😊"`,

    'Study Guide': `
STUDY GUIDE STRUCTURE:
1. TOPIC OVERVIEW box with key concepts listed
2. KEY VOCABULARY table with term → definition → example
3. CONCEPT EXPLANATIONS: Clear, memorable explanations with worked examples
4. MIND MAP or summary diagram (described in text if visual)
5. WORKED EXAMPLES: Step-by-step with explanations
6. PRACTICE QUESTIONS: 5–10 graded practice items
7. QUICK REFERENCE: Key formulae / facts box
8. SELF-CHECK: "Can I..." checklist`,

    'Investigation': `
INVESTIGATION STRUCTURE (CAPS FAT format):
1. SCENARIO / CONTEXT: Real-world problem context
2. AIM: What learners will investigate
3. HYPOTHESIS (Senior/FET only)
4. APPARATUS / RESOURCES needed
5. METHOD: Numbered procedure steps
6. OBSERVATIONS: Data recording table
7. ANALYSIS: Questions requiring interpretation
8. CONCLUSION: Structured sentence frame
9. EVALUATION: Self-assessment of process`,

    'default': `
Generate a comprehensive, classroom-ready ${contentType} following CAPS requirements for Grade ${grade}.
Include all standard components expected for this document type.
${isFoundation ? 'Make it visual, fun, and age-appropriate with larger text and ample space.' : ''}
${isFET ? 'Maintain formal academic standards matching NSC examination style.' : ''}`
  };

  return specs[contentType] || specs['default'];
}

// ─── Main Function ────────────────────────────────────────────────────────────

export async function generateTeachingContent(
  input: TeachingContentInput
): Promise<TeachingContentOutput> {

  const contentSpec = getContentTypeSpec(input.contentType, input.grade);
  const gradeNum = parseInt(input.grade);
  const isFoundation = input.grade === 'R' || gradeNum <= 3;
  const isFET = gradeNum >= 10;

  const response = await ai.generate({
    // gemini-pro-latest = Gemini 3.1 Pro (per geminichat.txt alias table) — correct for complex CAPS content generation
    model: 'googleai/gemini-pro-latest',
    system: SYSTEM_PROMPT,
    prompt: `Create a ${input.contentType} for the following:

DOCUMENT DETAILS:
- Grade: ${input.grade}
- Subject: ${input.subject}
- Topic: ${input.topic}
- Term: ${input.term || 'Not specified'}
- Language of instruction: ${input.language || 'English'}
- Duration/Length: ${input.duration || 'Standard'}
- Number of items: ${input.numberOfItems || 'Appropriate for grade/type'}
- Difficulty: ${input.difficulty || 'Mixed — Bloom\'s progression'}
- Learning Objective: ${input.objective || 'Aligned to CAPS topic objectives'}
- Learner Profile: ${input.learnerProfile || 'General class, 30–45 learners'}
- Differentiation Required: ${input.differentiation || 'Standard extension and support'}
- Teacher: ${input.teacherName || 'Educator'}
- School: ${input.schoolName || ''}
- Include Answer Memo: ${input.includeAnswerMemo !== false ? 'YES' : 'NO'}
- Include Rubric: ${input.includeRubric !== false ? 'YES' : 'NO'}
- Additional Instructions: ${input.additionalInstructions || 'None'}

CONTENT TYPE REQUIREMENTS:
${contentSpec}

PHASE-SPECIFIC REQUIREMENTS:
${isFoundation ? `FOUNDATION PHASE (Grade ${input.grade}):
- Font size minimum 16px for all learner-facing text
- Use emojis liberally: 🌟 ✏️ 🎨 🔢 📚
- Large writing spaces with dotted lines
- Include parent helper note at bottom
- Sentences max 8 words
- Concrete, pictorial, abstract progression` : ''}
${isFET ? `FET PHASE (Grade ${input.grade}):
- Match NSC examination style and cognitive demand
- Use mark allocation brackets [X marks] on every question
- Include formal instructions box at top
- Reference specific CAPS ATML/Assessment Standards
- Include formula sheet if applicable (Maths/Science)
- Numbered sections: 1. → 1.1 → 1.1.1` : ''}

OUTPUT FORMAT — return ONLY this JSON (no code fences, no extra text):
{
  "content": "<complete self-contained HTML with ALL inline styles>",
  "memo": "<complete memo/answer key HTML with ALL inline styles, or empty string if not requested>",
  "rubric": "<complete rubric HTML with ALL inline styles, or empty string if not requested>",
  "estimatedMarks": "XX marks",
  "estimatedDuration": "XX minutes"
}

CRITICAL: Every HTML value must:
1. Start with <div style="max-width:794px;margin:0 auto;...">
2. Use ONLY inline styles — no class names whatsoever
3. Be immediately usable with dangerouslySetInnerHTML in React
4. Be print-ready at A4 size
5. Have ALL text in dark color (#1a1a1a minimum) — nothing invisible`,
    output: {
      format: 'json',
      schema: z.object({
        content: z.string(),
        memo: z.string(),
        rubric: z.string(),
        estimatedMarks: z.string(),
        estimatedDuration: z.string(),
      })
    }
  });

  const output = response.output!;

  // Strip any accidental code fences that might slip through
  const clean = (html: string) =>
    html
      .replace(/^```(?:html)?\s*/gim, '')
      .replace(/```\s*$/gim, '')
      .trim();

  return {
    content: clean(output.content),
    memo: clean(output.memo),
    rubric: clean(output.rubric),
    estimatedMarks: output.estimatedMarks,
    estimatedDuration: output.estimatedDuration,
    contentType: input.contentType,
  };
}
