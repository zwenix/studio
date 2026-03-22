'use server';

import { z } from 'zod';
import { groqGenerateJSON } from '@/ai/groq-client';
import { createClient } from 'pexels';

// ─── Types ────────────────────────────────────────────────────────────────────

const GradeSchema = z.string(); // Supports "Other" manual entry

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
  duration: z.string().optional(), // Length & Duration free text
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

// Internal type Groq returns — images as a clean separate array
type GroqCAPSResponse = {
  content: string;
  memo: string;
  rubric: string;
  visualAids: Array<{ id: string; query: string }>;
};

// ─── Image fetcher (direct API calls) ────────────────────────────────────────

async function fetchImage(query: string): Promise<string> {
  // 1. Try Pexels
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

  // 2. Fallback to Pixabay
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

  const output = await groqGenerateJSON<GroqCAPSResponse>(
    [
      {
        role: 'system',
        content: `You are an expert South African teacher and CAPS curriculum designer for Grades R–12.

CONTENT RULES:
- Strictly align to the South African CAPS curriculum.
- Use South African English spelling (colour, realise, learner, etc.).
- Adapt language and cognitive demand to the specified grade.
- Use South African contexts, names, and currency (Rands/ZAR).

LENGTH & DURATION RULES:
- If the user provided requirements for Length & Duration, strictly follow them.
- If blank, default to a 30-minute lesson/task and/or 10 questions/activities.

IMAGE PLACEHOLDER RULES (CRITICAL):
- Where an image enhances learning, insert a placeholder tag exactly like this: [IMAGE:VA1], [IMAGE:VA2], etc.
- Use 2 to 4 images per piece of content.
- In the "visualAids" array in your JSON response, list each image with its id and a detailed English search query.
- Example visualAids entry: { "id": "VA1", "query": "South African children learning mathematics classroom" }`,
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
Length & Duration: ${input.duration || 'Default (30 min / 10 items)'}
Additional Instructions: ${input.additionalInstructions || 'None'}`,
      },
    ],
    { max_tokens: 8192, temperature: 0.7 }
  );

  let html = output.content || '';
  const visualAids: Array<{ id: string; query: string }> = output.visualAids || [];

  if (visualAids.length > 0) {
    // Fetch all images in parallel for speed
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
        const imgHtml = `<div class="my-6 text-center no-print">
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
