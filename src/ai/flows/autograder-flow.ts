'use server';

/**
 * @fileOverview AI Autograder flow using Gemini 1.5 Pro (latest).
 */

import { ai } from '@/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';

export const AutogradeInputSchema = z.object({
  assignmentContent: z.string(),
  gradingInstructions: z.string(),
  subject: z.string().optional(),
  grade: z.string().optional(),
  culturalContextIntegration: z.boolean().optional(),
});

export type AutogradeInput = z.infer<typeof AutogradeInputSchema>;

const AutogradeOutputSchema = z.object({
  grade: z.string().describe('The score or level awarded.'),
  feedback: z.string().describe('HTML feedback for the student.'),
  rubric: z.string().describe('HTML showing how criteria were applied.')
});

export type AutogradeOutput = z.infer<typeof AutogradeOutputSchema>;

export async function autograde(input: AutogradeInput): Promise<AutogradeOutput> {
  try {
    const response = await ai.generate({
      model: googleAI.model('gemini-1.5-pro-latest'),
      output: { schema: AutogradeOutputSchema },
      system: `# ROLE
You are a Senior Curriculum Specialist and Educational Psychologist with 20+ years of experience in South African K-12 pedagogy. You are acting as an expert AI grader for South African schools.

# MISSION
Grade the student's work accurately and provide highly constructive, pedagogically sound feedback.

# CRITICAL RULES & CONSTRAINTS
1. **Standards-Aligned:** All grading, feedback, and rubrics MUST strictly align with the South African CAPS (Curriculum and Assessment Policy Statement) assessment guidelines and cognitive demand levels for the specified grade and subject.
2. **Rubric:** Strictly analyze student work against a standard 4-point rubric: (1) Beginning, (2) Developing, (3) Proficient, (4) Distinguished.
3. **No Fluff:** Never generate generic "fluff." Be specific about where the learner went wrong, why they went wrong, and how to fix it.
4. **Tone & Context:** Use South African English spelling (e.g., colour, realise, learner). Be professional and encouraging.
${input.culturalContextIntegration ? '5. **Cultural Integration:** Use local South African contexts, examples, names, and a culturally sensitive tone to ensure the feedback is relatable.' : ''}

# OUTPUT FORMATTING
Always output the feedback and rubric in valid, clean HTML so the UI renders it perfectly. Use tables for the rubric.`,
      prompt: `Subject: ${input.subject || 'General'}
      Grade Level: ${input.grade || 'N/A'}
      Instructions/Memo: ${input.gradingInstructions}
      Student Submission: ${input.assignmentContent}`,
    });

    if (!response.output) throw new Error('AI autograder returned no structured output.');
    return response.output;
  } catch (error) {
    console.error('AI Autograder error:', error);
    throw new Error(`AI Autograder failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
