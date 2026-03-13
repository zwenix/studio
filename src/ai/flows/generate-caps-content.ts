// src/ai/flows/generate-caps-content.ts
'use server';

import { z } from 'zod';
import { groqGenerate, groqGenerateJSON } from '@/ai/groq-client';

const GradeSchema = z.enum(['R','1','2','3','4','5','6','7','8','9','10','11','12']);

const GenerateCAPSContentInputSchema = z.object({
  grade: GradeSchema,
  subject: z.string(),
  topic: z.string(),
  contentType: z.string(),
  category: z.enum(['Teaching Tools & Aids', 'Exercises, Tasks & Assessments', 'Class Management & Admin']),
  term: z.string().optional(),
  language: z.string().optional(),
  learnerProfile: z.string().optional(),
  objective: z.string().optional(),
  duration: z.string().optional(),
  numberOfActivities: z.string().optional(),
  additionalInstructions: z.string().optional(),
  teacherName: z.string().optional(),
  signatureUrl: z.string().optional(),
});

export type GenerateCAPSContentInput = z.infer<typeof GenerateCAPSContentInputSchema>;
export type GenerateCAPSContentOutput = { content: string; memo: string; rubric: string; };

type GroqCAPSResponse = {
  content: string;
  memo: string;
  rubric: string;
  visualAids: Array<{ id: string; description: string; }>;
};

// ─── Generate a clean inline SVG for a given educational description ──────────

async function generateSVG(description: string, grade: string): Promise<string> {
  const isEarlyGrade = ['R','1','2','3','4'].includes(grade);

  const svgText = await groqGenerate([
    {
      role: 'system',
      content: `You are an expert SVG illustrator for South African educational materials.
Generate a single self-contained SVG illustration based on the description provided.

RULES:
- Output ONLY the raw SVG code. Start with <svg and end with </svg>. Nothing else.
- Use viewBox="0 0 400 300" width="400" height="300"
- Use bright, cheerful colours suitable for children: blues, greens, yellows, oranges
- ${isEarlyGrade ? 'Make it very simple, bold, cartoon-like — suitable for Grade R to 4 learners' : 'Make it clear, accurate and educational — suitable for Grade 5 to 12 learners'}
- Include a short descriptive <title> element as the first child of <svg>
- For diagrams: include clear labels using <text> elements
- For objects/scenes: use simple shapes (rect, circle, ellipse, path, polygon)
- NO external images, NO scripts, NO CSS classes that reference external stylesheets
- The SVG must be fully self-contained and render correctly inline in HTML`,
    },
    {
      role: 'user',
      content: `Create an educational SVG illustration for: "${description}"
This is for Grade ${grade} learners in South Africa.`,
    },
  ], { temperature: 0.4, max_tokens: 2048 });

  // Extract just the SVG tag in case Groq adds any surrounding text
  const svgMatch = svgText.match(/<svg[\s\S]*<\/svg>/i);

  if (svgMatch) {
    return `<div class="my-6 text-center">
  ${svgMatch[0]}
  <p class="text-xs text-muted-foreground mt-2 italic">${description}</p>
</div>`;
  }

  // SVG generation failed — fall back to Wikimedia image
  const wikiUrl = await fetchWikimediaImage(description);
  if (wikiUrl) {
    return `<div class="my-6 text-center">
  <img
    src="${wikiUrl}"
    alt="${description}"
    class="rounded-xl shadow-lg mx-auto max-h-[400px]"
    style="width:auto;height:auto;max-width:100%;"
  />
  <p class="text-xs text-muted-foreground mt-2 italic">${description}</p>
</div>`;
  }

  return '';
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function generateCAPSContent(
  input: GenerateCAPSContentInput
): Promise<GenerateCAPSContentOutput> {

  // Step 1: Generate content + get visual aid descriptions
  const output = await groqGenerateJSON<GroqCAPSResponse>([
    {
      role: 'system',
      content: `You are an expert South African teacher and CAPS curriculum designer for Grades R–12.

CONTENT RULES:
- Strictly align to the South African CAPS curriculum.
- Use South African English spelling (colour, realise, learner, etc.).
- Adapt to grade level:
  - Grades R–1: Very simple words, concrete examples, matching/circling/colouring.
  - Grades 2–3: Simple sentences, scaffolded instructions.
  - Grades 4–7: Clear learner-friendly text, problem-solving, higher-order questions.
  - Grades 8–12: Academic rigour appropriate to the subject.

VISUAL AID RULES (CRITICAL):
- Embed 2 to 4 image placeholders in the HTML where visuals would genuinely help learners understand.
- Placeholder format (no spaces): [IMAGE:VA1], [IMAGE:VA2], [IMAGE:VA3], [IMAGE:VA4]
- In the visualAids array, write a SPECIFIC, DETAILED description of what the illustration should show.
- Good description: "A labelled diagram of the human digestive system showing mouth, oesophagus, stomach, small intestine and large intestine"
- Bad description: "an image" or "a picture of the topic"
- The SVG illustrator will draw exactly what you describe — be precise.

RETURN FORMAT — ONLY this JSON object:
{
  "content": "<full HTML with [IMAGE:VA1] placeholders at appropriate points>",
  "memo": "<HTML memo>",
  "rubric": "<HTML rubric>",
  "visualAids": [
    { "id": "VA1", "description": "detailed illustration description" },
    { "id": "VA2", "description": "detailed illustration description" }
  ]
}`,
    },
    {
      role: 'user',
      content: `Generate a ${input.contentType} for Grade ${input.grade}.
Subject: ${input.subject}
Topic: ${input.topic}
Term: ${input.term || 'N/A'}
Language: ${input.language || 'English'}
Objective: ${input.objective || 'N/A'}
Learner Profile: ${input.learnerProfile || 'General class'}
Duration: ${input.duration || 'N/A'} minutes
Number of Activities: ${input.numberOfActivities || 'N/A'}
Additional Instructions: ${input.additionalInstructions || 'None'}`,
    },
  ], { max_tokens: 8192, temperature: 0.7 });

  const visualAids = Array.isArray(output.visualAids) ? output.visualAids : [];

  // Step 2: Generate SVGs for all visual aids in parallel
  const svgResults = await Promise.all(
    visualAids.map(async (va) => ({
      id: va.id,
      svg: await generateSVG(va.description, input.grade),
    }))
  );

  // Step 3: Replace placeholders with generated SVGs
  let html = output.content || '';

  for (const result of svgResults) {
    const tagRegex = new RegExp(`\\[IMAGE:\\s*${result.id}\\]`, 'gi');
    html = html.replace(tagRegex, result.svg || '');
  }

  // Clean up any unmatched placeholders
  html = html.replace(/\[IMAGE:\s*VA\d+\]/gi, '');

  return {
    content: html,
    memo: output.memo || '',
    rubric: output.rubric || '',
  };
}