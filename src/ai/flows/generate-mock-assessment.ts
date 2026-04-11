'use server';

/**
 * Mock Assessment Generator
 * Original system prompt preserved verbatim.
 * Transport: Genkit removed → direct Anthropic + Groq via /lib/ai.ts
 */

import { generateJSON } from '@/lib/ai';

export type GenerateMockAssessmentInput = {
  grade:             string;
  subject:           string;
  topic:             string;
  difficulty?:       string;
  assessmentFormat?: string;
  length?:           string;
};

export type GenerateMockAssessmentOutput = {
  content: string;
  memo:    string;
  rubric:  string;
};

export async function generateMockAssessment(
  input: GenerateMockAssessmentInput
): Promise<GenerateMockAssessmentOutput> {

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  ORIGINAL SYSTEM PROMPT — preserved verbatim from generate-mock-        ║
  // ║  assessment.ts                                                           ║
  // ╚══════════════════════════════════════════════════════════════════════════╝
  const systemPrompt = `You are an expert South African educator creating CAPS-aligned practice assessments in HTML.
    For Grades R–7: use emojis, friendly headings.
    For Grades 8–12: formal structure.`;

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  ORIGINAL USER PROMPT — preserved verbatim                              ║
  // ╚══════════════════════════════════════════════════════════════════════════╝
  const userPrompt = `Grade: ${input.grade}
Subject: ${input.subject}
Topic: ${input.topic}
Difficulty: ${input.difficulty || 'Medium'}
Format: ${input.assessmentFormat || 'mixed'}
Questions: ${input.length || '10'}`;

  return generateJSON<GenerateMockAssessmentOutput>(userPrompt, systemPrompt, {
    maxTokens:   6144,
    temperature: 0.6,
  });
}
