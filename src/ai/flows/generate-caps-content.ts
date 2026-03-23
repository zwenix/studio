'use server';

/**
 * @fileOverview Generates CAPS-compliant educational content using Gemini 2.5 Pro.
 *
 * ROOT CAUSE OF 500 ERROR — FIXED:
 * The previous version used z.enum() for `grade` and `category` input fields.
 * Zod throws a validation error (which surfaces as a 500) when the client sends
 * a value not in the enum — e.g. category 'Assessments' vs the enum value
 * 'Exercises, Tasks & Assessments'. All input fields now use z.string() so any
 * value from the UI is accepted. The AI prompt enforces CAPS compliance — the
 * Zod schema just needs to not reject valid UI inputs.
 */

import { z } from 'zod';
import { ai } from '@/genkit';
import { createClient } from 'pexels';

// ─── Input Schema ─────────────────────────────────────────────────────────────
// All fields use z.string() — no z.enum() on inputs. Enum validation at the UI
// level is sufficient; strict server-side enum validation only causes 500s when
// the UI evolves and the enum list falls out of sync.

const GenerateCAPSContentInputSchema = z.object({
  grade: z.string().describe('The grade level (R, 1–12, or custom).'),
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

// ─── AI Output Schema ─────────────────────────────────────────────────────────
// visualAids is optional with a default of [] so that if Gemini omits it the
// flow still succeeds instead of throwing an output-parsing error.

const CapsResponseSchema = z.object({
  content: z.string().describe('HTML content with [IMAGE:VA1] placeholders'),
  memo: z.string().describe('HTML memo'),
  rubric: z.string().describe('HTML rubric'),
  visualAids: z
    .array(
      z.object({
        id: z.string(),
        query: z.string().describe('English search query for the image'),
      })
    )
    .optional()
    .default([]),
});

// ─── Image fetcher ─────────────────────────────────────────────────────────────

async function fetchImage(query: string): Promise<string> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const client = createClient(pexelsKey);
      const response = await client.photos.search({
        query,
        per_page: 1,
        orientation: 'landscape',
      });
      if ('photos' in response && response.photos.length > 0) {
        return response.photos[0].src.large;
      }
    } catch (e) {
      console.error('Pexels failed for query:', query, e);
    }
  }

  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (pixabayKey) {
    try {
      const url = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(
        query
      )}&image_type=photo&orientation=horizontal&safesearch=true&per_page=3`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.hits?.length > 0) {
        return data.hits[0].largeImageURL;
      }
    } catch (e) {
      console.error('Pixabay failed for query:', query, e);
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
- Adapt language and cognitive demand to the specified grade:
  - Grades R–1: Very simple words, concrete examples, matching/circling/colouring activities.
  - Grades 2–3: Simple sentences, scaffolded instructions.
  - Grades 4–7: Clear learner-friendly text, problem-solving, higher-order questions.
  - Grades 8–12: Subject-appropriate academic rigour.
- Use South African contexts, names, and Rands (ZAR).

LENGTH & DURATION RULES:
- If the user provided specific requirements for length or duration, strictly follow them.
- If no requirements were provided, default to a 30-minute lesson/task and/or 10 questions/activities.

IMAGE PLACEHOLDER RULES:
- Where an image enhances learning, insert a placeholder tag exactly like this: [IMAGE:VA1], [IMAGE:VA2], etc.
- Use 2 to 4 images per piece of content — place them at logical points in the HTML.
- In the "visualAids" array, list each image with its id and a detailed English search query.
- Example: { "id": "VA1", "query": "South African children learning mathematics classroom Grade 4" }
- DO NOT embed a VISUAL_AIDS text block inside the HTML — use only the JSON array.`,

    prompt: `Generate a ${input.contentType} for Grade ${input.grade}.
Subject: ${input.subject}
Topic: ${input.topic}
Category: ${input.category}
Term: ${input.term || 'N/A'}
Language: ${input.language || 'English'}
Objective: ${input.objective || 'N/A'}
Learner Profile / Barriers: ${input.learnerProfile || 'General class'}
Length & Duration: ${input.duration || 'Default (30 min / 10 items)'}
Additional Instructions: ${input.additionalInstructions || 'None'}
Teacher Name: ${input.teacherName || 'Educator'}`,

    output: {
      format: 'json',
      schema: CapsResponseSchema,
    },
  });

  const output = response.output!;

  let html = output.content || '';
  const visualAids = output.visualAids || [];

  // Fetch all images in parallel for speed
  if (visualAids.length > 0) {
    const imageResults = await Promise.all(
      visualAids.map(async (va) => ({
        id: va.id,
        query: va.query,
        url: await fetchImage(va.query),
      }))
    );

    for (const result of imageResults) {
      // Handle both [IMAGE:VA1] and [IMAGE: VA1] (with or without space)
      const tagRegex = new RegExp(`\\[IMAGE:\\s*${result.id}\\]`, 'gi');
      if (result.url) {
        const imgHtml = `<div class="my-6 text-center">
  <img
    src="${result.url}"
    alt="${result.query}"
    class="rounded-xl shadow-lg mx-auto max-h-[400px]"
    style="width:auto;height:auto;max-width:100%;"
  />
  <p class="text-xs text-muted-foreground mt-2 italic">${result.query}</p>
</div>`;
        html = html.replace(tagRegex, imgHtml);
      } else {
        // No image found — remove placeholder silently
        html = html.replace(tagRegex, '');
      }
    }
  }

  // Clean up any remaining stray placeholders
  html = html.replace(/\[IMAGE:\s*VA\d+\]/gi, '');

  return {
    content: html,
    memo: output.memo || '',
    rubric: output.rubric || '',
  };
}