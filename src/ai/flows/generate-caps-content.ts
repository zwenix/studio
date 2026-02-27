'use server';

/**
 * @fileOverview Generates CAPS-compliant content for teachers with integrated image searching.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { imageSearchTool } from '@/ai/tools/image-search-tool';

const GradeSchema = z.enum([
  'R', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
]);

const SubjectSchema = z.string().describe('The subject for which to generate content.');
const TopicSchema = z.string().describe('The specific topic within the subject.');

const ContentTypeSchema = z.enum([
  'lesson plan',
  'exercise',
  'assessment',
  'class planner',
  'educational poster',
  'booklet-reading-handwriting-phonics',
  'reading-comprehension',
  'study-guide-notes',
  'subject-topic-cutouts',
  'letter-to-parents',
  'classroom-subject-poster',
  'improvement-plan-tracker',
  'worksheet-handwriting-practice',
  'worksheet-multipurpose',
  'classroom-labels',
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
  prompt: `You are an expert educational content creator for South African schools (CAPS compliant).

**VISUAL INSTRUCTIONS:**
You MUST use the \`searchImage\` tool to find high-quality visuals for all content types, especially for Grades R-7 and posters.
- **Source preference:** The tool automatically tries Pixabay first and falls back to Pexels.
- **Embedding:** Embed results using: \`<img src="URL" alt="Description" style="max-width: 100%; height: auto; border-radius: 0.75rem; margin: 1.5rem 0;" />\`.
- **Credit:** Always credit beneath the image: \`<p style="font-size: 10px; color: #888; text-align: center;">Photo by [Photographer] on [Source]</p>\`.

**FORMATTING:**
- Output MUST be clean, valid **HTML**.
- **NO TABLES** for matching questions. Use lists.
- For **'worksheet-multipurpose'**, create a header with Name, Date, and Subject labels, a horizontal rule, and a large blank writing area.

**STRUCTURE:**
1. Wrap everything in a \`<div class="{{fontFamily}}">\`.
2. Include \`customHeading\` and \`customSubject\` at the top if provided.
3. Generate the core educational content based on:
   Grade: {{{grade}}}
   Subject: {{{subject}}}
   Topic: {{{topic}}}
   Type: {{{contentType}}}
   Difficulty: {{{difficulty}}}
   Instructions: {{{additionalInstructions}}}
4. **Conclusion (Inside the font div):**
   - If \`signatureUrl\` is provided, embed it: \`<img src="{{{signatureUrl}}}" alt="Teacher's Signature" style="max-height: 80px; display: block; margin-top: 40px;" />\`
   - A single \`<hr />\`.
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
