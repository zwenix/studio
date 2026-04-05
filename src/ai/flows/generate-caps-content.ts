'use server';

/**
 * @fileOverview Generates CAPS-compliant educational content using Gemini 2.5 Pro.
 *
 * KEY FIXES:
 * 1. z is now imported from 'genkit' (not raw 'zod') — required for Genkit structured output.
 * 2. visualAids is now optional with .default([]) — Gemini correctly omits it for
 *    non-visual content (Permission Slips, Letters, etc.), which was causing
 *    schema validation to fail and response.output to be null for those types.
 * 3. Added null-output guard with a clear error message instead of a silent ! throw.
 */

import { z } from 'genkit'; // FIX #1: was 'zod' — raw zod causes Genkit schema validation failures
import { ai } from '@/ai/genkit';
import { createClient } from 'pexels';

// ─── Types ────────────────────────────────────────────────────────────────────

const GradeSchema = z.string().describe('The grade level (R, 1–12, or custom).');

const GenerateCAPSContentInputSchema = z.object({
  grade: GradeSchema,
  subject: z.string(),
  topic: z.string(),
  contentType: z.string(),
  category: z.string(),
  term: z.string().optional(),
  language: z.string().optional(),
  learnerProfile: z.string().optional(),
  objective: z.string().optional(),
  duration: z.string().optional(),
  additionalInstructions: z.string().optional(),
  teacherName: z.string().optional(),
  signatureUrl: z.string().optional(),
});

export type GenerateCAPSContentInput = z.infer<typeof GenerateCAPSContentInputSchema>;

export type GenerateCAPSContentOutput = {
  content: string;
  memo: string;
  rubric: string;
};

const CapsResponseSchema = z.object({
  content: z.string().describe('Complete HTML content with [IMAGE:VA1] placeholders where appropriate'),
  memo: z.string().describe('HTML memo with answers and marking guidelines'),
  rubric: z.string().describe('HTML rubric with criteria and mark allocations'),
  // FIX #2: visualAids is now optional with a default of [].
  // Gemini CORRECTLY omits this for non-visual content types (Permission Slips,
  // Classroom Labels, Letters, etc.) — making it required was causing those
  // content types to fail schema validation entirely.
  visualAids: z.array(z.object({
    id: z.string(),
    query: z.string().describe('Detailed English search query for the image'),
  })).optional().default([]),
});

// ─── Image fetcher ──────────────────────────────────────────────────────────

async function fetchImage(query: string): Promise<string> {
  // Primary: Pexels
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const client = createClient(pexelsKey);
      const response = await client.photos.search({ query, per_page: 1, orientation: 'landscape' });
      if ('photos' in response && response.photos.length > 0) {
        return response.photos[0].src.large;
      }
    } catch (e) {
      console.error('[CAPSContent] Pexels failed for query:', query, e);
    }
  }

  // Fallback: Pixabay
  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (pixabayKey) {
    try {
      const url = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=3`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.hits?.length > 0) {
        return data.hits[0].largeImageURL;
      }
    } catch (e) {
      console.error('[CAPSContent] Pixabay failed for query:', query, e);
    }
  }

  return '';
}

// ─── Main exported function ───────────────────────────────────────────────────

export async function generateCAPSContent(
  input: GenerateCAPSContentInput
): Promise<GenerateCAPSContentOutput> {

  const response = await ai.generate({
    model: 'googleai/gemini-2.5-pro',
    system: `You are an expert South African teacher and CAPS curriculum designer for Grades R–12.

CONTENT RULES:
- Strictly align to the South African CAPS curriculum.
- Use South African English spelling (colour, realise, learner, etc.).
- Adapt language and cognitive demand to the grade:
  - Grades R–1: Very simple words, concrete examples, matching/circling/colouring tasks with emojis.
  - Grades 2–3: Simple sentences, scaffolded instructions.
  - Grades 4–7: Learner-friendly text, problem-solving, higher-order questions.
  - Grades 8–12: Academic rigour appropriate for the subject.
- Use South African contexts, names, places, and Rands (ZAR).

IMAGE PLACEHOLDER RULES — READ CAREFULLY:
- For VISUAL content types (Poster, Lesson Slides, Booklets, Study Guides): insert 2–4 image placeholders [IMAGE:VA1], [IMAGE:VA2] etc. at logical points in the HTML. Include the matching "visualAids" array entries.
- For TEXT-HEAVY or ADMIN content types (Permission Slips, Letters to Parents, Classroom Labels, Worksheets, Assessments, Lesson Plans, Memos): do NOT insert any image placeholders. Return "visualAids": [] (empty array).
- NEVER omit the visualAids field — always return it, even if empty.

MEMO AND RUBRIC REQUIREMENTS:
- For Admin/Management documents (Permission Slips, Letters, ILPs): the memo can be a brief "N/A — Administrative document" and rubric a simple completion checklist.
- For all educational content: provide a full marking memo and assessment rubric.

OUTPUT FORMAT — return ONLY valid JSON matching this exact structure:
{
  "content": "<complete HTML string>",
  "memo": "<HTML memo string>",
  "rubric": "<HTML rubric string>",
  "visualAids": []
}`,

    prompt: `Generate a ${input.contentType} for Grade ${input.grade}.
Subject: ${input.subject}
Topic: ${input.topic}
Category: ${input.category}
Term: ${input.term || 'N/A'}
Language: ${input.language || 'English'}
Objective: ${input.objective || 'N/A'}
Learner Profile: ${input.learnerProfile || 'General class'}
Length & Duration: ${input.duration || 'Default (30 min / 10 items)'}
Additional Instructions: ${input.additionalInstructions || 'None'}`,

    output: { format: 'json', schema: CapsResponseSchema },
  });

  // FIX #3: Guard against null output with a meaningful error instead of a silent ! throw.
  // This gives a proper error message in the UI toast rather than a cryptic crash.
  if (!response.output) {
    throw new Error(
      `Content generation for "${input.contentType}" (Grade ${input.grade} ${input.subject}) returned no structured output. ` +
      `This can happen when the AI response is too long or malformed. Please try again or simplify the request.`
    );
  }

  const output = response.output;
  let html = output.content || '';
  const visualAids = output.visualAids || [];

  // Inject real images into [IMAGE:VAx] placeholders
  if (visualAids.length > 0) {
    const imageResults = await Promise.all(
      visualAids.map(async (va) => ({
        id: va.id,
        query: va.query,
        url: await fetchImage(va.query),
      }))
    );

    for (const result of imageResults) {
      const tagRegex = new RegExp(`\\[IMAGE:\\s*${result.id}\\]`, 'gi');
      if (result.url) {
        const imgHtml = `<div class="my-6 text-center">
  <img src="${result.url}" alt="${result.query}" class="rounded-xl shadow-lg mx-auto max-h-[400px]" style="width:auto;height:auto;max-width:100%;" />
  <p class="text-xs text-muted-foreground mt-2 italic">${result.query}</p>
</div>`;
        html = html.replace(tagRegex, imgHtml);
      } else {
        // No image found — remove the placeholder tag silently
        html = html.replace(tagRegex, '');
      }
    }
  }

  // Clean up any stray [IMAGE:VAx] tags that didn't get matched
  html = html.replace(/\[IMAGE:\s*VA\d+\]/gi, '');

  return {
    content: html,
    memo: output.memo || '',
    rubric: output.rubric || '',
  };
}
