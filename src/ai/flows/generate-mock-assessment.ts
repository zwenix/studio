'use server';

/**
 * @fileOverview Generates CAPS-aligned mock assessments.
 *
 * FIX: Replaced z.enum() on assessmentFormat with z.string().optional() to
 * prevent Zod validation 500s when the client sends a value not in the old
 * hardcoded enum list.
 */

import { z } from 'zod';
import { ai } from '@/genkit';

const GenerateMockAssessmentInputSchema = z.object({
  grade: z.string().describe('The grade level (R, 1–12, or custom).'),
  subject: z.string(),
  topic: z.string(),
  difficulty: z.string().optional(),
  // Was z.enum([...]) — replaced with z.string() to avoid 500s on unknown values
  assessmentFormat: z.string().optional(),
  length: z.string().optional(),
});

export type GenerateMockAssessmentInput = z.infer<typeof GenerateMockAssessmentInputSchema>;

export type GenerateMockAssessmentOutput = {
  content: string;
  memo: string;
  rubric: string;
};

// AI output schema — visualAids optional with default [] for resilience
const MockAssessmentResponseSchema = z.object({
  content: z.string(),
  memo: z.string(),
  rubric: z.string(),
});

export async function generateMockAssessment(
  input: GenerateMockAssessmentInput
): Promise<GenerateMockAssessmentOutput> {
  const response = await ai.generate({
    model: 'googleai/gemini-2.5-pro',
    system: `You are an expert South African educator creating CAPS-aligned practice assessments.

FORMAT RULES:
- For Grades R–7: use emojis, friendly headings, simple language, and scaffolded questions.
- For Grades 8–12: use formal academic structure appropriate for the subject.
- Always number questions clearly using heading tags (e.g. <h3>Question 1</h3>) so the
  auto-submission system can count them.
- Return clean HTML only — no markdown fences.

CAPS COMPLIANCE:
- Strictly align question types, cognitive levels (knowledge, comprehension, application,
  analysis, synthesis, evaluation), and mark allocations to the CAPS curriculum for the
  given grade and subject.`,

    prompt: `Generate a ${input.assessmentFormat || 'mixed'} practice assessment for Grade ${input.grade}.
Subject: ${input.subject}
Topic: ${input.topic}
Difficulty: ${input.difficulty || 'Medium'}
Number of Questions: ${input.length || '10'}`,

    output: {
      format: 'json',
      schema: MockAssessmentResponseSchema,
    },
  });

  return response.output!;
}