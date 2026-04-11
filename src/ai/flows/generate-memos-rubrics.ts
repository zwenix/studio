'use server';

/**
 * Memos & Rubrics Generator
 * Original system prompt preserved verbatim.
 * Transport: Genkit removed → direct Anthropic + Groq via /lib/ai.ts
 */

import { generateJSON } from '@/lib/ai';

export type GenerateMemosAndRubricsInput = {
  taskDescription: string;
  gradeLevel:      string;
  subject:         string;
  capsCompliance?: string;
};

export type GenerateMemosAndRubricsOutput = {
  memo:   string;
  rubric: string;
};

export async function generateMemosAndRubrics(
  input: GenerateMemosAndRubricsInput
): Promise<GenerateMemosAndRubricsOutput> {

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  ORIGINAL SYSTEM PROMPT — preserved verbatim from generate-memos-       ║
  // ║  rubrics.ts                                                              ║
  // ╚══════════════════════════════════════════════════════════════════════════╝
  const systemPrompt = `You are an expert South African CAPS-compliant educational assistant. Generate a detailed Memo and Rubric in clean HTML.`;

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  ORIGINAL USER PROMPT — preserved verbatim                              ║
  // ╚══════════════════════════════════════════════════════════════════════════╝
  const userPrompt = `Task: ${input.taskDescription}
Grade: ${input.gradeLevel}
Subject: ${input.subject}`;

  return generateJSON<GenerateMemosAndRubricsOutput>(userPrompt, systemPrompt, {
    maxTokens: 4096,
  });
}
