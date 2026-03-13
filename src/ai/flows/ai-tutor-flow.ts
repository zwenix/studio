'use server';

/**
 * @fileOverview An AI tutor flow powered by Groq.
 */

import { groqGenerate } from '@/ai/groq-client';
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
  const historyMessages = (input.history ?? []).map(h => ({
    role: h.role === 'model' ? ('assistant' as const) : ('user' as const),
    content: h.content,
  }));

  const response = await groqGenerate([
    {
      role: 'system',
      content: `You are an expert AI Tutor for South African students and teachers. 
Be helpful, encouraging, and answer questions clearly. 
Always respond in: ${input.language}.`,
    },
    ...historyMessages,
    { role: 'user', content: input.query },
  ]);

  return { response };
}
