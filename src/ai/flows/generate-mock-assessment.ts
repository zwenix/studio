'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';

const GradeSchema = z.enum(['R','1','2','3','4','5','6','7','8','9','10','11','12']);
const AssessmentFormatSchema = z.enum(['multiple choice','short answer','essay','fill in the blanks','true or false','worksheet','mixed']);

const GenerateMockAssessmentInputSchema = z.object({
  grade: GradeSchema,
  subject: z.string(),
  topic: z.string(),
  difficulty: z.string().optional(),
  assessmentFormat: AssessmentFormatSchema.optional(),
  length: z.string().optional(),
});

export type GenerateMockAssessmentInput = z.infer<typeof GenerateMockAssessmentInputSchema>;
export type GenerateMockAssessmentOutput = { content: string; memo: string; rubric: string; };

export async function generateMockAssessment(input: GenerateMockAssessmentInput): Promise<GenerateMockAssessmentOutput> {
  const response = await ai.generate({
    model: 'googleai/gemini-2.5-pro',
    system: `You are an expert South African educator creating CAPS-aligned practice assessments in HTML.
    For Grades R–7: use emojis, friendly headings.
    For Grades 8–12: formal structure.`,
    prompt: `Grade: ${input.grade}\nSubject: ${input.subject}\nTopic: ${input.topic}\nDifficulty: ${input.difficulty || 'Medium'}\nFormat: ${input.assessmentFormat || 'mixed'}\nQuestions: ${input.length || '10'}`,
    output: {
      format: 'json',
      schema: z.object({
        content: z.string(),
        memo: z.string(),
        rubric: z.string()
      })
    }
  });

  return response.output!;
}
