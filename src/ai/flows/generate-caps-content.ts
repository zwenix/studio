'use server';

import { z } from 'zod';
import { groqGenerateJSON } from '@/ai/groq-client';
import { createClient } from 'pexels';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Image fetcher (direct, no Genkit tool dependency) ───────────────────────

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

  // Step 1: Ask Groq to generate content WITH image placeholders and a clean visualAids array
  const output = await groqGenerateJSON<GroqCAPSResponse>(
    [
      {
        role: 'system',
        content: `You are an expert South African teacher and CAPS curriculum designer for Grades R–12.

CONTENT RULES:
- Strictly align to the South African CAPS curriculum.
- Use South African English spelling (colour, realise, learner, etc.).
- Adapt language and cognitive demand to the specified grade:
  - Grades R–1: Very simple words, concrete examples, matching/circling/colouring activities.
  - Grades 2–3: Simple sentences, scaffolded instructions.
  - Grades 4–7: Clear learner-friendly text, problem-solving, higher-order questions.
  - Grades 8–12: Subject-appropriate academic rigour.

IMAGE PLACEHOLDER RULES (CRITICAL):
- Where an image would enhance learning, insert a placeholder tag exactly like this: [IMAGE:VA1], [IMAGE:VA2], etc.
- Use 2 to 4 images per piece of content — place them at logical points in the HTML.
- In the "visualAids" array in your JSON response, list each image with its id and a detailed English search query.
- Example visualAids entry: { "id": "VA1", "query": "South African children learning mathematics classroom" }
- DO NOT include a VISUAL_AIDS text section in the content HTML — use only the JSON array.

OUTPUT FORMAT — return ONLY this JSON object, nothing else:
{
  "content": "<HTML string with [IMAGE:VA1] placeholders embedded at appropriate points>",
  "memo": "<HTML memo with answers and explanations>",
  "rubric": "<HTML rubric with criteria and mark allocations>",
  "visualAids": [
    { "id": "VA1", "query": "detailed search query for image 1" },
    { "id": "VA2", "query": "detailed search query for image 2" }
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
    ],
    { max_tokens: 8192, temperature: 0.7 }
  );

  // Step 2: Replace [IMAGE:VAx] placeholders with real images
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
      // Match both [IMAGE:VA1] and [IMAGE: VA1] (with or without space)
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

  // Step 3: Clean up any stray [IMAGE:VAx] tags that didn't get matched
  html = html.replace(/\[IMAGE:\s*VA\d+\]/gi, '');

  return {
    content: html,
    memo: output.memo || '',
    rubric: output.rubric || '',
  };
}