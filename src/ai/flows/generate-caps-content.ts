'use server';

/**
 * @fileOverview Generates CAPS-compliant educational content using the new AI Service.
 */

import { z } from 'zod';
import { ai } from '../../genkit';
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
});
export type GenerateCAPSContentInput = z.infer<
  typeof GenerateCAPSContentInputSchema
>;

const CapsResponseSchema = z.object({
  content: z.string().describe('The generated educational content in Markdown.'),
  visualAids: z
    .array(
      z.object({
        id: z.string().describe('The placeholder ID, e.g., VA1.'),
        query: z
          .string()
          .describe('A detailed query for an AI illustrator.'),
      })
    )
    .describe('A list of visual aids to be generated.'),
});

type CapsResponseType = z.infer<typeof CapsResponseSchema>;

export type GenerateCAPSContentOutput = {
  content: string;
  visualAids: { id: string; url: string }[];
};

async function fetchImage(query: string): Promise<string> {
  try {
    const imageResponse = await ai.generate({
      model: googleAI.model('imagen-3.0-generate-001'),
      prompt: `Create a high-resolution, vibrant, and educational classroom poster or illustration about: ${query}. Ensure it is safe for primary school children.`,
      output: { format: 'media' },
    });
    return imageResponse.media.url;
  } catch (e) {
    console.error('AI Image generation failed for query:', query, e);
    return '';
  }
}

export async function generateCAPSContent(
  input: GenerateCAPSContentInput
): Promise<GenerateCAPSContentOutput> {
  try {
    const response = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      output: { schema: CapsResponseSchema },
      system: `You are an expert South African Senior Curriculum Specialist and CAPS designer for Grades R–12.

      CRITICAL RULE: Every single piece of content generated MUST strictly adhere to the South African CAPS (Curriculum and Assessment Policy Statement) curriculum documents for the specific subject, grade, and term. 

      CONTENT RULES:
      - Use South African English spelling (colour, realise, learner, educator, etc.).
      - Use South African contexts, local names, provinces, and Rands (ZAR).
      - Adapt language and cognitive demand exactly to CAPS requirements for the specified grade:
        - Grades R–3 (Foundation Phase): Simple words, concrete examples, scaffolded instructions.
        - Grades 4–6 (Intermediate Phase): Clear learner-friendly text, basic problem-solving.
        - Grades 7–9 (Senior Phase): Higher-order questions, critical thinking.
        - Grades 10–12 (FET Phase): High academic rigour, exam-style phrasing aligned with past NSC papers.
      
      IMAGE PLACEHOLDER RULES:
      - Insert placeholder tags exactly like this: [IMAGE:VA1].
      - In the "visualAids" array, list each image with its id and a detailed English search query.`,

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
      throw new Error('Content generation returned no structured output.');
    }
    const { content, visualAids } = response.output;

    const imagePromises = visualAids.map(async (aid) => ({
      id: aid.id,
      url: await fetchImage(aid.query),
    }));

    const resolvedVisualAids = await Promise.all(imagePromises);

    return { content, visualAids: resolvedVisualAids };
  } catch (error) {
    console.error('generateCAPSContent error:', error);
    throw new Error(
      `Content generation failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}
