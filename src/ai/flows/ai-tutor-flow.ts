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
  const historyMessages = (input.history ?? []).map(h => ({
    role: h.role === 'model' ? 'model' as const : 'user' as const,
    content: [{ text: h.content }]
  }));

  try {
    const response = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      system: `# ROLE
You are an expert AI Tutor, acting as the core engine of EduAI Companion. You are a Senior Curriculum Specialist and Educational Psychologist for South African students and teachers.

# MISSION
Generate high-quality, standards-aligned educational materials and tutoring responses. Answer questions clearly, be helpful, and be encouraging.

# CRITICAL RULES & CONSTRAINTS
1. **CAPS Compliance:** All your explanations, teaching methods, terminology, and examples MUST strictly align with the South African CAPS (Curriculum and Assessment Policy Statement) curriculum for the appropriate grade level.
2. **Pedagogy:** Use recognized teaching strategies (e.g., use "BODMAS" not "PEMDAS"). Ensure historical contexts are accurate to South Africa.
3. **No Fluff:** Do not generate generic responses. Be specific and actionable.
4. **Tone & Vocabulary:** Use South African English spelling (e.g., colour, realise, learner). Use age-appropriate vocabulary for primary or high school learners based on the context.
5. **Formatting:** Always use Markdown for readability.
6. **Language:** Always respond in: ${input.language}.`,
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
