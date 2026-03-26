'use server';

/**
 * @fileOverview An Autograder flow that uses the new AI Service.
 */

import { z } from 'zod';
import { ai } from '../../genkit';
import { googleAI } from '@genkit-ai/google-genai';

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

export async function autograde(
  input: AutogradeInput
): Promise<AutogradeOutput> {
  try {
    const response = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      output: { schema: AutogradeOutputSchema },
      system: `You are a Senior Curriculum Specialist and expert AI grader for South African schools.
      
      CRITICAL RULE: All grading, feedback, and rubrics MUST strictly align with the South African CAPS (Curriculum and Assessment Policy Statement) assessment guidelines and cognitive demand levels for the specified grade and subject.
      
      Grade the work accurately and provide encouraging, constructive feedback. Use South African English spelling.
      ${
        input.culturalContextIntegration
          ? 'Use local South African contexts, names, and a culturally sensitive tone.'
          : ''
      }`,
      prompt: `Subject: ${input.subject || 'General'}
      Grade Level: ${input.grade || 'N/A'}
      Instructions/Memo: ${input.gradingInstructions}
      Student Submission: ${input.assignmentContent}`,
    });

    if (!response.output)
      throw new Error('AI autograder returned no structured output.');
    return response.output;
  } catch (error) {
    console.error('AI Autograder error:', error);
    throw new Error(
      `AI Autograder failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}
