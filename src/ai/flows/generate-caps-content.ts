'use server';

/**
 * @fileOverview Generates CAPS-compliant educational content using Groq with integrated image search.
 */

import { groqGenerateJSON } from '@/ai/groq-client';
import { z } from 'zod';
import { imageSearchTool } from '@/ai/tools/image-search-tool';

const GradeSchema = z.enum([
  'R', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
]);

const GenerateCAPSContentInputSchema = z.object({
  grade: GradeSchema,
  subject: z.string(),
  topic: z.string(),
  contentType: z.string(),
  category: z.enum(['Teaching Tools & Aids', 'Exercises, Tasks & Assessments', 'Class Management & Admin']),
  term: z.string().optional(),
  language: z.string().optional(),
  learnerProfile: z.string().optional(),
  objective: z.string().optional(),
  duration: z.string().optional(),
  numberOfActivities: z.string().optional(),
  additionalInstructions: z.string().optional(),
  teacherName: z.string().optional(),
  signatureUrl: z.string().optional(),
});

export type GenerateCAPSContentInput = z.infer<typeof GenerateCAPSContentInputSchema>;

const GenerateCAPSContentOutputSchema = z.object({
  content: z.string(),
  memo: z.string(),
  rubric: z.string(),
});

export type GenerateCAPSContentOutput = z.infer<typeof GenerateCAPSContentOutputSchema>;

export async function generateCAPSContent(input: GenerateCAPSContentInput): Promise<GenerateCAPSContentOutput> {
  const prompt = `You are an expert South African primary school teacher (Grades R–7) and curriculum designer working with the CAPS curriculum.

GENERAL PRINCIPLES
- Align all content with the South African CAPS curriculum.
- Use South African spelling (e.g., colour, realise) and terminology.
- Always adapt difficulty and wording to Grade ${input.grade}.

AGE-APPROPRIATE STYLE
- Grades R–1: Very simple words, Concrete examples. Activities: matching, circling, colouring.
- Grades 2–3: Simple sentences, scaffolded instructions.
- Grades 4–7: Clear, learner-friendly text with problem-solving and higher-order questions.

VISUAL AIDS CONVENTION (CRITICAL)
- Mark visual aid placement using: [IMAGE: VA1], [IMAGE: VA2], etc.
- At the end of the content, include a section titled VISUAL_AIDS with a bulleted list.
- Each entry MUST have: id (VA1, etc.) and description (a detailed search query for an educational image).

TASK: Generate a high-quality ${input.contentType} for Grade ${input.grade}.
Subject: ${input.subject}
Topic: ${input.topic}
Term: ${input.term || 'N/A'}
Language: ${input.language || 'English'}
Objective: ${input.objective || 'N/A'}
Learner Profile: ${input.learnerProfile || 'N/A'}
Duration: ${input.duration || '45'} minutes
Activities: ${input.numberOfActivities || '3'}
Instructions: ${input.additionalInstructions || 'None'}

FORMAT: Return a JSON object with 'content' (HTML string), 'memo' (HTML string), and 'rubric' (HTML string). Use headings (h1, h2), paragraphs, and lists.`;

  const output = await groqGenerateJSON<GenerateCAPSContentOutput>([
    { role: 'system', content: prompt }
  ]);

  let html = output.content;

  // 1. Identify all [IMAGE: VAx] tags
  const imageTags = html.match(/\[IMAGE:\s*VA\d+\]/gi) || [];
  
  // 2. Identify the VISUAL_AIDS section
  const vaSectionMatch = html.match(/VISUAL_AIDS[\s\S]*$/i);
  if (vaSectionMatch) {
    const vaSection = vaSectionMatch[0];
    
    for (const tag of imageTags) {
      const id = tag.replace(/\[|\]|IMAGE:\s*/gi, '').trim();
      const descRegex = new RegExp(`${id}[:\\s-]+([^\\n\\r*•]+)`, 'i');
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
          html = html.replace(tag, '');
        }
      }
    }
  }

  // Clean up the raw VISUAL_AIDS text
  html = html.replace(/VISUAL_AIDS[\s\S]*$/i, '').trim();

  return {
    ...output,
    content: html,
  };
}
