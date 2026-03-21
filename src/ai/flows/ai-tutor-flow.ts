'use server';

/**
 * @fileOverview An AI tutor flow powered by Gemini 1.5 Pro via Genkit.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AiTutorInputSchema = z.object({
  query: z.string(),
  language: z.string(),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional(),
});
export type AiTutorInput = z.infer<typeof AiTutorInputSchema>;

const AiTutorOutputSchema = z.object({
  response: z.string(),
});
export type AiTutorOutput = z.infer<typeof AiTutorOutputSchema>;

export async function aiTutor(input: AiTutorInput): Promise<AiTutorOutput> {
  const history = (input.history ?? []).map(h => ({
    role: h.role,
    content: [{ text: h.content }]
  }));

  const response = await ai.generate({
    model: 'googleai/gemini-1.5-pro',
    system: `You are an expert AI Tutor for South African students and teachers. 
    Be helpful, encouraging, and answer questions clearly. 
    Always respond in: ${input.language}.`,
    prompt: input.query,
    history: history as any
  });

  return { response: response.text };
}