import { ai } from '@/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';
import { buildLessonStudioPrompt } from '@/ai/prompts';

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

export const generateLessonStudioFlow = ai.defineFlow(
  {
    name: 'generateLessonStudio',
    inputSchema: z.object({
      grade: z.string(),
      subject: z.string(),
      topic: z.string(),
      lessonType: z.string(),
    }),
    outputSchema: LessonPlanSchema,
  },
  async (input) => {
    const { grade, subject, topic, lessonType } = input;
    const promptParams = buildLessonStudioPrompt({
      grade,
      subject,
      topic,
      notes: `Lesson Type: ${lessonType}`,
    });

    const response = await ai.generate({
      model: 'googleai/gemini-3.1-pro-preview',
      system: promptParams.systemInstruction,
      prompt: promptParams.userPrompt,
      output: { schema: LessonPlanSchema },
    });

    const lessonPlan = response.output;
    if (!lessonPlan) throw new Error('Failed to generate lesson plan.');
    return lessonPlan;
  }
);