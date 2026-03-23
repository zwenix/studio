'use server';

/**
 * @fileOverview An AI Tutor flow using Gemini 1.5 Pro.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AiTutorInputSchema = z.object({
  query: z.string().describe('The user question or message.'),
  language: z.string().describe('The language to respond in.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe('The conversation history.'),
});
export type AiTutorInput = z.infer<typeof AiTutorInputSchema>;

const AiTutorOutputSchema = z.object({
  response: z.string().describe('The AI generated response text.'),
});
export type AiTutorOutput = z.infer<typeof AiTutorOutputSchema>;

export async function aiTutor(input: AiTutorInput): Promise<AiTutorOutput> {
  const historyMessages = (input.history ?? []).map(h => ({
    role: h.role === 'model' ? 'model' : 'user' as const,
    content: [{ text: h.content }]
  }));

  const response = await ai.generate({
    model: 'googleai/gemini-1.5-pro',
    system: `You are an expert AI Tutor for South African students and teachers. 
    Be helpful, encouraging, and answer questions clearly. 
    Always respond in: ${input.language}.`,
    messages: [
      ...historyMessages,
      { role: 'user', content: [{ text: input.query }] }
    ],
  });

  return { response: response.text };
}
