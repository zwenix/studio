'use server';

/**
 * @fileOverview CAPS-compliant educational content generator.
 * Uses Gemini 1.5 Pro with structured JSON output for 100% reliable rendering.
 *
 * Image pipeline (in priority order):
 *  1. Gemini 2.0 Flash Image Generation  — AI-generated, perfectly on-topic
 *  2. Pexels photo search                — high-quality photography fallback
 *  3. Pixabay photo search               — secondary photography fallback
 *  4. Empty string                       — placeholder removed silently
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
  useAiImages: z.boolean().optional().default(true),
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

// The public output strips visualAids (resolved internally into HTML before returning)
export type GenerateCAPSContentOutput = {
  content: string;
  memo: string;
  rubric: string;
};

// ─── Image Generation via Gemini 2.0 Flash ───────────────────────────────────

/**
 * Generates an educational image using Gemini 2.0 Flash Image Generation.
 * The GEMINI_API_KEY is auto-injected by Firebase App Hosting via apphosting.yaml.
 * Returns a base64 data URI on success, or empty string on failure.
 */
async function generateImageWithGemini(query: string, grade: string, subject: string): Promise<string> {
  try {
    // Firebase App Hosting auto-injects GEMINI_API_KEY — fall back to common variants
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;

    if (!apiKey) {
      console.warn('No Gemini API key found for image generation. Falling back to photo search.');
      return '';
    }

    const prompt = `Create an educational illustration for South African learners in ${grade}, subject: ${subject}.
Topic: "${query}".
Requirements:
- Age-appropriate, inclusive, and culturally relevant to South Africa
- Simple, clear, high-contrast visuals suitable for classroom use or printing
- No text overlays (text will be added separately by the teacher)
- CAPS curriculum aligned visual representation
- Bright, engaging style appropriate for learners in diverse school environments
Style: Clean educational illustration, friendly colours, accessible design.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Gemini image generation failed:', response.status, errText.substring(0, 200));
      return '';
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData);

    if (!imagePart?.inlineData) return '';

    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  } catch (e) {
    console.error('Gemini image generation exception:', e);
    return '';
  }
}

// ─── Photo Search Fallbacks ───────────────────────────────────────────────────

async function fetchPhotoFromPexels(query: string): Promise<string> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (!pexelsKey) return '';
  try {
    const client = createClient(pexelsKey);
    const response = await client.photos.search({ query, per_page: 1, orientation: 'landscape' });
    if ('photos' in response && response.photos.length > 0) {
      return response.photos[0].src.large;
    }
  } catch (e) {
    console.error('Pexels failed:', e);
  }
  return '';
}

async function fetchPhotoFromPixabay(query: string): Promise<string> {
  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (!pixabayKey) return '';
  try {
    const url = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.hits?.length > 0) return data.hits[0].largeImageURL;
  } catch (e) {
    console.error('Pixabay failed:', e);
  }
  return '';
}

/**
 * Full image resolution pipeline:
 * Gemini AI Image → Pexels → Pixabay → '' (silent removal)
 */
async function resolveImage(
  query: string,
  grade: string,
  subject: string,
  useAiImages: boolean
): Promise<{ url: string; source: 'gemini' | 'pexels' | 'pixabay' | 'none' }> {
  if (useAiImages) {
    const geminiUrl = await generateImageWithGemini(query, grade, subject);
    if (geminiUrl) return { url: geminiUrl, source: 'gemini' };
  }

  const pexelsUrl = await fetchPhotoFromPexels(query);
  if (pexelsUrl) return { url: pexelsUrl, source: 'pexels' };

  const pixabayUrl = await fetchPhotoFromPixabay(query);
  if (pixabayUrl) return { url: pixabayUrl, source: 'pixabay' };

  return { url: '', source: 'none' };
}

// ─── Main Flow ────────────────────────────────────────────────────────────────

export async function generateCAPSContent(
  input: GenerateCAPSContentInput
): Promise<GenerateCAPSContentOutput> {

  // Step 1: Generate the structured text content
  let response;
  try {
    response = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      output: { schema: GenerateCAPSContentOutputSchema },
      system: `You are an expert South African teacher and CAPS curriculum designer.
      
      CONTENT RULES:
      - Strictly align to the South African CAPS curriculum.
      - Use South African English (colour, learner, Grade, etc.).
      - Use ZAR/Rands for any financial examples.
      - Return substantive, high-density HTML content.
      
      IMAGE RULES:
      - Insert [IMAGE:VA1], [IMAGE:VA2] etc. where visuals enhance learning (2–4 per document).
      - Provide a clear, specific English description in the visualAids array for each placeholder.
      - Descriptions must be detailed enough to generate or find the perfect educational image.`,
      prompt: `Generate a ${input.contentType} for Grade ${input.grade}.
      Subject: ${input.subject}
      Topic: ${input.topic}
      Term: ${input.term || 'N/A'}
      Language: ${input.language || 'English'}
      Objective: ${input.objective || 'N/A'}
      Learner Profile: ${input.learnerProfile || 'General class'}
      Length & Duration: ${input.duration || '30 minutes / 10 items'}
      Instructions: ${input.additionalInstructions || 'None'}`,
    });
  } catch (error) {
    console.error('CAPS content generation error:', error);
    throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const output = response.output;
  if (!output) throw new Error('AI failed to generate content structure.');

  let html = output.content;

  // Step 2: Resolve all images in parallel (non-blocking)
  if (output.visualAids.length > 0) {
    const useAiImages = input.useAiImages ?? true;

    const imageResults = await Promise.all(
      output.visualAids.map(async (va) => {
        const { url, source } = await resolveImage(
          va.query,
          input.grade,
          input.subject,
          useAiImages
        );
        return { id: va.id, url, source, query: va.query };
      })
    );

    // Step 3: Inject resolved images into HTML
    for (const img of imageResults) {
      const tagRegex = new RegExp(`\\[IMAGE:\\s*${img.id}\\]`, 'gi');
      if (img.url) {
        const sourceBadge =
          img.source === 'gemini'
            ? `<span style="background:#e8f5e9;color:#2e7d32;font-size:10px;padding:2px 7px;border-radius:4px;font-weight:bold;display:inline-block;">✦ AI Generated</span>`
            : `<span style="font-size:10px;color:#aaa;display:inline-block;">${img.source}</span>`;

        const imgHtml = `<div class="my-6 text-center no-print">
          <img
            src="${img.url}"
            alt="${img.query}"
            class="rounded-xl shadow-lg mx-auto border-4 border-white"
            style="max-height:400px;width:auto;height:auto;max-width:100%;"
          />
          <div class="mt-2 flex items-center justify-center gap-2 flex-wrap">
            ${sourceBadge}
            <p class="text-xs text-muted-foreground italic">${img.query}</p>
          </div>
        </div>`;
        html = html.replace(tagRegex, imgHtml);
      } else {
        html = html.replace(tagRegex, '');
      }
    }
  }

  // Step 4: Cleanup any stray unresolved placeholders
  html = html.replace(/\[IMAGE:\s*VA\d+\]/gi, '');

  return {
    content: html,
    memo: output.memo,
    rubric: output.rubric,
  };
}
