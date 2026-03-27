
import { ai } from '@/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as z from 'zod';

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
    
    const response = await ai.generate({
      model: googleAI.model('gemini-3.1-pro'),
      system: `You are a Senior Curriculum Specialist and Educational Psychologist with 20+ years of experience in K-12 pedagogy and South African CAPS curriculum design.
      Your task is to generate a comprehensive, CAPS-aligned lesson plan based on the user's specifications.
      
      CRITICAL RULE - CAPS COMPLIANCE:
      Every lesson plan MUST strictly adhere to the South African CAPS (Curriculum and Assessment Policy Statement) for the specific subject and grade.
      
      LESSON PLAN RULES:
      - Structure the lesson plan logically, incorporating the chosen lesson type.
      - Use South African English spelling (colour, realise, learner, educator, etc.).
      - Use South African contexts: local names, provinces, ZAR, SA landmarks and cultural references.
      - Adapt cognitive demand to CAPS requirements for the grade level.
      - Be specific and practical — no generic filler. Output must be ready for a teacher to use immediately.
      - Use Markdown for formatting (headers, lists, bold text) to ensure readability.`,
      prompt: `Generate a lesson plan for a ${grade} ${subject} class.
      
      Topic: "${topic}"
      Lesson Type: "${lessonType}"
      
      The lesson plan should include a title, a brief description, and detailed sections appropriate for the chosen lesson type.`,
      output: { schema: LessonPlanSchema },
    });

    const lessonPlan = response.output;
    if (!lessonPlan) {
      throw new Error('Failed to generate lesson plan. The AI model did not return a valid lesson plan.');
    }
    return lessonPlan;
  }
);
