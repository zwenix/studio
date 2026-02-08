'use server';

/**
 * @fileOverview Generates mock assessments for students to practice.
 *
 * - generateMockAssessment - A function that generates a mock assessment.
 * - GenerateMockAssessmentInput - The input type for the generateMockAssessment function.
 * - GenerateMockAssessmentOutput - The return type for the generateMockAssessment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GradeSchema = z.enum([
  'R', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
]);

const AssessmentFormatSchema = z.enum([
  'multiple choice',
  'short answer',
  'essay',
  'fill in the blanks',
  'true or false',
  'worksheet',
  'mixed',
]);

const GenerateMockAssessmentInputSchema = z.object({
  grade: GradeSchema.describe('The grade level for the practice assessment.'),
  subject: z.string().describe('The subject for the practice assessment.'),
  topic: z.string().describe('The specific topic within the subject.'),
  difficulty: z.string().optional().describe('The difficulty level for the assessment (e.g., Easy, Medium, Hard).'),
  assessmentFormat: AssessmentFormatSchema.optional().describe('The format for the assessment.'),
  length: z.string().optional().describe('The desired number of questions for the assessment (e.g., 10, 25, 50).'),
});

export type GenerateMockAssessmentInput = z.infer<typeof GenerateMockAssessmentInputSchema>;

const GenerateMockAssessmentOutputSchema = z.object({
  content: z.string().describe('The generated assessment questions in HTML format.'),
  memo: z.string().describe('A generated memo with answers for the assessment in HTML format.'),
  rubric: z.string().describe('A generated rubric for grading the assessment in HTML format.'),
});

export type GenerateMockAssessmentOutput = z.infer<typeof GenerateMockAssessmentOutputSchema>;

export async function generateMockAssessment(
  input: GenerateMockAssessmentInput
): Promise<GenerateMockAssessmentOutput> {
  return generateMockAssessmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMockAssessmentPrompt',
  input: {schema: GenerateMockAssessmentInputSchema},
  output: {schema: GenerateMockAssessmentOutputSchema},
  prompt: `You are an expert AI assistant that helps students prepare for their exams by creating practice assessments.

Your audience is students who are not technical. Therefore, you MUST generate the content in well-structured and easy-to-read **HTML** format. The output MUST be ready for direct use and look like a real, clean document.

**CRITICAL VISUAL & FORMATTING INSTRUCTIONS:**

1.  **Clarity and Spacing:** Structure everything for clarity. Use simple language and large, clear headings for each question (e.g., <h2>Question 1</h2>, <h2>Question 2</h2>). Use horizontal rules (<hr>) and ample vertical spacing (<br>) to visually separate questions so the layout is not cramped.

2.  **NO HTML TABLES for Matching:** For any "matching" type questions (e.g., "match column A to column B"), you are strictly forbidden from using HTML tables.
    Instead, list the items from the first column, and then provide a separate list of options for the student to match from.
    **Correct Example:**
    <hr>
    <h2>Question 5: Matching</h2>
    <p>Match the animal to its sound. Write the letter of the correct sound next to the animal number.</p>
    <h3>Animals:</h3>
    <ol>
      <li>Dog 🐶</li>
      <li>Cat 🐱</li>
      <li>Cow 🐮</li>
    </ol>
    <h3>Sounds:</h3>
    <ol type="a">
      <li>Moo</li>
      <li>Bark</li>
      <li>Meow</li>
    </ol>
    <hr>
    
3.  **AGE-APPROPRIATE VISUALS (CRITICAL):**
    -   **For Grades R, 1, 2, 3, 4, 5, 6, and 7:** You MUST make the assessment highly visual and engaging for young children.
        -   **Use Emojis and Icons FREQUENTLY** (e.g., ✏️, 🤔, 👍, 🧐, 🎉). Add them to headings and next to questions to make the test feel more like a fun activity.
        -   **Use BIG, FRIENDLY FONTS** by using '<h2>' for question titles.
        -   **Use a playful, handwritten-style font** for the entire content. The content MUST be wrapped in \`<div class="font-patrick-hand">\`.
    -   **For Grades 8-12:** You can use a more formal tone, but the content must still be well-structured and clear.

Generate a short practice assessment based on the grade, subject, and topic specified.
The assessment should be designed to test the student's knowledge.

Grade: {{{grade}}}
Subject: {{{subject}}}
Topic: {{{topic}}}
{{#if difficulty}}
Difficulty: {{{difficulty}}}
{{/if}}
{{#if assessmentFormat}}
Assessment Format: {{{assessmentFormat}}}
{{/if}}
{{#if length}}
Number of Questions: {{{length}}}
{{/if}}

You MUST generate the assessment questions, a detailed memo with the correct answers, and a comprehensive grading rubric. All parts should be in clear HTML format.

Finally, you MUST conclude the entire 'content' output with a single horizontal rule (<hr>) followed by the small, legible, italicized footnote: <em style="font-size: 9px; color: #666;">Created with EduAICompanion. All rights reserved by Zwelakhe Msuthu 2026</em>`,
});

const generateMockAssessmentFlow = ai.defineFlow(
  {
    name: 'generateMockAssessmentFlow',
    inputSchema: GenerateMockAssessmentInputSchema,
    outputSchema: GenerateMockAssessmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
