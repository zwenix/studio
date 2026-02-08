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

**CRITICAL FORMATTING INSTRUCTIONS:**
1.  **Clarity for Kids:** Structure everything for a child to read. Use simple language and clear headings (e.g., <h2>Question 1</h2>, <h2>Question 2</h2>).
2.  **SPACING IS KEY:** Use horizontal rules (<hr>) and ample vertical spacing (<br>) to visually separate questions. The layout must not be cramped.
3.  **NO HTML TABLES for Matching:** For any "matching" type questions (e.g., "match column A to column B"), you are strictly forbidden from using HTML tables. This format is unusable for the target audience.
    Instead, list the items from the first column in an ordered or unordered list, and then provide a separate list of options for the student to match from.
    **Correct Example for a Matching Question:**
    <hr>
    <h2>Question 5: Matching</h2>
    <p>Match the animal to its sound. Write the letter of the correct sound next to the animal number in your answer.</p>
    <h3>Animals:</h3>
    <ol>
      <li>Dog</li>
      <li>Cat</li>
      <li>Cow</li>
    </ol>
    <h3>Sounds:</h3>
    <ol type="a">
      <li>Moo</li>
      <li>Bark</li>
      <li>Meow</li>
    </ol>
    <hr>
4.  **IMAGE REQUIREMENT (NON-NEGOTIABLE):**
    - You MUST include one, and only one, image in your response.
    - The image MUST be from Unsplash.
    - The image URL MUST follow this exact format: \`https://source.unsplash.com/600x400/?<keyword>\`
    - The \`<keyword>\` MUST be a SINGLE, relevant English word. Do not use multiple words, hyphens, or underscores.
    - Embed the image using a standard HTML \`<img>\` tag.
    - **FAILURE TO FOLLOW THIS RULE WILL RENDER THE OUTPUT USELESS.**
    - **Correct Example:** For a topic on "Photosynthesis", use \`<img src="https://source.unsplash.com/600x400/?plant" alt="A green plant" />\`
    - **Incorrect Example:** \`<img src="https://source.unsplash.com/600x400/?plant-cell" />\` (uses hyphen)

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

Finally, you MUST conclude the entire 'content' output with a single horizontal rule (<hr>) followed by the italicized footnote: <em>Created with EduAICompanion - All rights reserved by owner: Zwelakhe Msuthu</em>`,
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
