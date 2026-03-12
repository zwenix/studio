'use server';

/**
 * @fileOverview Generates CAPS-compliant educational content for Grades R–7 using expert templates.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { imageSearchTool } from '@/ai/tools/image-search-tool';

const GradeSchema = z.enum([
  'R', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
]);

const GenerateCAPSContentInputSchema = z.object({
  grade: GradeSchema.describe('The grade level.'),
  subject: z.string().describe('The subject.'),
  topic: z.string().describe('The topic.'),
  contentType: z.string().describe('Worksheet, Lesson Plan, Poster, Study Guide, ILP.'),
  category: z.enum(['Teaching Tools & Aids', 'Exercises, Tasks & Assessments', 'Class Management & Admin']),
  term: z.string().optional().describe('School term (1, 2, 3, 4).'),
  language: z.string().optional().describe('Language of instruction.'),
  learnerProfile: z.string().optional().describe('Barriers, strengths, needs.'),
  objective: z.string().optional().describe('Teacher specific goal.'),
  duration: z.string().optional().describe('Duration in minutes.'),
  numberOfActivities: z.string().optional().describe('Desired activities.'),
  additionalInstructions: z.string().optional().describe('Specific tweaks.'),
  teacherName: z.string().optional(),
  signatureUrl: z.string().optional(),
});

export type GenerateCAPSContentInput = z.infer<typeof GenerateCAPSContentInputSchema>;

const GenerateCAPSContentOutputSchema = z.object({
  content: z.string().describe('Generated HTML content.'),
  memo: z.string().describe('Generated HTML memo.'),
  rubric: z.string().describe('Generated HTML rubric.'),
});

export type GenerateCAPSContentOutput = z.infer<typeof GenerateCAPSContentOutputSchema>;

export async function generateCAPSContent(input: GenerateCAPSContentInput): Promise<GenerateCAPSContentOutput> {
  return generateCAPSContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCAPSContentPrompt',
  input: {schema: GenerateCAPSContentInputSchema},
  output: {schema: GenerateCAPSContentOutputSchema},
  tools: [imageSearchTool],
  prompt: `You are an expert South African primary school teacher (Grades R–7) and curriculum designer working with the CAPS curriculum.

GENERAL PRINCIPLES
- Align all content with the South African CAPS curriculum for Grades R–7.
- Use South African spelling and terminology.
- Always adapt difficulty, wording, and amount of text to Grade: {{{grade}}}.

AGE-APPROPRIATE STYLE
- Grades R–1: Very simple words and short sentences. matching, circling, colouring, drawing.
- Grades 2–3: Simple sentences, clear instructions, plenty of space.
- Grades 4–7: Higher-order questions, problem-solving, and short written responses.

VISUAL AIDS (VERY IMPORTANT)
- Use this convention: Mark where a visual should appear with: [IMAGE: VA1], [IMAGE: VA2], etc.
- At the end of the content section, include a VISUAL_AIDS list with structured descriptions.
- Visual aid entries must include: id, title, purpose, grades, description, alt_text, and tags.

INPUT PARAMETERS:
Grade: {{{grade}}}
Subject: {{{subject}}}
Topic: {{{topic}}}
Type: {{{contentType}}}
Term: {{{term}}}
Language: {{{language}}}
Learner/Class Profile: {{{learnerProfile}}}
Objective: {{{objective}}}
Duration: {{{duration}}} minutes
Activities requested: {{{numberOfActivities}}}
Additional Instructions: {{{additionalInstructions}}}

OUTPUT FORMAT:
- Return clean, well-structured HTML.
- For worksheets, include Teacher Info and Learner Instructions.
- For lesson plans, include phases (Intro, Development, Consolidation, Conclusion).
- For ILPs, focus on Practical Home & Classroom strategies.
- Conclude with footer: "Created using EduAICompanion. All rights reserved by Zwelakhe Msuthu 2026."`,
});

const generateCAPSContentFlow = ai.defineFlow(
  {
    name: 'generateCAPSContentFlow',
    inputSchema: GenerateCAPSContentInputSchema,
    outputSchema: GenerateCAPSContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
