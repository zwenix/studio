
'use server';

/**
 * @fileOverview An AI tutor flow that supports multiple languages.
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

const tutorPrompt = ai.definePrompt({
  name: 'tutorPrompt',
  input: { schema: AiTutorInputSchema },
  output: { schema: AiTutorOutputSchema },
  prompt: `You are an expert AI Tutor for students and teachers. Be helpful and answer questions clearly.
  
  Current Language: {{language}}
  
  {{#if history}}
  Conversation History:
  {{#each history}}
  {{role}}: {{content}}
  {{/each}}
  {{/if}}
  
  User Query: {{query}}
  
  Respond ONLY in the specified JSON format. Your response MUST be valid JSON with a single field 'response'.
  Respond in {{language}}.`,
});

const aiTutorFlow = ai.defineFlow(
  {
    name: 'aiTutorFlow',
    inputSchema: AiTutorInputSchema,
    outputSchema: AiTutorOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await tutorPrompt(input);
      if (!output) {
        throw new Error('The AI failed to generate a response. Please try again.');
      }
      return output;
    } catch (e) {
      console.error('AI Tutor Flow Error:', e);
      throw e;
    }
  }
);
