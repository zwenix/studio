'use server';

/**
 * @fileOverview An AI tutor flow that supports multiple languages.
 *
 * - aiTutor - A function that handles the AI tutor chat.
 * - AiTutorInput - The input type for the aiTutor function.
 * - AiTutorOutput - The return type for the aiTutor function.
 */

import {ai} from '@/ai/genkit';
import { z } from 'genkit';

const AiTutorInputSchema = z.object({
  query: z.string().describe('The user query to the AI tutor.'),
  language: z.string().describe('The language for the AI tutor to respond in.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe('The conversation history.'),
});
export type AiTutorInput = z.infer<typeof AiTutorInputSchema>;

const AiTutorOutputSchema = z.object({
  response: z.string().describe('The AI tutor response.'),
});
export type AiTutorOutput = z.infer<typeof AiTutorOutputSchema>;

export async function aiTutor(input: AiTutorInput): Promise<AiTutorOutput> {
  return aiTutorFlow(input);
}

const aiTutorFlow = ai.defineFlow(
  {
    name: 'aiTutorFlow',
    inputSchema: AiTutorInputSchema,
    outputSchema: AiTutorOutputSchema,
  },
  async ({ query, history, language }) => {
    const systemPrompt = `You are an expert AI Tutor for students and teachers. Be helpful and answer questions clearly.

Respond in the following language: ${language}`;

    // Build the messages array in the format the current Genkit version expects.
    // System prompt → conversation history → current user query, all in one array.
    const messages: { role: 'user' | 'model'; content: { text: string }[] }[] = [
      // Inject system prompt as the opening user/model exchange so it is
      // always respected regardless of Genkit version.
      { role: 'user',  content: [{ text: systemPrompt }] },
      { role: 'model', content: [{ text: 'Understood. I am ready to help.' }] },
      // Append any prior conversation turns
      ...(history?.map(message => ({
        role: message.role,
        content: [{ text: message.content }],
      })) ?? []),
      // Add the current query as the final user message
      { role: 'user', content: [{ text: query }] },
    ];

    const { output } = await ai.generate({
      messages,
      output: {
        schema: AiTutorOutputSchema,
      },
    });

    return output!;
  }
);
