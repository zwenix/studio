'use server';

import { z } from 'zod';
import { ai } from '@/genkit';
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
      // gemini-flash-latest = Gemini 3 Flash (per geminichat.txt alias table)
      // Fast, low-latency dialogue model — correct for real-time tutoring
      // Previously used gemini-flash-live-latest which DOES NOT EXIST in @genkit-ai/google-genai v1.31.0
      model: 'googleai/gemini-flash-latest',
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