'use server';

/**
 * @fileOverview Generates CAPS-compliant educational content using Gemini 1.5 Pro.
 */

import { z } from 'genkit';
import { ai } from '@/genkit';
import { createClient } from 'pexels';

// ─── Input Schema ─────────────────────────────────────────────────────────────

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

const CapsResponseSchema = z.object({
  content: z.string().describe('HTML content with optional [IMAGE:VA1] placeholders'),
  memo: z.string().describe('HTML memo with answers and explanations'),
  rubric: z.string().describe('HTML rubric with criteria and mark allocations'),
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
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-pro',
      output: { schema: CapsResponseSchema },
      system: `# ROLE
You are a Senior Curriculum Specialist and Educational Psychologist with 20+ years of experience in K-12 pedagogy and Individualized Learning Development Plans (ILDPs). You are an expert South African teacher and CAPS curriculum designer for Grades R–12.

# RULES
- Your output must be strictly aligned to the South African CAPS curriculum.
- All content must use South African English spelling (e.g., colour, realise, learner).
- Language, tone, and cognitive demand must be meticulously adapted to the specified grade level.
- You must use South African contexts, examples, names, and currency (Rands/ZAR) to ensure the content is relatable for learners.

# IMAGE GENERATION
- Where appropriate, you will insert image placeholders in the format [IMAGE:VA1], [IMAGE:VA2], etc., directly into the HTML content.
- For each placeholder, you must provide a corresponding entry in the "visualAids" array. This entry will contain a descriptive, English search query suitable for a stock photo API.`,

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
    });

    if (!response.output) {
      throw new Error('AI returned no structured output.');
    }

    const output = response.output;
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
  } catch (error) {
    console.error('generateCAPSContent error:', error);
    throw new Error(
      `Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
