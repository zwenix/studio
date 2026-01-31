'use server';

/**
 * @fileOverview An AI tutor flow that supports multiple languages.
 *
 * - aiTutor - A function that handles the AI tutor chat.
 * - AiTutorInput - The input type for the aiTutor function.
 * - AiTutorOutput - The return type for the aiTutor function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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

const prompt = ai.definePrompt({
  name: 'aiTutorPrompt',
  input: {schema: AiTutorInputSchema},
  output: {schema: AiTutorOutputSchema},
  prompt: `You are an expert AI Tutor for students and teachers. Be helpful and answer questions clearly.

  Respond in the following language: {{{language}}}
  
  {{#if history}}
  Conversation History:
  {{#each history}}
  {{role}}: {{{content}}}
  {{/each}}
  {{/if}}

  User query: {{{query}}}
  `,
});

const aiTutorFlow = ai.defineFlow(
  {
    name: 'aiTutorFlow',
    inputSchema: AiTutorInputSchema,
    outputSchema: AiTutorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
