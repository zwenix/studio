'use server';

import { z } from 'zod';
import { groqGenerateJSON } from '@/ai/groq-client';

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
  return groqGenerateJSON<AutogradeOutput>([
    {
      role: 'system',
      content: `You are an expert AI grader for South African school assignments.
      Grade the work, provide feedback, and show the rubric.
      ${input.culturalContextIntegration ? 'Use a positive, encouraging, culturally sensitive tone relevant to South Africa.' : ''}`
    },
    {
      role: 'user',
      content: `Subject: ${input.subject || 'General'}\nGrade Level: ${input.grade || 'N/A'}\nGrading Instructions / Memo: ${input.gradingInstructions}\nStudent's Submission: ${input.assignmentContent}`
    }
  ]);
}
