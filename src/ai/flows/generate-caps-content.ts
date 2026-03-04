'use server';

/**
 * @fileOverview Generates CAPS-compliant content for teachers with integrated image searching.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { imageSearchTool } from '@/ai/tools/image-search-tool';

export const maxDuration = 120; // Increase timeout for complex content generation

const GradeSchema = z.enum([
  'R', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
]);

const SubjectSchema = z.string().describe('The subject for which to generate content.');
const TopicSchema = z.string().describe('The specific topic within the subject.');

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
  contentType: z.string().describe('The specific type of content.'),
  category: z.enum(['Teaching Tools & Aids', 'Exercises, Tasks & Assessments', 'Class Management & Admin']).describe('The high-level category.'),
  additionalInstructions: z.string().optional().describe('Any specific instructions.'),
  difficulty: z.string().optional().describe('Difficulty level (Easy, Medium, Hard).'),
  length: z.string().optional().describe('Desired length or number of questions.'),
  assessmentFormat: AssessmentFormatSchema.optional().describe('Assessment format.'),
  fontFamily: z.string().optional().describe('CSS font class.'),
  customHeading: z.string().optional().describe('Custom main heading.'),
  customSubject: z.string().optional().describe('Custom sub-heading.'),
  teacherName: z.string().optional().describe('Teacher name.'),
  signatureUrl: z.string().optional().describe('Signature URL.'),
  aiDifficultyAdaptation: z.boolean().optional().describe('Dynamic difficulty adjustment.'),
  culturalContextIntegration: z.boolean().optional().describe('Use South African context.'),
});

export type GenerateCAPSContentInput = z.infer<typeof GenerateCAPSContentInputSchema>;

const GenerateCAPSContentOutputSchema = z.object({
  content: z.string().describe('Generated HTML content.'),
  memo: z.string().describe('Generated HTML memo. Return empty string if category is not "Exercises, Tasks & Assessments".'),
  rubric: z.string().describe('Generated HTML rubric. Return empty string if category is not "Exercises, Tasks & Assessments".'),
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
  prompt: `You are an expert educational content creator for South African schools (CAPS compliant).

**VISUAL INSTRUCTIONS:**
You MUST use the \`searchImage\` tool to find high-quality visuals for all content types, especially for Grades R-7 and posters.

**CRITICAL GRADE-SPECIFIC VISUAL RULES:**
- **For Grades 1-6:** You MUST prioritize relevant **illustrations, drawings, and cartoons**. Set \`imageType: 'illustration'\` when calling \`searchImage\`. 
- **Use realistic images ONLY as a last resort** for Grades 1-6 if a specific topic is too technical for an illustration.
- **Embedding:** Embed results using: \`<img src="URL" alt="Description" style="max-width: 100%; height: auto; border-radius: 0.75rem; margin: 1.5rem 0;" />\`.
- **Credit:** Always credit beneath the image: \`<p style="font-size: 10px; color: #888; text-align: center;">Photo by [Photographer] on [Source]</p>\`.

**MEMO & RUBRIC RULES:**
- If category is "Exercises, Tasks & Assessments", you MUST generate a detailed Memo and Rubric.
- If category is NOT "Exercises, Tasks & Assessments", you MUST return an empty string for both \`memo\` and \`rubric\`.

**FORMATTING:**
- Output MUST be clean, valid **HTML**.
- **NO TABLES** for matching questions. Use lists.
- For **'worksheet-multipurpose'**, you MUST create a professional header with "Name:", "Date:", and "Subject:" labels at the top, followed by a bold horizontal rule (<hr style="border: 2px solid #000; margin: 20px 0;" />), and then a large blank area for the learner to write.

**STRUCTURE:**
1. Wrap everything in a \`<div class="{{fontFamily}}">\`.
2. Include \`customHeading\` and \`customSubject\` at the top if provided.
3. Generate the core educational content based on:
   Category: {{{category}}}
   Grade: {{{grade}}}
   Subject: {{{subject}}}
   Topic: {{{topic}}}
   Type: {{{contentType}}}
   Difficulty: {{{difficulty}}}
   Instructions: {{{additionalInstructions}}}
4. **Conclusion (Inside the font div):**
   - If \`signatureUrl\` is provided, embed it clearly: \`<div style="margin-top: 40px;"><img src="{{{signatureUrl}}}" alt="Teacher's Signature" style="max-height: 80px; display: block;" /><p style="font-size: 12px; font-weight: bold; margin-top: 5px;">{{teacherName}}</p></div>\`
   - A single \`<hr style="margin-top: 30px;" />\`.
   - The footnote: \`<em style="font-size: 9px; color: #666; display: block; margin-top: 10px;">Created using EduAICompanion. All rights reserved by Zwelakhe Msuthu 2026.</em>\``,
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
