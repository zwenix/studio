'use server';

/**
 * @fileOverview Generates mock assessments for students to practice.
 *
 * - generateMockAssessment - A function that generates a mock assessment.
 * - GenerateMockAssessmentInput - The input type for the generateMockAssessment function.
 * - GenerateMockAssessmentOutput - The return type for the generateMockAssessment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GradeSchema = z.enum([
  'R', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
]);

const GenerateMockAssessmentInputSchema = z.object({
  grade: GradeSchema.describe('The grade level for the practice assessment.'),
  subject: z.string().describe('The subject for the practice assessment.'),
  topic: z.string().describe('The specific topic within the subject.'),
  difficulty: z.string().optional().describe('The difficulty level for the assessment (e.g., Easy, Medium, Hard).'),
});

export type GenerateMockAssessmentInput = z.infer<typeof GenerateMockAssessmentInputSchema>;

const GenerateMockAssessmentOutputSchema = z.object({
  content: z.string().describe('The generated assessment questions in Markdown format.'),
  memo: z.string().describe('A generated memo with answers for the assessment in Markdown format.'),
  rubric: z.string().describe('A generated rubric for grading the assessment in Markdown format.'),
});

export type GenerateMockAssessmentOutput = z.infer<typeof GenerateMockAssessmentOutputSchema>;

export async function generateMockAssessment(
  input: GenerateMockAssessmentInput
): Promise<GenerateMockAssessmentOutput> {
  return generateMockAssessmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMockAssessmentPrompt',
  input: {schema: GenerateMockAssessmentInputSchema},
  output: {schema: GenerateMockAssessmentOutputSchema},
  prompt: `You are an expert AI assistant that helps students prepare for their exams by creating practice assessments.

Your audience is students who are not technical. Therefore, you MUST generate the content in well-structured and easy-to-read **Markdown** format. Use headings (#, ##), lists (* or -), and bold text (**text**) to make the content clear.

Generate a short practice assessment based on the grade, subject, and topic specified.
The assessment should be designed to test the student's knowledge.

Grade: {{{grade}}}
Subject: {{{subject}}}
Topic: {{{topic}}}
{{#if difficulty}}
Difficulty: {{{difficulty}}}
{{/if}}

You MUST generate the assessment questions, a detailed memo with the correct answers, and a comprehensive grading rubric. All parts should be in clear Markdown format.`,
});

const generateMockAssessmentFlow = ai.defineFlow(
  {
    name: 'generateMockAssessmentFlow',
    inputSchema: GenerateMockAssessmentInputSchema,
    outputSchema: GenerateMockAssessmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
