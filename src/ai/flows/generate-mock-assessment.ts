'use server';

import { z } from 'zod';
import { groqGenerateJSON } from '@/ai/groq-client';

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
  return groqGenerateJSON<GenerateMockAssessmentOutput>([
    {
      role: 'system',
      content: `You are an expert South African educator creating CAPS-aligned practice assessments.

FORMATTING RULES:
- Return well-structured HTML ready for direct display.
- Use <h2>Question N</h2> for each question with <hr> separators.
- NO HTML tables for matching questions — use separate ordered lists instead.
- For Grades R–7: use emojis frequently, wrap content in <div class="font-patrick-hand">, use big friendly headings.
- For Grades 8–12: formal but clear structure.
- End content with: <hr><em style="font-size:9px;color:#666;">Created using EduAICompanion. All rights reserved by Zwelakhe Msuthu 2026.</em>

Return ONLY a JSON object: { "content": "<HTML questions>", "memo": "<HTML answers>", "rubric": "<HTML rubric>" }`,
    },
    {
      role: 'user',
      content: `Grade: ${input.grade}
Subject: ${input.subject}
Topic: ${input.topic}
Difficulty: ${input.difficulty || 'Medium'}
Format: ${input.assessmentFormat || 'mixed'}
Number of questions: ${input.length || '10'}`,
    },
  ], { max_tokens: 8192 });
}
