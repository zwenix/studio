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

export const maxDuration = 120; // Increase timeout for complex generation

const GenerateMemosAndRubricsInputSchema = z.object({
  taskDescription: z
    .string()
    .describe('The description of the task or assessment.'),
  gradeLevel: z.string().describe('The grade level for the task.'),
  subject: z.string().describe('The subject of the task.'),
  capsCompliance: z.string().optional().default('Yes').describe('The CAPS compliance for the task.'),
});
export type GenerateMemosAndRubricsInput = z.infer<
  typeof GenerateMemosAndRubricsInputSchema
>;

const GenerateMemosAndRubricsOutputSchema = z.object({
  memo: z.string().describe('The generated memo for the task in HTML format.'),
  rubric: z.string().describe('The generated rubric for the task in HTML format.'),
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
  prompt: `You are an expert South African educational assistant (CAPS compliant). 
  
  Generate a detailed Memo (with answers and explanations) and a Rubric (with clear criteria and point allocations) for the following task.
  
  **FORMAT:** Return the output as clean HTML. Use <h2> for headings and <p>/<ul> for content.
  
  Task Description: {{{taskDescription}}}
  Grade Level: {{{gradeLevel}}}
  Subject: {{{subject}}}
  
  Ensure the rubric is fair and matches the cognitive levels required for Grade {{{gradeLevel}}}.`,
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
