'use server';

/**
 * @fileOverview An AI tutor flow that supports multiple languages.
 *
 * - aiTutor - A function that handles the AI tutor chat.
 * - AiTutorInput - The input type for the aiTutor function.
 * - AiTutorOutput - The return type for the aiTutor function.
 */

import {ai} from '@/ai/genkit';
import { part, z } from 'genkit';

const AiTutorInputSchema = z.object({
  query: z.string().describe('The user query to the AI tutor.'),
  language: z.string().describe('The language for the AI tutor to respond in.'),
  // Corrected schema to match the client's `Message` type where `content` is a simple string.
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

    // Convert the message history (where content is a string) to the format Genkit expects (where content is an array of parts).
    const genkitHistory = history?.map(message => ({
        role: message.role,
        content: [part(message.content)]
    })) || [];


    const { output } = await ai.generate({
      system: systemPrompt,
      history: genkitHistory,
      prompt: query,
      output: {
        schema: AiTutorOutputSchema,
      },
    });

    return output!;
  }
);
