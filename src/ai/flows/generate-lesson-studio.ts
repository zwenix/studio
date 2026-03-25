import { ai } from '@/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as z from 'zod';
import { Action } from 'genkit';
import { Flow } from 'genkit/flow';

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
      topic: z.string(),
      grade: z.string(),
      subject: z.string(),
    }),
    outputSchema: LessonPlanSchema,
  },
  async (input) => {
    const prompt = `Create a comprehensive lesson plan about ${input.topic} for a ${input.grade} grade ${input.subject} class. The lesson plan should include a title, description, and multiple sections with detailed content.`;
    const response = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      prompt: prompt,
      output: { schema: LessonPlanSchema },
    });
    const lessonPlan = response.output();
    if (!lessonPlan) {
      throw new Error('Failed to generate lesson plan');
    }
    return lessonPlan;
  }
);
