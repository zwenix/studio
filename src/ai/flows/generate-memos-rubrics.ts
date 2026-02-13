'use server';

/**
 * @fileOverview Generates memos and rubrics for teacher-uploaded content.
 *
 * - generateMemosAndRubrics - A function that generates memos and rubrics.
 * - GenerateMemosAndRubricsInput - The input type for the generateMemosAndRubrics function.
 * - GenerateMemosAndRubricsOutput - The return type for the generateMemosAndRubrics function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMemosAndRubricsInputSchema = z.object({
  taskDescription: z
    .string()
    .describe('The description of the task or assessment.'),
  gradeLevel: z.string().describe('The grade level for the task.'),
  subject: z.string().describe('The subject of the task.'),
  capsCompliance: z.string().describe('The CAPS compliance for the task.'),
});
export type GenerateMemosAndRubricsInput = z.infer<
  typeof GenerateMemosAndRubricsInputSchema
>;

const GenerateMemosAndRubricsOutputSchema = z.object({
  memo: z.string().describe('The generated memo for the task.'),
  rubric: z.string().describe('The generated rubric for the task.'),
});
export type GenerateMemosAndRubricsOutput = z.infer<
  typeof GenerateMemosAndRubricsOutputSchema
>;

export async function generateMemosAndRubrics(
  input: GenerateMemosAndRubricsInput
): Promise<GenerateMemosAndRubricsOutput> {
  return generateMemosAndRubricsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMemosAndRubricsPrompt',
  input: {schema: GenerateMemosAndRubricsInputSchema},
  output: {schema: GenerateMemosAndRubricsOutputSchema},
  prompt: `You are an AI assistant helping teachers to generate memos and rubrics for their tasks and assessments. The content must be CAPS compliant.

Task Description: {{{taskDescription}}}
Grade Level: {{{gradeLevel}}}
Subject: {{{subject}}}
CAPS Compliance: {{{capsCompliance}}}

Generate a detailed memo and rubric for the task described above. The memo should include the correct answers and explanations. The rubric should include the criteria for assessment and the points for each criterion.

Memo:
Rubric: `,
});

const generateMemosAndRubricsFlow = ai.defineFlow(
  {
    name: 'generateMemosAndRubricsFlow',
    inputSchema: GenerateMemosAndRubricsInputSchema,
    outputSchema: GenerateMemosAndRubricsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
