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
- Align all content with the South African CAPS curriculum for Grades R–7.
- Use South African spelling and terminology.
- Always adapt difficulty to Grade: {{{grade}}}.

VISUAL AIDS (VERY IMPORTANT)
- Visual aids must be DIRECTLY relevant to the concept.
- Use this convention: Mark where a visual should appear with: [IMAGE: VA1], [IMAGE: VA2], etc.
- At the end of the output, include a section titled VISUAL_AIDS with a structured list.
- Each visual aid entry MUST have a 'description' field containing a search query.

INPUT:
Grade: {{{grade}}}
Subject: {{{subject}}}
Topic: {{{topic}}}
Type: {{{contentType}}}
Term: {{{term}}}
Language: {{{language}}}
Objective: {{{objective}}}
Learner Profile: {{{learnerProfile}}}

OUTPUT:
- Return valid HTML.
- Ensure all visual descriptions are descriptive for an image search tool.`,
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

    // Enhanced regex to find description field within VISUAL_AIDS section
    const visualAidsSection = html.match(/VISUAL_AIDS[\s\S]*$/i)?.[0] || "";
    const vaMap = new Map<string, string>();
    
    // Find all VA IDs and their associated descriptions
    const vaRegex = /id:\s*(VA\d+)[\s\S]*?description:\s*["']?([^"'\n]+)["']?/gi;
    let match;
    while ((match = vaRegex.exec(visualAidsSection)) !== null) {
      vaMap.set(match[1], match[2].trim());
    }

    // Process each visual aid
    for (const [id, query] of vaMap.entries()) {
      try {
        const imageResult = await imageSearchTool({ query, orientation: 'landscape' });
        if (imageResult.imageUrl) {
          const imgHtml = `<div class="my-8 text-center">
            <img src="${imageResult.imageUrl}" alt="${query}" class="rounded-2xl shadow-xl max-h-[450px] mx-auto border-4 border-white/10" />
            <p class="text-sm text-muted-foreground mt-3 italic font-medium">Visual: ${query}</p>
          </div>`;
          html = html.replace(`[IMAGE: ${id}]`, imgHtml);
        } else {
          html = html.replace(`[IMAGE: ${id}]`, '');
        }
      } catch (e) {
        html = html.replace(`[IMAGE: ${id}]`, '');
      }
    }

    // Clean up the VISUAL_AIDS section from the visible HTML
    html = html.replace(/<[^>]*>VISUAL_AIDS[\s\S]*$/i, '');
    html = html.replace(/VISUAL_AIDS[\s\S]*$/i, '');

    return {
      ...output!,
      content: html,
    };
  }
);
