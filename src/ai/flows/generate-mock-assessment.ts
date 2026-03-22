'use server';

import { z } from 'zod';
import { groqGenerateJSON } from '@/ai/groq-client';

const GenerateMockAssessmentInputSchema = z.object({
  grade: z.string(),
  subject: z.string(),
  topic: z.string(),
  difficulty: z.string().optional(),
  assessmentFormat: z.string().optional(),
  length: z.string().optional(),
});

export type GenerateMockAssessmentInput = z.infer<typeof GenerateMockAssessmentInputSchema>;
export type GenerateMockAssessmentOutput = { content: string; memo: string; rubric: string; };

export async function generateMockAssessment(input: GenerateMockAssessmentInput): Promise<GenerateMockAssessmentOutput> {
  return groqGenerateJSON<GenerateMockAssessmentOutput>([
    {
      role: 'system',
      content: `You are an expert South African educator creating CAPS-aligned practice assessments in HTML.
      For Grades R–7: use emojis, friendly headings, and font-patrick-hand style.
      For Grades 8–12: formal structure.`
    },
    {
      role: 'user',
      content: `Grade: ${input.grade}\nSubject: ${input.subject}\nTopic: ${input.topic}\nDifficulty: ${input.difficulty || 'Medium'}\nFormat: ${input.assessmentFormat || 'mixed'}\nQuestions: ${input.length || '10'}`
    }
  ], { max_tokens: 8192 });
}
