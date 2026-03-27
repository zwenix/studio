import { ai } from '@/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as z from 'zod';

/**
 * Memos and Rubrics generation flow.
 *
 * Model (per chat.txt): gemini-3.1-pro
 * Rationale: High accuracy required for CAPS-aligned rubric design and assessment memos.
 */

export const MemoSchema = z.object({
  memos: z.array(
    z.object({
      title: z.string().describe('A short, descriptive title for the memo'),
      body: z.string().describe('The full memo text, formatted as engaging paragraphs'),
      questions: z
        .array(z.string())
        .describe('A list of 3-5 questions to check for understanding and spark discussion'),
    })
  ),
});

export const RubricSchema = z.object({
  rubrics: z.array(
    z.object({
      skill: z.string().describe('The skill being assessed'),
      levels: z.array(
        z.object({
          level: z.string().describe('e.g., "Beginning", "Developing", "Proficient", "Distinguished"'),
          description: z
            .string()
            .describe('A detailed description of what this level of performance looks like'),
        })
      ),
    })
  ),
});

export const generateMemosAndRubricsFlow = ai.defineFlow(
  {
    name: 'generateMemosAndRubrics',
    inputSchema: z.object({
      topic: z.string(),
      grade: z.string(),
    }),
    outputSchema: z.object({
      memos: MemoSchema,
      rubrics: RubricSchema,
    }),
  },
  async (input) => {
    const capsSystemPrompt = `You are a Senior Curriculum Specialist and expert South African CAPS assessment designer.

CRITICAL RULE - CAPS COMPLIANCE:
All memos and rubrics MUST strictly adhere to South African CAPS (Curriculum and Assessment Policy Statement) assessment guidelines, cognitive demand levels, and mark allocation norms for the specified grade.

RULES:
- Use South African English spelling (colour, realise, learner, etc.).
- Use South African contexts: local names, ZAR, SA geography and cultural references.
- Rubric levels MUST follow the 4-point CAPS scale: (1) Beginning, (2) Developing, (3) Proficient, (4) Distinguished.
- Memos must be specific, accurate and immediately usable by a South African teacher.`;

    const memoPrompt = `Generate 3 short, engaging memos about "${input.topic}" for Grade ${input.grade} learners.
For each memo, provide a title, body, and a list of 3-5 CAPS-aligned discussion questions.
Use South African English, local contexts, and ensure CAPS curriculum alignment.`;

    const rubricPrompt = `Create a detailed CAPS-aligned rubric for assessing Grade ${input.grade} learner understanding of "${input.topic}".
Cover 3-5 key skills, each with 4 distinct performance levels: Beginning, Developing, Proficient, Distinguished.
Base mark allocations strictly on CAPS norms for Grade ${input.grade}.`;

    const [memoResponse, rubricResponse] = await Promise.all([
      ai.generate({
        // gemini-3.1-pro: flagship model for accurate CAPS rubric and memo generation (per chat.txt)
        model: googleAI.model('gemini-3.1-pro'),
        system: capsSystemPrompt,
        prompt: memoPrompt,
        output: { schema: MemoSchema },
      }),
      ai.generate({
        model: googleAI.model('gemini-3.1-pro'),
        system: capsSystemPrompt,
        prompt: rubricPrompt,
        output: { schema: RubricSchema },
      }),
    ]);

    const memos = memoResponse.output;
    if (!memos) throw new Error('Failed to generate memos');

    const rubrics = rubricResponse.output;
    if (!rubrics) throw new Error('Failed to generate rubrics');

    return { memos, rubrics };
  }
);
