'use server';

/**
 * @fileOverview Generates CAPS-compliant educational content with Google-native images.
 *
 * Image pipeline — 100% Google, zero external dependencies:
 *   Primary:  Imagen 4 Fast  (imagen-4.0-fast-generate-001) — high-quality, fast generation
 *   Fallback: Gemini 2.5 Flash Image (gemini-2.5-flash-image) — multimodal fallback
 *
 * Both models return images as base64 data URIs (data:image/png;base64,…)
 * which are embedded directly into the HTML as <img> tags.
 * No Pexels, Pixabay, or any external image service is used.
 */

import { z } from 'zod';
import { ai } from '@/genkit';
import { googleAI } from '@genkit-ai/google-genai';

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
  memo?: string;
  rubric?: string;
};

const CapsResponseSchema = z.object({
  content: z.string().describe(
    'HTML educational content with [IMAGE:VA1] placeholders where images should appear.'
  ),
  memo: z.string().optional().describe('HTML memo / answer key.'),
  rubric: z.string().optional().describe('HTML rubric with mark allocations.'),
  visualAids: z.array(z.object({
    id: z.string().describe('Matches [IMAGE:VAn] placeholder, e.g. "VA1".'),
    imagePrompt: z.string().describe(
      'Detailed, child-safe image generation prompt for a relevant educational illustration. ' +
      'Describe exactly what to show: scene, subjects, colours, style. ' +
      'Keep it concise (1–3 sentences). South African context where relevant.'
    ),
  })).describe('Images to generate and embed into the content.'),
});

async function generateImage(prompt: string, subject: string, grade: string): Promise<string> {
  const enrichedPrompt = [
    `Educational illustration for South African Grade ${grade} ${subject}.`,
    prompt,
    'Style: bright, clear, child-friendly flat illustration.',
    'No text overlays, no logos, no watermarks, no emojis.',
    'Suitable for printing on A4 classroom worksheets.',
    'Diverse South African children and environments where people are shown.',
  ].join(' ');

  // Primary: Imagen 4 Fast
  try {
    const response = await ai.generate({
      model: googleAI.model('imagen-4.0-fast-generate-001'),
      prompt: enrichedPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '16:9',
      },
      output: { format: 'media' },
    });
    if (response.media?.url) return response.media.url;
  } catch (e) {
    console.warn('Imagen 4 Fast failed, trying Gemini 2.5 Flash Image:', e);
  }

  // Fallback: Gemini 2.5 Flash Image
  try {
    const response = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-image'),
      prompt: enrichedPrompt,
      config: { responseModalities: ['IMAGE'] },
      output: { format: 'media' },
    });
    const parts = (response as any).candidates?.[0]?.message?.content ?? [];
    for (const part of parts) {
      if (part?.media?.url) return part.media.url;
    }
    if (response.media?.url) return response.media.url;
  } catch (e) {
    console.error('Gemini 2.5 Flash Image also failed:', e);
  }

  return '';
}

export async function generateCAPSContent(
  input: GenerateCAPSContentInput
): Promise<GenerateCAPSContentOutput> {
  try {
    const response = await ai.generate({
      model: googleAI.model('gemini-3.1-pro-preview'),
      output: { schema: CapsResponseSchema },
      system: `You are an expert South African CAPS curriculum designer for Grades R–12.

CONTENT RULES:
- Strictly align to the South African CAPS curriculum for the specified grade, subject and term.
- Use South African English (colour, realise, learner, maths, organise, etc.).
- Use South African contexts: names (Sipho, Aisha, Zanele, Pieter, Thabo), provinces, ZAR, SA flora/fauna.
- Adapt language and cognitive demand to CAPS phase requirements:
  * Grades R–3: Simple vocabulary, concrete examples, scaffolded instructions, playful tone.
  * Grades 4–6: Learner-friendly text, semi-formal, problem-solving.
  * Grades 7–9: Higher-order thinking, critical analysis, formal register.
  * Grades 10–12: High academic rigour, NSC exam-style phrasing, Bloom's Taxonomy levels 4–6.

OUTPUT FORMAT:
- Output "content" as clean HTML using proper tags: <h1>–<h3>, <p>, <ul>, <ol>, <li>, <table>, <strong>, <em>, <hr>.
- Include a school header with subject, grade, topic and date line.
- For assessments/worksheets: number questions with <h3>Question 1</h3> tags.
- For lesson plans: use clearly labelled phase sections (Hook, Instruction, Guided Practice, etc.).
- Always produce a complete memo in "memo" and a mark rubric in "rubric".
- Make content immediately printable and classroom-ready.

IMAGE RULES (CRITICAL):
- Place 2–4 image placeholders at natural teaching points: [IMAGE:VA1], [IMAGE:VA2], etc.
- In "visualAids", give each placeholder a concise, vivid image generation prompt (1–3 sentences).
- The prompt must describe a concrete educational scene or diagram, NOT an abstract concept.
- Good example: "A South African classroom showing a teacher pointing to a number line on the chalkboard with Grade 3 learners seated at desks raising their hands."
- Bad example: "An image representing mathematics learning."
- ALWAYS populate the visualAids array — never leave it empty if images would help learning.`,

      prompt: `Generate a ${input.contentType} for Grade ${input.grade}.
Subject: ${input.subject}
Topic: ${input.topic}
Category: ${input.category}
Term: ${input.term || 'Not specified'}
Language of Instruction: ${input.language || 'English'}
Objective: ${input.objective || 'Not specified'}
Learner Profile: ${input.learnerProfile || 'General class'}
Length / Duration: ${input.duration || 'Default (30-min / 10 questions)'}
Additional Instructions: ${input.additionalInstructions || 'None'}
Teacher: ${input.teacherName || 'Educator'}`,
    });

    if (!response.output) {
      throw new Error('Content generation returned no structured output.');
    }

    const { content: rawHtml, memo, rubric, visualAids } = response.output;
    let finalHtml = rawHtml || '';

    if (visualAids && visualAids.length > 0) {
      const imageResults = await Promise.all(
        visualAids.map(async (aid) => ({
          id: aid.id,
          prompt: aid.imagePrompt,
          dataUri: await generateImage(aid.imagePrompt, input.subject, input.grade),
        }))
      );

      for (const result of imageResults) {
        const tagRegex = new RegExp(`\\[IMAGE:\\s*${result.id}\\]`, 'gi');
        if (result.dataUri) {
          const imgHtml = `<div class="my-6 text-center">
  <img
    src="${result.dataUri}"
    alt="Educational illustration: ${result.prompt.substring(0, 80)}"
    class="rounded-xl shadow-lg mx-auto max-h-[400px] w-auto"
    style="max-width:100%;height:auto;"
  />
</div>`;
          finalHtml = finalHtml.replace(tagRegex, imgHtml);
        } else {
          finalHtml = finalHtml.replace(tagRegex, '');
        }
      }
    }

    finalHtml = finalHtml.replace(/\[IMAGE:\s*VA\d+\]/gi, '');

    return { content: finalHtml, memo: memo || '', rubric: rubric || '' };

  } catch (error) {
    console.error('generateCAPSContent error:', error);
    throw new Error(
      `Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}