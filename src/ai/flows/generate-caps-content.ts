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
  length: z.string().optional().describe('The desired number of questions for the content (e.g., 10, 25, 50).'),
  assessmentFormat: AssessmentFormatSchema.optional().describe('The format of the assessment (e.g., Multiple Choice, Short Answer, Essay).')
});

export type GenerateCAPSContentInput = z.infer<typeof GenerateCAPSContentInputSchema>;

const GenerateCAPSContentOutputSchema = z.object({
  content: z.string().describe('The generated CAPS-compliant content in HTML format.'),
  memo: z.string().describe('A generated memo for the content in HTML format. Should be empty if not applicable.'),
  rubric: z.string().describe('A generated rubric for the content in HTML format. Should be empty if not applicable.'),
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

Your audience is teachers, parents, and children who are not technical. Therefore, you MUST generate the content in well-structured and easy-to-read **HTML** format. The output MUST be ready for direct use and look like a real, clean document.

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
4.  **ABSOLUTELY CRITICAL: IMAGE INSTRUCTIONS:** You MUST include at least one relevant image in your response to make it visually engaging. Failure to follow these image rules precisely will result in an incorrect output.
    *   **Source:** All images MUST come from Unsplash. No other image source is permitted.
    *   **URL Format:** The URL format is non-negotiable. It MUST be exactly: \`https://source.unsplash.com/600x400/?KEYWORD\`
    *   **Keyword:** The \`KEYWORD\` in the URL MUST be a SINGLE, relevant, English word. For example, if the topic is "The Solar System", a valid keyword is \`solar\`, \`planet\`, or \`space\`. A keyword like \`solar-system\` or \`solarsystem\` is INVALID.
    *   **HTML:** The image must be embedded using a standard HTML <img> tag: \`<img src="https://source.unsplash.com/600x400/?keyword" alt="A descriptive caption for the image" />\`.
    *   **Example of a CORRECT image:** \`<img src="https://source.unsplash.com/600x400/?cell" alt="A diagram of a plant cell" />\`
    *   **Example of an INCORRECT image:** \`<img src="https://source.unsplash.com/600x400/?solar,system" alt="The solar system" />\` - This is WRONG because it uses multiple keywords.

You will generate content based on the grade, subject, topic and content type specified by the user. Ensure that the content adheres to the Curriculum and Assessment Policy Statement (CAPS) for the specified grade and subject.

Grade: {{{grade}}}
Subject: {{{subject}}}
Topic: {{{topic}}}
Content Type: {{{contentType}}}

{{#if difficulty}}
Difficulty: {{{difficulty}}}
{{/if}}
{{#if length}}
Number of Questions: {{{length}}}
{{/if}}
{{#if assessmentFormat}}
Assessment Format: {{{assessmentFormat}}}
{{/if}}
{{#if additionalInstructions}}
Additional Instructions: {{{additionalInstructions}}}
{{/if}}

Generate the following CAPS-compliant content.

If the Content Type is 'exercise' or 'assessment', you MUST generate a detailed memo with answers and a comprehensive grading rubric, also in clear HTML format.

If the Content Type is NOT 'exercise' or 'assessment', you MUST return an empty string for the 'memo' and 'rubric' fields.

Finally, you MUST conclude the entire 'content' output with a single horizontal rule (<hr>) followed by the italicized footnote: <em>Created with EduAICompanion - All rights reserved by owner: Zwelakhe Msuthu</em>`,
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
