'use server';

/**
 * @fileOverview Generates CAPS-compliant educational content using Gemini 1.5 Pro.
 */

import { z } from 'zod';
import { ai } from '@/genkit';
import { createClient } from 'pexels';
import { googleAI } from '@genkit-ai/google-genai';

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

export type GenerateCAPSContentOutput = {
  content: string;
  memo: string;
  rubric: string;
};

const CapsResponseSchema = z.object({
  content: z.string().describe('HTML content with [IMAGE:VA1] placeholders'),
  memo: z.string().describe('HTML memo with answers'),
  rubric: z.string().describe('HTML rubric with criteria'),
  visualAids: z.array(z.object({
    id: z.string(),
    query: z.string().describe('English search query for the image'),
  })).optional().default([]),
});

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
  return '';
}

export async function generateCAPSContent(input: GenerateCAPSContentInput): Promise<GenerateCAPSContentOutput> {
  const response = await ai.generate({
    model: googleAI.model('gemini-1.5-pro'),
    output: { format: 'json', schema: CapsResponseSchema },
    system: `You are an expert South African teacher and CAPS curriculum designer.
    RULES:
    - Strictly align to the South African CAPS curriculum.
    - Use South African English spelling.
    - Insert [IMAGE:VA1] tags where visual aids would enhance learning.
    - If no duration/length is provided, default to 30 mins / 10 questions.`,
    prompt: `Generate a ${input.contentType} for Grade ${input.grade}.
    Subject: ${input.subject}
    Topic: ${input.topic}
    Category: ${input.category}
    Term: ${input.term || 'N/A'}
    Language: ${input.language || 'English'}
    Objective: ${input.objective || 'N/A'}
    Length & Duration: ${input.duration || 'Default (30 min / 10 items)'}
    Additional Instructions: ${input.additionalInstructions || 'None'}`,
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
