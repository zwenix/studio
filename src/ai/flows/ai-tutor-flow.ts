'use server';

/**
 * @fileOverview AI Tutor flow — real-time CAPS-aligned tutoring.
 *
 * Model (per chat.txt): gemini-3.1-flash
 * Rationale: Flash provides the lowest latency for back-and-forth dialogue.
 * "Thinking time feels like a lag" in live tutoring — Flash is the right choice here.
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
      // gemini-3.1-flash: lowest latency for real-time tutoring dialogue (per chat.txt)
      model: googleAI.model('gemini-3.1-flash'),
      system: `You are an expert AI Tutor for South African students and teachers.

CRITICAL RULE: All your explanations, teaching methods, terminology, and examples MUST strictly align with the South African CAPS (Curriculum and Assessment Policy Statement) curriculum for the appropriate grade level.

TUTORING RULES:
- Be helpful, encouraging, and answer questions clearly and concisely.
- Use South African English spelling at all times (colour, maths, realise, etc.).
- Use South African contexts and examples (local names, ZAR, SA geography, SA history).
- Use BODMAS (not PEMDAS) for mathematics.
- Adapt your explanation depth and vocabulary to the learner's grade level.
Always respond in: ${input.language}.`,
      messages: [
        ...historyMessages,
        { role: 'user', content: [{ text: input.query }] },
      ],
    });

    const text = response.text;
    if (!text) throw new Error('AI Tutor returned no response.');
    return { response: text };
  } catch (error) {
    console.error('AI Tutor error:', error);
    throw new Error(
      `AI Tutor failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
