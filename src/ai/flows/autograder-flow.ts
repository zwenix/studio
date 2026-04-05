'use server';

/**
 * FIX: z is now imported from 'genkit' (not raw 'zod').
 * Raw zod schemas used with Genkit's output: { schema: ... } can cause
 * silent validation failures on complex or nested schemas.
 */

import { z } from 'genkit'; // FIX: was 'zod'
import { ai } from '@/ai/genkit';

export const AutogradeInputSchema = z.object({
  assignmentContent: z.string(),
  gradingInstructions: z.string(),
  subject: z.string().optional(),
  grade: z.string().optional(),
  culturalContextIntegration: z.boolean().optional(),
});

export type AutogradeInput = z.infer<typeof AutogradeInputSchema>;
export type AutogradeOutput = { grade: string; feedback: string; rubric: string; };

export async function autograde(input: AutogradeInput): Promise<AutogradeOutput> {
  const response = await ai.generate({
    model: 'googleai/gemini-2.5-pro',
    system: `You are an expert AI grader for South African school assignments.
    ${input.culturalContextIntegration ? 'Use a positive, encouraging, culturally sensitive tone relevant to South Africa.' : ''}`,
    prompt: `Subject: ${input.subject || 'General'}
Grade Level: ${input.grade || 'N/A'}
Grading Instructions / Memo: ${input.gradingInstructions}
Student's Submission: ${input.assignmentContent}`,
    output: {
      format: 'json',
      schema: z.object({
        grade: z.string().describe('Score or percentage'),
        feedback: z.string().describe('HTML feedback'),
        rubric: z.string().describe('HTML rubric used'),
      }),
    },
  });

  if (!response.output) {
    throw new Error('Autograding returned no output. Please try again.');
  }

  return response.output;
}
