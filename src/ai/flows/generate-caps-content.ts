'use server';

/**
 * @fileOverview CAPS-compliant educational content generator.
 * Uses Gemini 1.5 Pro with structured JSON output for 100% reliable rendering.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';
import { createClient } from 'pexels';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const GenerateCAPSContentInputSchema = z.object({
  grade: z.string(),
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

const GenerateCAPSContentOutputSchema = z.object({
  content: z.string().describe('The main HTML content with [IMAGE:VA1] placeholders.'),
  memo: z.string().describe('The HTML memo/answer key.'),
  rubric: z.string().describe('The HTML grading rubric.'),
  visualAids: z.array(z.object({
    id: z.string(),
    query: z.string().describe('English search query for the image.')
  })).describe('Metadata for images to be injected.')
});

export type GenerateCAPSContentOutput = {
  content: string;
  memo: string;
  rubric: string;
};

// ─── Image Fetcher ────────────────────────────────────────────────────────────

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
      console.error('Pexels failed:', e);
    }
  }

  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (pixabayKey) {
    try {
      const url = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.hits?.length > 0) {
        return data.hits[0].largeImageURL;
      }
    } catch (e) {
      console.error('Pixabay failed:', e);
    }
  }

  return '';
}

// ─── Main Flow ────────────────────────────────────────────────────────────────

export async function generateCAPSContent(
  input: GenerateCAPSContentInput
): Promise<GenerateCAPSContentOutput> {

  const response = await ai.generate({
    model: googleAI.model('gemini-1.5-pro'),
    output: { schema: GenerateCAPSContentOutputSchema },
    system: `You are an expert South African teacher and CAPS curriculum designer.
    
    CONTENT RULES:
    - Strictly align to the South African CAPS curriculum.
    - Use South African English (colour, learner, Grade, etc.).
    - Use ZAR/Rands for any financial examples.
    - Return substantive, high-density HTML content.
    
    IMAGE RULES:
    - Insert [IMAGE:VA1], [IMAGE:VA2] etc. where visuals enhance learning.
    - Provide English search queries in the visualAids array.`,
    prompt: `Generate a ${input.contentType} for Grade ${input.grade}.
    Subject: ${input.subject}
    Topic: ${input.topic}
    Objective: ${input.objective || 'N/A'}
    Length & Duration: ${input.duration || '30 minutes / 10 items'}
    Instructions: ${input.additionalInstructions || 'None'}`,
  });

  const output = response.output;
  if (!output) throw new Error('AI failed to generate content structure.');

  let html = output.content;

  // Parallel Image Injection
  if (output.visualAids.length > 0) {
    const imageResults = await Promise.all(
      output.visualAids.map(async (va) => ({
        id: va.id,
        url: await fetchImage(va.query),
        query: va.query
      }))
    );

    for (const img of imageResults) {
      const tagRegex = new RegExp(`\\[IMAGE:\\s*${img.id}\\]`, 'gi');
      if (img.url) {
        const imgHtml = `<div class="my-6 text-center no-print">
          <img src="${img.url}" alt="${img.query}" class="rounded-xl shadow-lg mx-auto max-h-[400px] border-4 border-white" style="width:auto;height:auto;max-width:100%;" />
          <p class="text-xs text-muted-foreground mt-2 italic">${img.query}</p>
        </div>`;
        html = html.replace(tagRegex, imgHtml);
      } else {
        html = html.replace(tagRegex, '');
      }
    }
  }

  // Cleanup stray tags
  html = html.replace(/\[IMAGE:\s*VA\d+\]/gi, '');

  return {
    content: html,
    memo: output.memo,
    rubric: output.rubric,
  };
}
