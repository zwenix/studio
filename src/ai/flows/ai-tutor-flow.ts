'use server';

import { z } from 'zod';
import { ai } from '../../genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { buildTutorPrompt } from '@/ai/prompts';

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
    const promptParams = buildTutorPrompt({
      learnerMessage: input.query,
      language: input.language,
    });

    const response = await ai.generate({
      model: googleAI.model('gemini-2.0-flash'), // Using a more stable model for tutoring
      system: promptParams.systemInstruction,
      messages: [
        ...historyMessages,
        { role: 'user', content: [{ text: promptParams.userPrompt }] },
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
