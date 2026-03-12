
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
  prompt: `You are an expert South African primary school teacher (Grades R–7) and curriculum designer.
  
  TASK: Generate a high-quality {{contentType}} for Grade {{grade}}.
  
  GENERAL PRINCIPLES:
  - Align all content with the South African CAPS curriculum.
  - Use South African spelling (e.g., colour, realise) and terminology.
  - Grade: {{grade}}, Subject: {{subject}}, Topic: {{topic}}.
  - Term: {{term}}, Language: {{language}}.
  - Objective: {{objective}}.
  
  VISUAL AIDS CONVENTION (CRITICAL):
  - Mark where a visual aid should appear using: [IMAGE: VA1], [IMAGE: VA2], etc.
  - At the end of the content, include a section titled VISUAL_AIDS with a list.
  - Each entry in VISUAL_AIDS must have: id (VA1, etc.) and description (a detailed search query).
  
  FORMATTING:
  - Return valid HTML for the 'content' field.
  - Use headings (h1, h2), paragraphs, and lists.
  - Ensure contrast is high.
  
  INPUT CONTEXT:
  Learner Profile: {{learnerProfile}}
  Duration: {{duration}} minutes
  Activities: {{numberOfActivities}}
  Instructions: {{additionalInstructions}}`,
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
      
      // Parse descriptions for each VA ID
      for (const tag of imageTags) {
        const id = tag.replace(/\[|\]|IMAGE:\s*/gi, '').trim();
        // Look for "id: VA1" followed by "description: ..."
        const descRegex = new RegExp(`${id}[\\s\\S]*?description:\\s*["']?([^"\\n]+)["']?`, 'i');
        const descMatch = vaSection.match(descRegex);
        
        if (descMatch) {
          const query = descMatch[1].trim();
          try {
            const imageResult = await imageSearchTool({ query });
            if (imageResult.imageUrl) {
              const imgHtml = `<div class="my-6 text-center">
                <img src="${imageResult.imageUrl}" alt="${query}" class="rounded-xl shadow-lg mx-auto max-h-[400px]" />
                <p class="text-xs text-muted-foreground mt-2 italic">${query}</p>
              </div>`;
              html = html.replace(tag, imgHtml);
            } else {
              html = html.replace(tag, '');
            }
          } catch (e) {
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
