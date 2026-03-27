import { ai } from '@/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as z from 'zod';

/**
 * Lesson Studio flow — generates structured CAPS-aligned lesson plans.
 *
 * Model (per chat.txt): gemini-3.1-pro
 * Rationale: Best for "long-horizon" planning and complex pedagogical constraints.
 */

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
    const response = await ai.generate({
      // gemini-3.1-pro: flagship model for long-horizon lesson planning (per chat.txt)
      model: googleAI.model('gemini-3.1-pro'),
      system: `You are a Senior Curriculum Specialist and Educational Psychologist with 20+ years of experience in K-12 pedagogy and South African CAPS curriculum design.

CRITICAL RULE - CAPS COMPLIANCE:
Every lesson plan MUST strictly adhere to the South African CAPS (Curriculum and Assessment Policy Statement) for the specific subject and grade.

LESSON PLAN RULES:
- Follow the structured format: Hook -> Direct Instruction -> Guided Practice -> Independent Practice -> Exit Ticket.
- Use South African English spelling (colour, realise, learner, educator, etc.).
- Use South African contexts: local names, provinces, ZAR, SA landmarks and cultural references.
- Adapt cognitive demand to CAPS requirements for the grade level.
- Be specific and practical — no generic filler. Output must be ready for a teacher to use immediately.
- Use Markdown headers, tables and bold text for maximum readability.`,
      prompt: `Create a comprehensive CAPS-aligned lesson plan about "${input.topic}" for a Grade ${input.grade} ${input.subject} class.
Include a title, description, and multiple detailed sections: Hook/Introduction, Direct Instruction, Guided Practice, Independent Practice, and Exit Ticket/Conclusion.`,
      output: { schema: LessonPlanSchema },
    });

    const lessonPlan = response.output;
    if (!lessonPlan) {
      throw new Error('Failed to generate lesson plan');
    }
    return lessonPlan;
  }
);
