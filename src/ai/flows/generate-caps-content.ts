'use server';

/**
 * @fileOverview Generates CAPS-compliant content for teachers, including lesson plans, exercises,
 * assessments, class planners, and educational posters.
 *
 * - generateCAPSContent - A function that generates CAPS-compliant content.
 * - GenerateCAPSContentInput - The input type for the generateCAPSContent function.
 * - GenerateCAPSContentOutput - The return type for the generateCAPSContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GradeSchema = z.enum([
  'R',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
]);

const SubjectSchema = z.string().describe('The subject for which to generate content.');
const TopicSchema = z.string().describe('The specific topic within the subject.');

const ContentTypeSchema = z.enum([
  'lesson plan',
  'exercise',
  'assessment',
  'class planner',
  'educational poster',
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

const GenerateCAPSContentInputSchema = z.object({
  grade: GradeSchema.describe('The grade level for which to generate content.'),
  subject: SubjectSchema.describe('The subject for which to generate content.'),
  topic: TopicSchema.describe('The specific topic within the subject.'),
  contentType: ContentTypeSchema.describe('The type of content to generate.'),
  additionalInstructions: z
    .string()
    .optional()
    .describe('Any specific instructions for content generation.'),
  difficulty: z.string().optional().describe('The difficulty level for the content (e.g., Easy, Medium, Hard).'),
  length: z.string().optional().describe('The desired length of the content (e.g., Short, Medium, Long).'),
  assessmentFormat: AssessmentFormatSchema.optional().describe('The format of the assessment (e.g., Multiple Choice, Short Answer, Essay).')
});

export type GenerateCAPSContentInput = z.infer<typeof GenerateCAPSContentInputSchema>;

const GenerateCAPSContentOutputSchema = z.object({
  content: z.string().describe('The generated CAPS-compliant content in Markdown format.'),
  memo: z.string().describe('A generated memo for the content in Markdown format. Should be empty if not applicable.'),
  rubric: z.string().describe('A generated rubric for the content in Markdown format. Should be empty if not applicable.'),
});

export type GenerateCAPSContentOutput = z.infer<typeof GenerateCAPSContentOutputSchema>;

export async function generateCAPSContent(
  input: GenerateCAPSContentInput
): Promise<GenerateCAPSContentOutput> {
  return generateCAPSContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCAPSContentPrompt',
  input: {schema: GenerateCAPSContentInputSchema},
  output: {schema: GenerateCAPSContentOutputSchema},
  prompt: `You are an expert educational content creator specializing in generating CAPS-compliant educational content for South African schools.

Your audience is teachers, parents, and children who are not technical. Therefore, you MUST generate the content in well-structured and easy-to-read **Markdown** format. The output MUST be ready for direct use and look like a real, clean document.

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

You will generate content based on the grade, subject, topic and content type specified by the user. Ensure that the content adheres to the Curriculum and Assessment Policy Statement (CAPS) for the specified grade and subject.

Grade: {{{grade}}}
Subject: {{{subject}}}
Topic: {{{topic}}}
Content Type: {{{contentType}}}

{{#if difficulty}}
Difficulty: {{{difficulty}}}
{{/if}}
{{#if length}}
Length: {{{length}}}
{{/if}}
{{#if assessmentFormat}}
Assessment Format: {{{assessmentFormat}}}
{{/if}}
{{#if additionalInstructions}}
Additional Instructions: {{{additionalInstructions}}}
{{/if}}

Generate the following CAPS-compliant content.

If the Content Type is 'exercise' or 'assessment', you MUST generate a detailed memo with answers and a comprehensive grading rubric, also in clear Markdown format.

If the Content Type is NOT 'exercise' or 'assessment', you MUST return an empty string for the 'memo' and 'rubric' fields.`,
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
