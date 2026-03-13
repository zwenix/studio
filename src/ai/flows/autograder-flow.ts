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
Grade the assignment, provide detailed feedback, and state the rubric used.
${input.culturalContextIntegration ? 'Use a positive, encouraging, culturally sensitive tone relevant to South Africa.' : ''}
Return ONLY a JSON object: { "grade": "<score/percentage>", "feedback": "<HTML feedback>", "rubric": "<HTML rubric used>" }`,
    },
    {
      role: 'user',
      content: `Subject: ${input.subject || 'General'}
Grade Level: ${input.grade || 'N/A'}

Grading Instructions / Memo:
${input.gradingInstructions}

Student's Submission:
${input.assignmentContent}`,
    },
  ]);
}
