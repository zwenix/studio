import { ai } from '@/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as z from 'zod';
import { Action } from 'genkit';
import { Flow } from 'genkit/flow';

export const MemoSchema = z.object({
  memos: z.array(
    z.object({
      title: z.string().describe('A short, catchy title for the memo'),
      body: z
        .string()
        .describe('The full memo text, formatted as engaging paragraphs'),
      questions: z
        .array(z.string())
        .describe(
          'A list of 3-5 questions to check for understanding and spark discussion'
        ),
    })
  ),
});

export const RubricSchema = z.object({
  rubrics: z.array(
    z.object({
      skill: z.string().describe('The skill being assessed'),
      levels: z.array(
        z.object({
          level: z.string().describe('e.g., "Beginning", "Developing"'),
          description: z
            .string()
            .describe(
              'A detailed description of what this level of performance looks like'
            ),
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
    const memoPrompt = `Generate 3 short, engaging memos about ${input.topic} for ${input.grade} students. For each memo, provide a title, body, and a list of 3-5 discussion questions.`;
    const rubricPrompt = `Create a detailed rubric for assessing student understanding of ${input.topic} at the ${input.grade} level. The rubric should cover 3-5 key skills, each with distinct performance levels (e.g., Beginning, Developing, Proficient, Exemplary).`;

    const [memoResponse, rubricResponse] = await Promise.all([
      ai.generate({
        model: googleAI.model('gemini-1.5-pro'),
        prompt: memoPrompt,
        output: { schema: MemoSchema },
      }),
      ai.generate({
        model: googleAI.model('gemini-1.5-pro'),
        prompt: rubricPrompt,
        output: { schema: RubricSchema },
      }),
    ]);

    const memos = memoResponse.output();
    if (!memos) {
      throw new Error('Failed to generate memos');
    }

    const rubrics = rubricResponse.output();
    if (!rubrics) {
      throw new Error('Failed to generate rubrics');
    }
    return { memos, rubrics };
  }
);
