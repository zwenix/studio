'use server';

/**
 * @fileOverview Generates memos and rubrics using Groq.
 */

import { groqGenerateJSON } from '@/ai/groq-client';
import { z } from 'zod';

const GenerateMemosAndRubricsInputSchema = z.object({
  taskDescription: z.string(),
  gradeLevel: z.string(),
  subject: z.string(),
  capsCompliance: z.string().optional().default('Yes'),
});
export type GenerateMemosAndRubricsInput = z.infer<typeof GenerateMemosAndRubricsInputSchema>;

const GenerateMemosAndRubricsOutputSchema = z.object({
  memo: z.string(),
  rubric: z.string(),
});
export type GenerateMemosAndRubricsOutput = z.infer<typeof GenerateMemosAndRubricsOutputSchema>;

export async function generateMemosAndRubrics(input: GenerateMemosAndRubricsInput): Promise<GenerateMemosAndRubricsOutput> {
  const prompt = `You are an expert South African educational assistant (CAPS compliant). 
  
Generate a detailed Memo (with answers and explanations) and a Rubric (with clear criteria and point allocations) for the following task.
  
**FORMAT:** Return JSON with 'memo' and 'rubric' as clean HTML strings. Use <h2> for headings.
  
Task Description: ${input.taskDescription}
Grade Level: ${input.gradeLevel}
Subject: ${input.subject}
  
Ensure the rubric is fair and matches the cognitive levels required for Grade ${input.gradeLevel}.`;

  return groqGenerateJSON<GenerateMemosAndRubricsOutput>([
    { role: 'system', content: prompt }
  ]);
}
