/**
 * @fileOverview Lesson Studio Generator
 *
 * Generates CAPS-aligned lesson plans.
 *
 * Transport: Genkit removed → direct Anthropic + Groq calls via /lib/ai.ts
 */

import { generateJSON } from '@/lib/ai';
import { buildLessonStudioPrompt } from '@/ai/prompts';
import { z } from 'zod';

export const LessonPlanSchema = z.object({
  title: z.string().describe('The title of the lesson plan'),
  description: z.string().describe('A brief overview of the lesson'),
  sections: z.array(
    z.object({
      title: z.string().describe('e.g., "Introduction", "Activity"'),
      content: z.string().describe('The detailed content for this section'),
    })
  ),
});

export type LessonPlan = z.infer<typeof LessonPlanSchema>;

export type LessonStudioInput = {
  grade: string;
  subject: string;
  topic: string;
  lessonType: string;
};

export async function generateLessonStudioFlow(
  input: LessonStudioInput
): Promise<LessonPlan> {
  const { grade, subject, topic, lessonType } = input;
  const promptParams = buildLessonStudioPrompt({
    grade,
    subject,
    topic,
    notes: `Lesson Type: ${lessonType}`,
  });

  const output = await generateJSON<LessonPlan>(
    promptParams.userPrompt,
    promptParams.systemInstruction,
    { maxTokens: 8192, temperature: 0.7 },
  );

  if (!output || !output.sections) {
    throw new Error('Failed to generate lesson plan — AI returned invalid structure.');
  }

  return output;
}
