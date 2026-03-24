'use server';

/**
 * @fileOverview An AI Tutor flow using Gemini 1.5 Pro.
 */

import { ai } from '@/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';

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
  // Genkit 1.x requires history to be passed in the messages array
  const historyMessages = (input.history ?? []).map(h => ({
    role: h.role === 'model' ? 'model' as const : 'user' as const,
    content: [{ text: h.content }]
  }));

  try {
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
  } catch (error) {
    console.error('AI Tutor error:', error);
    throw new Error(`AI Tutor failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}