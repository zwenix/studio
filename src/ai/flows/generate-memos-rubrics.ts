'use server';

import { z } from 'zod';
import { groqGenerateJSON } from '@/ai/groq-client';

const GenerateMemosAndRubricsInputSchema = z.object({
  taskDescription: z.string(),
  gradeLevel: z.string(),
  subject: z.string(),
  capsCompliance: z.string().optional().default('Yes'),
});

export type GenerateMemosAndRubricsInput = z.infer<typeof GenerateMemosAndRubricsInputSchema>;
export type GenerateMemosAndRubricsOutput = { memo: string; rubric: string; };

export async function generateMemosAndRubrics(input: GenerateMemosAndRubricsInput): Promise<GenerateMemosAndRubricsOutput> {
  return groqGenerateJSON<GenerateMemosAndRubricsOutput>([
    {
      role: 'system',
      content: `You are an expert South African CAPS-compliant educational assistant.
Generate a detailed Memo (answers + explanations) and a Rubric (criteria + mark allocations) for the given task.
Use clean HTML. Use <h2> for headings, <p> and <ul> for content.
Return ONLY a JSON object: { "memo": "<HTML>", "rubric": "<HTML>" }`,
    },
    {
      role: 'user',
      content: `Task: ${input.taskDescription}
Grade: ${input.gradeLevel}
Subject: ${input.subject}
Ensure the rubric matches the cognitive level required for Grade ${input.gradeLevel}.`,
    },
  ]);
}
