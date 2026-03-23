'use server';

/**
 * @fileOverview AI Autograder flow using Gemini 1.5 Pro.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';

export const AutogradeInputSchema = z.object({
  assignmentContent: z.string(),
  gradingInstructions: z.string(),
  subject: z.string().optional(),
  grade: z.string().optional(),
  culturalContextIntegration: z.boolean().optional(),
});

export type AutogradeInput = z.infer<typeof AutogradeInputSchema>;

const AutogradeOutputSchema = z.object({
  grade: z.string().describe('The score or level awarded.'),
  feedback: z.string().describe('HTML feedback for the student.'),
  rubric: z.string().describe('HTML showing how criteria were applied.')
});

export type AutogradeOutput = z.infer<typeof AutogradeOutputSchema>;

export async function autograde(input: AutogradeInput): Promise<AutogradeOutput> {
  try {
    const response = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      output: { schema: AutogradeOutputSchema },
      system: `You are an expert AI grader for South African school assignments.
      Grade the work accurately and provide encouraging, constructive feedback.
      ${input.culturalContextIntegration ? 'Use local examples and a culturally sensitive tone.' : ''}`,
      prompt: `Subject: ${input.subject || 'General'}
      Grade Level: ${input.grade || 'N/A'}
      Instructions/Memo: ${input.gradingInstructions}
      Student Submission: ${input.assignmentContent}`,
    });

    if (!response.output) throw new Error('AI autograder returned no structured output.');
    return response.output;
  } catch (error) {
    console.error('AI Autograder error:', error);
    throw new Error(`AI Autograder failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
