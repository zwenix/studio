'use server';

/**
 * AI Autograder Flow
 * Original system prompt and user prompt preserved verbatim.
 * Transport: Genkit removed → direct Anthropic + Groq via /lib/ai.ts
 */

import { generateJSON } from '@/lib/ai';

export type AutogradeInput = {
  assignmentContent:           string;
  gradingInstructions:         string;
  subject?:                    string;
  grade?:                      string;
  culturalContextIntegration?: boolean;
};

export type AutogradeOutput = {
  grade:    string;
  feedback: string;
  rubric:   string;
};

export async function autograde(input: AutogradeInput): Promise<AutogradeOutput> {

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  ORIGINAL SYSTEM PROMPT — preserved verbatim from autograder-flow.ts    ║
  // ╚══════════════════════════════════════════════════════════════════════════╝
  const systemPrompt = `You are an expert AI grader for South African school assignments.
    ${input.culturalContextIntegration ? 'Use a positive, encouraging, culturally sensitive tone relevant to South Africa.' : ''}`;

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  ORIGINAL USER PROMPT — preserved verbatim                              ║
  // ╚══════════════════════════════════════════════════════════════════════════╝
  const userPrompt = `Subject: ${input.subject || 'General'}
Grade Level: ${input.grade || 'N/A'}
Grading Instructions / Memo: ${input.gradingInstructions}
Student's Submission: ${input.assignmentContent}`;

  return generateJSON<AutogradeOutput>(userPrompt, systemPrompt, {
    maxTokens: 4096,
  });
}
