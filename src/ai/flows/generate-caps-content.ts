'use server';

import { z } from 'zod';
import { groqGenerateJSON } from '@/ai/groq-client';
import { imageSearchTool } from '@/ai/tools/image-search-tool';

const GradeSchema = z.enum(['R','1','2','3','4','5','6','7','8','9','10','11','12']);

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

export type GenerateCAPSContentOutput = {
  content: string;
  memo: string;
  rubric: string;
};

export async function generateCAPSContent(input: GenerateCAPSContentInput): Promise<GenerateCAPSContentOutput> {
  const output = await groqGenerateJSON<GenerateCAPSContentOutput>([
    {
      role: 'system',
      content: `You are an expert South African teacher and CAPS curriculum designer for Grades R–12.

RULES:
- All content MUST be aligned to the South African CAPS curriculum.
- Use South African spelling (colour, realise) and context.
- Adapt difficulty to the specified grade.
- Grades R–1: Very simple words, matching/circling/colouring activities.
- Grades 2–3: Simple sentences, scaffolded instructions.
- Grades 4–7: Clear learner-friendly text, problem-solving, higher-order questions.
- Grades 8–12: Subject-appropriate academic rigour.

VISUAL AIDS:
- Mark image placement in content using: [IMAGE: VA1], [IMAGE: VA2], etc.
- At the end of the content field, include a VISUAL_AIDS section listing each VA id and a detailed image search description.

OUTPUT FORMAT: Return ONLY a JSON object with exactly these three fields:
{
  "content": "<full HTML content with [IMAGE: VAx] placeholders and VISUAL_AIDS section at end>",
  "memo": "<HTML memo with answers/explanations>",
  "rubric": "<HTML rubric with criteria and marks>"
}`,
    },
    {
      role: 'user',
      content: `Generate a ${input.contentType} for Grade ${input.grade}.
Subject: ${input.subject}
Topic: ${input.topic}
Term: ${input.term || 'N/A'}
Language: ${input.language || 'English'}
Objective: ${input.objective || 'N/A'}
Learner Profile: ${input.learnerProfile || 'General class'}
Duration: ${input.duration || 'N/A'} minutes
Number of Activities: ${input.numberOfActivities || 'N/A'}
Additional Instructions: ${input.additionalInstructions || 'None'}`,
    },
  ], { max_tokens: 8192 });

  // Process [IMAGE: VAx] placeholders
  let html = output.content;
  const imageTags = html.match(/\[IMAGE:\s*VA\d+\]/gi) || [];
  const vaSectionMatch = html.match(/VISUAL_AIDS[\s\S]*$/i);

  if (vaSectionMatch) {
    const vaSection = vaSectionMatch[0];
    for (const tag of imageTags) {
      const id = tag.replace(/\[|\]|IMAGE:\s*/gi, '').trim();
      const descRegex = new RegExp(`${id}[:\\s-]+([^\\n\\r*•]+)`, 'i');
      const descMatch = vaSection.match(descRegex);
      const query = descMatch ? descMatch[1].trim() : `${input.subject} ${input.topic} educational`;
      try {
        const imageResult = await imageSearchTool({ query });
        if (imageResult.imageUrl) {
          html = html.replace(tag, `<div class="my-6 text-center no-print">
            <img src="${imageResult.imageUrl}" alt="${query}" class="rounded-xl shadow-lg mx-auto max-h-[400px]" style="width:auto;height:auto;" />
            <p class="text-xs text-muted-foreground mt-2 italic">${query}</p>
          </div>`);
        } else {
          html = html.replace(tag, '');
        }
      } catch {
        html = html.replace(tag, '');
      }
    }
    html = html.replace(/VISUAL_AIDS[\s\S]*$/i, '').trim();
  }

  return { ...output, content: html };
}
