'use server';

/**
 * @fileOverview Generates CAPS-aligned mock assessments.
 *
 * FIXES APPLIED:
 * 1. import { z } from 'genkit'  — NOT from 'zod'
 * 2. import { googleAI } + googleAI.model('gemini-1.5-flash-latest')
 * 3. output: { schema: ... }  — removed format:'json'
 * 4. assessmentFormat changed from z.enum to z.string().optional()
 */

import { z } from 'genkit';
import { ai } from '@/genkit';
import { googleAI } from '@genkit-ai/google-genai';

const GenerateMockAssessmentInputSchema = z.object({
  grade: z.string().describe('The grade level (R, 1–12, or custom).'),
  subject: z.string(),
  topic: z.string(),
  difficulty: z.string().optional(),
  assessmentFormat: z.string().optional(),
  length: z.string().optional(),
});

export type GenerateMockAssessmentInput = z.infer<typeof GenerateMockAssessmentInputSchema>;

export type GenerateMockAssessmentOutput = {
  content: string;
  memo: string;
  rubric: string;
};

const MockAssessmentResponseSchema = z.object({
  content: z.string().describe('HTML assessment content'),
  memo: z.string().describe('HTML memo with answers'),
  rubric: z.string().describe('HTML rubric with mark allocations'),
});

export async function generateMockAssessment(
  input: GenerateMockAssessmentInput
): Promise<GenerateMockAssessmentOutput> {
  try {
    const response = await ai.generate({
      model: googleAI.model('gemini-1.5-flash-latest'),
      output: { schema: MockAssessmentResponseSchema },
      system: `You are an expert South African educator creating CAPS-aligned practice assessments.

FORMAT RULES:
- For Grades R–7: use emojis, friendly headings, simple language, and scaffolded questions.
- For Grades 8–12: use formal academic structure appropriate for the subject.
- Always number questions clearly using heading tags (e.g. <h3>Question 1</h3>) so the
  auto-submission system can count them correctly.
- Return clean HTML only — no markdown fences.

CAPS COMPLIANCE:
- Strictly align question types, cognitive levels (knowledge, comprehension, application,
  analysis, synthesis, evaluation), and mark allocations to CAPS for the given grade and subject.
- Use South African contexts, names, and Rands (ZAR).`,

      prompt: `Generate a ${input.assessmentFormat || 'mixed'} practice assessment for Grade ${input.grade}.
Subject: ${input.subject}
Topic: ${input.topic}
Difficulty: ${input.difficulty || 'Medium'}
Number of Questions: ${input.length || '10'}`,
    });

    if (!response.output) {
      throw new Error('AI returned no structured output.');
    }

    return response.output;
  } catch (error) {
    console.error('generateMockAssessment error:', error);
    throw new Error(
      `Mock assessment generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
