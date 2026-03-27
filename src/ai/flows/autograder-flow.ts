'use server';

/**
 * @fileOverview Autograder flow — CAPS-aligned assessment grading.
 *
 * Model (per chat.txt): gemini-3.1-pro-preview (Thinking Mode / high accuracy for rubric grading)
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

export async function autograde(input: AutogradeInput): Promise<AutogradeOutput> {
  try {
    const response = await ai.generate({
      // gemini-3.1-pro-preview: flagship model with high accuracy for rubric-based grading (per chat.txt)
      model: googleAI.model('gemini-3.1-pro-preview'),
      output: { schema: AutogradeOutputSchema },
      system: `You are a Senior Curriculum Specialist and expert AI grader for South African schools.

CRITICAL RULE: All grading, feedback, and rubrics MUST strictly align with the South African CAPS (Curriculum and Assessment Policy Statement) assessment guidelines and cognitive demand levels for the specified grade and subject.

GRADING RULES:
- Strictly analyse student work against a standard 4-point rubric: (1) Beginning, (2) Developing, (3) Proficient, (4) Distinguished.
- Provide encouraging, constructive feedback that is specific about where the learner went wrong and exactly how to improve.
- Use South African English spelling at all times.
- Mark allocations must follow CAPS norms for the subject and grade.
${input.culturalContextIntegration ? '- Use local South African contexts, names, and a culturally sensitive, encouraging tone.' : ''}`,
      prompt: `Subject: ${input.subject || 'General'}
Grade Level: ${input.grade || 'N/A'}
Instructions / Memo: ${input.gradingInstructions}
Student Submission: ${input.assignmentContent}`,
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
