'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';

const GenerateMemosAndRubricsInputSchema = z.object({
  taskDescription: z.string(),
  gradeLevel: z.string(),
  subject: z.string(),
  capsCompliance: z.string().optional().default('Yes'),
});

export type GenerateMemosAndRubricsInput = z.infer<typeof GenerateMemosAndRubricsInputSchema>;
export type GenerateMemosAndRubricsOutput = { memo: string; rubric: string; };

export async function generateMemosAndRubrics(input: GenerateMemosAndRubricsInput): Promise<GenerateMemosAndRubricsOutput> {
  const response = await ai.generate({
    model: 'googleai/gemini-2.5-pro',
    system: 'You are an expert South African CAPS-compliant educational assistant. Generate a detailed Memo and Rubric in clean HTML.',
    prompt: `Task: ${input.taskDescription}\nGrade: ${input.gradeLevel}\nSubject: ${input.subject}`,
    output: {
      format: 'json',
      schema: z.object({
        memo: z.string(),
        rubric: z.string()
      })
    }
  });

  return response.output!;
}
