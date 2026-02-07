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
  content: z.string().describe('The generated assessment questions in Markdown format.'),
  memo: z.string().describe('A generated memo with answers for the assessment in Markdown format.'),
  rubric: z.string().describe('A generated rubric for grading the assessment in Markdown format.'),
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

Your audience is students who are not technical. Therefore, you MUST generate the content in well-structured and easy-to-read **Markdown** format. The output MUST be ready for direct use and look like a real, clean document.

**CRITICAL FORMATTING INSTRUCTIONS:**
1.  **Clarity for Kids:** Structure everything for a child to read. Use simple language. Number each question clearly (e.g., "Question 1", "Question 2").
2.  **SPACING IS KEY:** Use horizontal rules (---) and ample vertical spacing (extra newlines) to visually separate questions. The layout must not be cramped.
3.  **NO MARKDOWN TABLES:** For any "matching" type questions (e.g., "match column A to column B"), you are strictly forbidden from using Markdown tables (e.g., | Column A | Column B |). This format is unusable for the target audience.
    Instead, list the items from the first column with a number, and then provide a separate list of options (with letters) for the student to match from.
    **Correct Example for a Matching Question:**
    ---
    **Question 5: Matching**
    Match the animal to its sound. Write the letter of the correct sound next to the animal number in your answer.

    **Animals:**
    1.  Dog
    2.  Cat
    3.  Cow

    **Sounds:**
    a.  Moo
    b.  Bark
    c.  Meow
    ---
4.  **ABSOLUTELY CRITICAL: IMAGE INSTRUCTIONS:** You MUST include at least one relevant image in your response to make it visually engaging. Failure to follow these image rules precisely will result in an incorrect output.
    *   **Source:** All images MUST come from Unsplash. No other image source is permitted.
    *   **URL Format:** The URL format is non-negotiable. It MUST be exactly: \`https://source.unsplash.com/600x400/?KEYWORD\`
    *   **Keyword:** The \`KEYWORD\` in the URL MUST be a SINGLE, relevant, English word. For example, if the topic is "The Solar System", a valid keyword is \`solar\`, \`planet\`, or \`space\`. A keyword like \`solar-system\` or \`solarsystem\` is INVALID.
    *   **Markdown:** The image must be embedded using standard Markdown syntax: \`![A descriptive caption for the image](https://source.unsplash.com/600x400/?keyword)\`.
    *   **Example of a CORRECT image:** \`![A diagram of a plant cell](https://source.unsplash.com/600x400/?cell)\`
    *   **Example of an INCORRECT image:** \`![The solar system](https://source.unsplash.com/600x400/?solar,system)\` - This is WRONG because it uses multiple keywords.

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

You MUST generate the assessment questions, a detailed memo with the correct answers, and a comprehensive grading rubric. All parts should be in clear Markdown format.

Finally, you MUST conclude the entire 'content' output with a single horizontal rule (---) followed by the italicized footnote: _Created with EduAICompanion - All rights reserved by owner: Zwelakhe Msuthu_`,
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
