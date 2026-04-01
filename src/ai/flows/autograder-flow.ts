'use server';

import { z } from 'zod';
import { ai } from '@/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { buildAutograderPrompt } from '@/ai/prompts';

export const AutogradeInputSchema = z.object({
  assignmentContent: z.string(),
  gradingInstructions: z.string(),
  subject: z.string().optional(),
  grade: z.string().optional(),
  culturalContextIntegration: z.boolean().optional(),
});

export type AutogradeInput = z.infer<typeof AutogradeInputSchema>;

const AutogradeOutputSchema = z.object({
  grade: z.string().describe('The grade assigned to the submission.'),
  feedback: z.string().describe('Constructive feedback for the student.'),
  rubric: z.string().describe('A rubric showing how the grade was determined.'),
});

export type AutogradeOutput = z.infer<typeof AutogradeOutputSchema>;

export async function autograde(input: AutogradeInput): Promise<AutogradeOutput> {
  try {
    const promptParams = buildAutograderPrompt({
      subject: input.subject || 'General',
      grade: input.grade || 'N/A',
      taskInstructions: input.gradingInstructions,
      memo: 'Use the task instructions as the grading criteria',
      rubric: '4-point rubric: (1) Beginning, (2) Developing, (3) Proficient, (4) Distinguished',
      learnerSubmission: input.assignmentContent,
    });

    const response = await ai.generate<AutogradeOutput>({
      model: 'googleai/gemini-pro-latest',
      system: promptParams.systemInstruction,
      prompt: promptParams.userPrompt,
      output: { schema: AutogradeOutputSchema },
    });

    if (!response.output) throw new Error('AI autograder returned no structured output.');
    return response.output;
  } catch (error) {
    console.error('AI Autograder error:', error);
    throw new Error(
      `AI Autograder failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}