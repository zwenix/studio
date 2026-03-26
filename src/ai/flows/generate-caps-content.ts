'use server';

/**
 * @fileOverview Generates CAPS-compliant educational content using Gemini 1.5 Pro and Imagen 3.
 */

import { z } from 'genkit';
import { ai } from '@/genkit';
import { googleAI } from '@genkit-ai/google-genai';

// ─── Input Schema ─────────────────────────────────────────────────────────────

const GenerateCAPSContentInputSchema = z.object({
  grade: z.string().describe('The grade level (R, 1–12, or custom).'),
  subject: z.string(),
  topic: z.string(),
  contentType: z.string(),
  category: z.string(),
  term: z.string().optional(),
  language: z.string().optional(),
  learnerProfile: z.string().optional(),
  objective: z.string().optional(),
  duration: z.string().optional(),
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

// ─── AI Output Schema ─────────────────────────────────────────────────────────

const CapsResponseSchema = z.object({
  content: z.string().describe('HTML content with optional [IMAGE:VA1] placeholders'),
  memo: z.string().describe('HTML memo with answers and explanations'),
  rubric: z.string().describe('HTML rubric with criteria and mark allocations'),
  visualAids: z
    .array(
      z.object({
        id: z.string(),
        query: z.string().describe('Detailed prompt for an AI illustrator'),
      })
    )
    .optional()
    .default([]),
});

// ─── AI Image Generator ─────────────────────────────────────────────────────────────

async function generateClassroomPoster(query: string): Promise<string> {
  try {
    const imageResponse = await ai.generate({
      model: googleAI.model('imagen-3'), 
      prompt: `Create a high-resolution, vibrant, and educational classroom poster or illustration about: ${query}. Ensure it is safe for primary school children.`,
      output: { format: 'media' }
    });
    
    return imageResponse.media?.url || ''; 
  } catch (e) {
    console.error('AI Image generation failed for query:', query, e);
    return '';
  }
}

// ─── Main exported function ───────────────────────────────────────────────────

export async function generateCAPSContent(
  input: GenerateCAPSContentInput
): Promise<GenerateCAPSContentOutput> {
  try {
    const response = await ai.generate({
      model: googleAI.model('gemini-1.5-pro-latest'),
      output: { schema: CapsResponseSchema },
      system: `# ROLE
You are a Senior Curriculum Specialist and Educational Psychologist with 20+ years of experience in South African K-12 pedagogy and Individualized Learning Development Plans (ILDPs).

# MISSION
Your goal is to generate high-quality, research-backed educational materials that are:
1. **Standards-Aligned:** Every piece of content MUST strictly adhere to the South African CAPS (Curriculum and Assessment Policy Statement) curriculum for the specific subject, grade, and term.
2. **Highly Individualized:** When provided with student data or learner profiles, tailor every strategy to specific strengths, weaknesses, and neurodiversity needs.
3. **Professional & Actionable:** Outputs must be ready for a teacher to use immediately in a classroom.

# OUTPUT GUIDELINES
- **Lesson Plans:** Use a structured format: Hook -> Direct Instruction -> Guided Practice -> Independent Practice -> Exit Ticket.
- **IDPs/IEPs:** Focus on SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound). Include a section for "Accommodations & Modifications."
- **Tone:** Professional, encouraging, and pedagogically sound.
- **Formatting:** Output as clean HTML so the UI renders it perfectly. For assessments, always provide an Answer Key/Memo and Rubric.

# CONTENT RULES & CONSTRAINTS
- NEVER generate generic "fluff." Be specific. (e.g., instead of "Teach math," say "Use a 3-act task to introduce equivalent fractions.")
- Use South African English spelling (colour, realise, learner, educator, etc.).
- Use South African contexts, local names, provinces, and Rands (ZAR).
- Adapt language and cognitive demand exactly to CAPS requirements for the specified grade:
  - Grades R–3 (Foundation Phase): Simple words, concrete examples, scaffolded instructions, age-appropriate Lexile-levels.
  - Grades 4–6 (Intermediate Phase): Clear learner-friendly text, basic problem-solving.
  - Grades 7–9 (Senior Phase): Higher-order questions, critical thinking.
  - Grades 10–12 (FET Phase): High academic rigour, exam-style phrasing aligned with past NSC papers.
- For Autograding or rubrics, strictly use a 4-point rubric: (1) Beginning, (2) Developing, (3) Proficient, (4) Distinguished.

# IMAGE PLACEHOLDER RULES
- Where an image enhances learning, insert a placeholder tag exactly like this: [IMAGE:VA1].
- Use 2 to 4 images per piece of content.
- In the "visualAids" array, list each image with its id and a highly detailed English search query for an AI illustrator.`,

      prompt: `Generate a ${input.contentType} for Grade ${input.grade}.
Subject: ${input.subject}
Topic: ${input.topic}
Category: ${input.category}
Term: ${input.term || 'N/A'}
Language: ${input.language || 'English'}
Objective: ${input.objective || 'N/A'}
Learner Profile / Barriers: ${input.learnerProfile || 'General class'}
Length & Duration: ${input.duration || 'Default (30 min / 10 items)'}
Additional Instructions: ${input.additionalInstructions || 'None'}
Teacher Name: ${input.teacherName || 'Educator'}`,
    });

    if (!response.output) {
      throw new Error('AI returned no structured output.');
    }

    const output = response.output;
    let html = output.content || '';
    const visualAids = output.visualAids || [];

    if (visualAids.length > 0) {
      const imageResults = await Promise.all(
        visualAids.map(async (va) => ({
          id: va.id,
          query: va.query,
          url: await generateClassroomPoster(va.query),
        }))
      );

      for (const result of imageResults) {
        const tagRegex = new RegExp(`\\[IMAGE:\\s*${result.id}\\]`, 'gi');
        if (result.url) {
          const imgHtml = `<div class="my-6 text-center">
  <img src="${result.url}" alt="${result.query}" class="rounded-xl shadow-lg mx-auto max-h-[400px]" style="width:auto;height:auto;max-width:100%;" />
  <p class="text-xs text-muted-foreground mt-2 italic">AI Generated Illustration</p>
</div>`;
          html = html.replace(tagRegex, imgHtml);
        } else {
          html = html.replace(tagRegex, '');
        }
      }
    }

    html = html.replace(/\[IMAGE:\s*VA\d+\]/gi, '');

    return {
      content: html,
      memo: output.memo || '',
      rubric: output.rubric || '',
    };
  } catch (error) {
    console.error('generateCAPSContent error:', error);
    throw new Error(
      `Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
