'use server';

/**
 * @fileOverview Generates CAPS-compliant educational content for Grades R–7 with integrated image search.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
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
  input: { schema: GenerateCAPSContentInputSchema },
  output: { schema: GenerateCAPSContentOutputSchema },
  prompt: `You are an expert South African primary school teacher (Grades R–7) and curriculum designer working with the CAPS curriculum.

GENERAL PRINCIPLES
- Align all content with the South African CAPS curriculum.
- Use South African spelling and terminology.
- Adapt difficulty to Grade: {{{grade}}}.

VISUAL AIDS (VERY IMPORTANT)
- Use this convention: Mark where a visual should appear with: [IMAGE: VA1], [IMAGE: VA2], etc.
- At the end of the content section, include a VISUAL_AIDS list with descriptive queries for an image search tool.
- Format the list clearly like: "VA1: descriptive query for image search".

INPUT:
Grade: {{{grade}}}
Subject: {{{subject}}}
Topic: {{{topic}}}
Type: {{{contentType}}}
Term: {{{term}}}
Language: {{{language}}}
Objective: {{{objective}}}

OUTPUT:
- Return clean HTML.
- Include the VISUAL_AIDS descriptions at the very end of the content string inside a comment or hidden div so we can parse it.`,
});

const generateCAPSContentFlow = ai.defineFlow(
  {
    name: 'generateCAPSContentFlow',
    inputSchema: GenerateCAPSContentInputSchema,
    outputSchema: GenerateCAPSContentOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    let html = output!.content;

    // 1. Extract Visual Aid Descriptions
    // Looking for lines like VA1: some description
    const vaRegex = /VA(\d+):\s*([^<>\n]+)/g;
    let match;
    const descriptions = new Map<string, string>();
    while ((match = vaRegex.exec(html)) !== null) {
      descriptions.set(`VA${match[1]}`, match[2].trim());
    }

    // 2. Fetch images and replace tags
    for (const [id, description] of descriptions.entries()) {
      try {
        const imageResult = await imageSearchTool({ query: description, orientation: 'landscape' });
        if (imageResult.imageUrl) {
          const imgTag = `<div class="my-6 text-center">
            <img src="${imageResult.imageUrl}" alt="${description}" class="rounded-lg shadow-md max-h-[400px] mx-auto" />
            <p class="text-xs text-muted-foreground mt-2 italic">Visual: ${description} (via ${imageResult.source})</p>
          </div>`;
          html = html.replace(`[IMAGE: ${id}]`, imgTag);
        } else {
          html = html.replace(`[IMAGE: ${id}]`, ''); // Remove tag if no image found
        }
      } catch (e) {
        console.error(`Failed to fetch image for ${id}:`, e);
        html = html.replace(`[IMAGE: ${id}]`, '');
      }
    }

    // 3. Clean up the VISUAL_AIDS text list from the visible HTML
    html = html.replace(/VISUAL_AIDS[\s\S]*$/i, '');

    return {
      ...output!,
      content: html,
    };
  }
);
