'use server';

/**
 * @fileOverview An autograding AI agent powered by Groq.
 */

import { groqGenerateJSON } from '@/ai/groq-client';
import { z } from 'zod';

export const AutogradeInputSchema = z.object({
  assignmentContent: z.string(),
  gradingInstructions: z.string(),
  subject: z.string().optional(),
  grade: z.string().optional(),
  culturalContextIntegration: z.boolean().optional(),
});
export type AutogradeInput = z.infer<typeof AutogradeInputSchema>;

const AutogradeOutputSchema = z.object({
  grade: z.string(),
  feedback: z.string(),
  rubric: z.string(),
});
export type AutogradeOutput = z.infer<typeof AutogradeOutputSchema>;

export async function autograde(input: AutogradeInput): Promise<AutogradeOutput> {
  const prompt = `You are an expert AI for grading South African student assignments.
  
Grade the following assignment based on the provided instructions. Provide a score, detailed feedback, and the rubric used for grading.

${input.culturalContextIntegration ? '**Feedback Style:** Phrase all feedback in a positive, encouraging, and culturally sensitive tone. Where possible, relate feedback to a South African context.' : ''}

Subject: ${input.subject || 'General'}
Grade: ${input.grade || 'N/A'}
  
Grading Instructions:
${input.gradingInstructions}
  
Student's Assignment:
${input.assignmentContent}

FORMAT: Return JSON with fields 'grade', 'feedback', and 'rubric'.`;

  return groqGenerateJSON<AutogradeOutput>([
    { role: 'system', content: prompt }
  ]);
}
