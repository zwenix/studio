'use server';

/**
 * @fileOverview An autograding AI agent.
 *
 * - autograde - A function that grades an assignment.
 * - AutogradeInput - The input type for the autograde function.
 * - AutogradeOutput - The return type for the autograde function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutogradeInputSchema = z.object({
  assignmentContent: z.string().describe('The content of the student assignment.'),
  gradingInstructions: z.string().describe('The instructions for grading the assignment.'),
  subject: z.string().optional().describe('The subject of the assignment.'),
  grade: z.string().optional().describe('The grade level for the assignment.'),
});
export type AutogradeInput = z.infer<typeof AutogradeInputSchema>;

const AutogradeOutputSchema = z.object({
  grade: z.string().describe('The assigned grade or score.'),
  feedback: z.string().describe('Detailed feedback for the student.'),
  rubric: z.string().describe('The grading rubric that was applied.'),
});
export type AutogradeOutput = z.infer<typeof AutogradeOutputSchema>;

export async function autograde(
  input: AutogradeInput
): Promise<AutogradeOutput> {
  return autograderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'autograderPrompt',
  input: {schema: AutogradeInputSchema},
  output: {schema: AutogradeOutputSchema},
  prompt: `You are an expert AI for grading student assignments.
  
  Grade the following assignment based on the provided instructions. Provide a score, detailed feedback, and the rubric used for grading.

  Subject: {{{subject}}}
  Grade: {{{grade}}}
  
  Grading Instructions:
  {{{gradingInstructions}}}
  
  Student's Assignment:
  {{{assignmentContent}}}
  `,
});

const autograderFlow = ai.defineFlow(
  {
    name: 'autograderFlow',
    inputSchema: AutogradeInputSchema,
    outputSchema: AutogradeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
