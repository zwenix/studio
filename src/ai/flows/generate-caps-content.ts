
'use server';

/**
 * @fileOverview Generates CAPS-compliant educational content using Groq with integrated image search.
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
- Use South African spelling (e.g., colour, realise) and terminology.
- Always adapt difficulty and wording to Grade {{grade}}.

AGE-APPROPRIATE STYLE
- Grades R–1: Very simple words, Concrete examples. Activities: matching, circling, colouring.
- Grades 2–3: Simple sentences, scaffolded instructions.
- Grades 4–7: Clear, learner-friendly text with problem-solving and higher-order questions.

VISUAL AIDS CONVENTION (CRITICAL)
- Mark visual aid placement using: [IMAGE: VA1], [IMAGE: VA2], etc.
- At the end of the content, include a section titled VISUAL_AIDS with a list.
- Each entry MUST have: id (VA1, etc.) and description (a detailed search query).

TASK: Generate a high-quality {{contentType}} for Grade {{grade}}.
Subject: {{subject}}
Topic: {{topic}}
Term: {{term}}
Language: {{language}}
Objective: {{objective}}
Learner Profile: {{learnerProfile}}
Duration: {{duration}} minutes
Activities: {{numberOfActivities}}
Instructions: {{additionalInstructions}}

FORMAT: Return valid HTML for the 'content' field. Use headings (h1, h2), paragraphs, and lists. Use South African context. Ensure all images are placed using [IMAGE: VAx] tags.`,
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

    // 1. Identify all [IMAGE: VAx] tags
    const imageTags = html.match(/\[IMAGE:\s*VA\d+\]/gi) || [];
    
    // 2. Identify the VISUAL_AIDS section
    const vaSectionMatch = html.match(/VISUAL_AIDS[\s\S]*$/i);
    if (vaSectionMatch) {
      const vaSection = vaSectionMatch[0];
      
      for (const tag of imageTags) {
        const id = tag.replace(/\[|\]|IMAGE:\s*/gi, '').trim();
        // Extract description from the VISUAL_AIDS list
        const descRegex = new RegExp(`${id}[\\s\\S]*?description:\\s*["']?([^"\\n]+)["']?`, 'i');
        const descMatch = vaSection.match(descRegex);
        
        if (descMatch) {
          const query = descMatch[1].trim();
          try {
            const imageResult = await imageSearchTool({ query });
            if (imageResult.imageUrl) {
              const imgHtml = `<div class="my-6 text-center no-print">
                <img src="${imageResult.imageUrl}" alt="${query}" class="rounded-xl shadow-lg mx-auto max-h-[400px]" style="width: auto; height: auto;" />
                <p class="text-xs text-muted-foreground mt-2 italic">${query}</p>
              </div>`;
              html = html.replace(tag, imgHtml);
            } else {
              html = html.replace(tag, '');
            }
          } catch (e) {
            console.error(`Failed to fetch image for ${query}:`, e);
            html = html.replace(tag, '');
          }
        } else {
          html = html.replace(tag, '');
        }
      }
    }

    // Clean up the raw VISUAL_AIDS text from the end of the output
    html = html.replace(/VISUAL_AIDS[\s\S]*$/i, '').trim();

    return {
      ...output!,
      content: html,
    };
  }
);
