'use server';

/**
 * @fileOverview Generates CAPS-compliant educational content using Gemini 2.5 Pro.
 * Optimized for high-quality pedagogical reasoning and structured image injection.
 */

import { z } from 'zod';
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
  duration: z.string().optional(), // Now "Length & Duration" free text
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
  content: z.string().describe('HTML content with [IMAGE:VA1] placeholders'),
  memo: z.string().describe('HTML memo'),
  rubric: z.string().describe('HTML rubric'),
  visualAids: z.array(z.object({
    id: z.string(),
    query: z.string().describe('English search query for the image')
  }))
});

// ─── Image fetcher ──────────────────────────────────────────────────────────

async function fetchImage(query: string): Promise<string> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const client = createClient(pexelsKey);
      const response = await client.photos.search({ query, per_page: 1, orientation: 'landscape' });
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
      const url = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=3`;
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
    system: `You are an expert South African teacher and CAPS curriculum designer.
    
CONTENT RULES:
- Strictly align to the South African CAPS curriculum.
- Use South African English spelling (colour, realise, learner, etc.).
- Adapt language and cognitive demand to the specified grade.
- Use South African contexts, names, and Rands (ZAR).

LENGTH & DURATION RULES:
- If the user provided specific requirements for length or duration, strictly follow them.
- If no requirements were provided, default to a 30-minute lesson/task and/or 10 questions/activities.

IMAGE PLACEHOLDER RULES:
- Where an image enhances learning, insert: [IMAGE:VA1], [IMAGE:VA2], etc.
- In the "visualAids" array, provide a detailed English search query for each ID.`,
    prompt: `Generate a ${input.contentType} for Grade ${input.grade}.
Subject: ${input.subject}
Topic: ${input.topic}
Term: ${input.term || 'N/A'}
Language: ${input.language || 'English'}
Objective: ${input.objective || 'N/A'}
Learner Profile: ${input.learnerProfile || 'General class'}
Length & Duration: ${input.duration || 'Default (30 min / 10 items)'}
Instructions: ${input.additionalInstructions || 'None'}`,
    output: { format: 'json', schema: CapsResponseSchema }
  });

  const output = response.output!;

  let html = output.content || '';
  const visualAids = output.visualAids || [];

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
        html = html.replace(tagRegex, '');
      }
    }
  }

  html = html.replace(/\[IMAGE:\s*VA\d+\]/gi, '');

  return {
    content: html,
    memo: output.memo || '',
    rubric: output.rubric || '',
  };
}
