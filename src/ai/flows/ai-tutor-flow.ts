'use server';

/**
 * @fileOverview An AI Tutor flow that uses the new AI Service.
 */

import { z } from 'zod';
import { ai } from '../../genkit';
import { googleAI } from '@genkit-ai/google-genai';

const AiTutorInputSchema = z.object({
  query: z.string().describe('The user question or message.'),
  language: z.string().describe('The language to respond in.'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.array(z.object({ text: z.string() })),
      })
    )
    .optional()
    .describe('The conversation history.'),
});
export type AiTutorInput = z.infer<typeof AiTutorInputSchema>;

const AiTutorOutputSchema = z.object({
  response: z.string().describe('The AI generated response text.'),
});
export type AiTutorOutput = z.infer<typeof AiTutorOutputSchema>;

export async function aiTutor(input: AiTutorInput): Promise<AiTutorOutput> {
  const historyMessages = input.history || [];
  try {
    const response = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      system: `You are an expert AI Tutor for South African students and teachers. 
      
      CRITICAL RULE: All your explanations, teaching methods, terminology, and examples MUST strictly align with the South African CAPS (Curriculum and Assessment Policy Statement) curriculum for the appropriate grade level.
      
      Be helpful, encouraging, and answer questions clearly. Use South African English spelling.
      Always respond in: ${input.language}.`,
      messages: [
        ...historyMessages,
        { role: 'user', content: [{ text: input.query }] },
      ],
    });
    const text = response.text();
    if (!text) {
      throw new Error('AI Tutor returned no response.');
    }
    return { response: text };
  } catch (error) {
    console.error('AI Tutor error:', error);
    throw new Error(
      `AI Tutor failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
