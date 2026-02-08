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
  assessmentFormat: AssessmentFormatSchema.optional().describe('The format of the assessment (e.g., Multiple Choice, Short Answer, Essay).'),
  fontFamily: z.string().optional().describe('The CSS class for the font to be used.'),
  customHeading: z.string().optional().describe('A custom main heading for the document.'),
  customSubject: z.string().optional().describe('A custom subject or sub-heading for the document.'),
  teacherName: z.string().optional().describe('The full name of the teacher generating the content.'),
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

**CRITICAL VISUAL & FORMATTING INSTRUCTIONS:**

1.  **Clarity and Spacing:** Structure everything for clarity. Use simple language and clear headings (e.g., <h2>Question 1</h2>, <h2>Question 2</h2>). Use horizontal rules (<hr>) and ample vertical spacing (<br>) to visually separate questions. The layout must not be cramped.

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
    -   **For Grades R, 1, 2, 3, 4, 5, 6, and 7:** You MUST make the content highly visual and engaging for young children.
        -   **Use Emojis and Icons FREQUENTLY** (e.g., ✅, ✏️, 📚, 🤔, 👍, 🖍️, 🎨). Weave them into headings, questions, and lists to add color and visual cues.
        -   **Use BIG, FRIENDLY FONTS** by using '<h1>' and '<h2>' for titles and '<h3>' for questions.
        -   If the Content Type is an 'educational poster', it MUST be extremely visual. Use very large headings, a lot of relevant emojis, bright conceptual colors (via inline style attributes on divs or spans), and simple layouts. The goal is to create a fun, vibrant poster that a child would love.
    -   **For Grades 8-12:** You can use a more formal tone, but the content must still be well-structured and clear. Emojis can be used more sparingly.

The entire response for the 'content' field MUST start with a wrapper div that sets the font class. The user will provide a 'fontFamily' variable containing the CSS class name. All subsequent content, including custom headers and the final footnote, must be inside this single wrapper div.

You will generate content based on the user's request. Ensure that the content adheres to the Curriculum and Assessment Policy Statement (CAPS) for the specified grade and subject.

Grade: {{{grade}}}
Subject: {{{subject}}}
Topic: {{{topic}}}
Content Type: {{{contentType}}}
{{#if fontFamily}}
Font Class: {{{fontFamily}}}
{{/if}}

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

The content should start with the wrapper div. If the user provides a 'customHeading' or 'customSubject', they MUST be placed at the very top of the content, inside the main font wrapper div.

If the Content Type is 'exercise' or 'assessment', you MUST generate a detailed memo with answers and a comprehensive grading rubric, also in clear HTML format.

If the Content Type is NOT 'exercise' or 'assessment', you MUST return an empty string for the 'memo' and 'rubric' fields.

Finally, you MUST conclude the entire 'content' output with a single horizontal rule (<hr>) followed by the small, legible, italicized footnote: <em style="font-size: 9px; color: #666;">Created by '{{{teacherName}}}' using EduAICompanion. All rights reserved by Zwelakhe Msuthu 2026</em>. This footnote must also be inside the main font wrapper div.`,
});

const generateCAPSContentFlow = ai.defineFlow(
  {
    name: 'generateCAPSContentFlow',
    inputSchema: GenerateCAPSContentInputSchema,
    outputSchema: GenerateCAPSContentOutputSchema,
  },
  async input => {
    
    // Construct the dynamic part of the prompt
    let dynamicContent = '';

    if (input.customHeading) {
      dynamicContent += `<h1 style="text-align: center; font-size: 24px; font-weight: bold;">${input.customHeading}</h1>\n`;
    }
    if (input.customSubject) {
      dynamicContent += `<h2 style="text-align: center; font-size: 20px; font-weight: normal; margin-bottom: 20px;">${input.customSubject}</h2>\n`;
    }

    const modifiedInput = { ...input };

    const wrappedPrompt = `
      <div class="${modifiedInput.fontFamily || 'font-sans'}">
        ${dynamicContent}
        {{AI will generate the main educational content here based on the original prompt instructions}}
      </div>
    `;

    // This is a simplified representation. In a real scenario, you might need a more robust templating engine
    // or pass the wrapping instruction differently. Here we are instructing the AI within the prompt itself.
    const {output} = await prompt(modifiedInput);
    return output!;
  }
);
