'use server';

/**
 * AI Tutor Flow
 * Original system prompt preserved verbatim.
 * Transport: Genkit removed → direct Anthropic + Groq via /lib/ai.ts
 */

import { generateText } from '@/lib/ai';

export type AiTutorInput = {
  query:    string;
  language: string;
  history?: Array<{ role: 'user' | 'model'; content: string }>;
};

export type AiTutorOutput = {
  response: string;
};

export async function aiTutor(input: AiTutorInput): Promise<AiTutorOutput> {

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  ORIGINAL SYSTEM PROMPT — preserved verbatim from ai-tutor-flow.ts      ║
  // ╚══════════════════════════════════════════════════════════════════════════╝
  const systemPrompt = `You are an expert AI Tutor for South African students and teachers. 
Be helpful, encouraging, and answer questions clearly. 
Always respond in: ${input.language}.`;

  // Convert Firestore 'model' role → 'assistant' for the API
  const history = (input.history ?? []).map(h => ({
    role:    (h.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: h.content,
  }));

  const response = await generateText(input.query, systemPrompt, { history });

  return { response };
}
